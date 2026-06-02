import { ConnectorError } from '../shared/errors.js';
import { fetchWithRetry } from '../shared/httpClient.js';
import { createLogger } from '../shared/logger.js';
import { buildStandardResponse, cleanText, toMoneyNumber } from '../shared/normalize.js';
import { toCanonicalStateByCode } from '../shared/state.js';

const BORIS_DE_ARCGIS_BASE =
  process.env.BORIS_DE_ARCGIS_URL ||
  'https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_de_bodenrichtwerte_current/MapServer';
const BORIS_DE_REFERER = process.env.BORIS_DE_REFERER || 'https://www.bodenrichtwerte-boris.de/';
const BORIS_DE_LAYERS_PRIMARY = [0, 1, 2, 3];
const BORIS_DE_LAYERS_SECONDARY = [4, 5, 6];
const BORIS_DE_ENVELOPE_RADII = [0.0015, 0.003, 0.006, 0.012, 0.02];

const pickAttribute = (attrs, keys) => {
  for (const key of keys) {
    const value = attrs?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const formatUsage = (attrs) => {
  const utn = cleanText(pickAttribute(attrs, ['UTN', 'NUTA']));
  if (utn) {
    return utn;
  }

  const anu = cleanText(pickAttribute(attrs, ['ANU']));
  const bzn = cleanText(pickAttribute(attrs, ['BZN']));
  const fallbackParts = [];
  if (anu) {
    fallbackParts.push(`ANU ${anu}`);
  }
  if (bzn) {
    fallbackParts.push(`BZN ${bzn}`);
  }

  return fallbackParts.join(' ').trim();
};

const toBorisHeaders = () => ({
  Accept: 'application/json',
  Referer: BORIS_DE_REFERER,
  'User-Agent':
    process.env.GEOCODING_USER_AGENT || 'piefke-app/1.0 (contact: support@piefke-app.local)',
});

const buildPointQueryUrl = (layer, lat, lon) =>
  `${BORIS_DE_ARCGIS_BASE}/${layer}/query?f=pjson&geometry=${encodeURIComponent(
    `${lon},${lat}`,
  )}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false`;

const buildEnvelopeQueryUrl = (layer, lat, lon, radius) => {
  const envelope = JSON.stringify({
    xmin: lon - radius,
    ymin: lat - radius,
    xmax: lon + radius,
    ymax: lat + radius,
    spatialReference: { wkid: 4326 },
  });

  return `${BORIS_DE_ARCGIS_BASE}/${layer}/query?f=pjson&geometry=${encodeURIComponent(
    envelope,
  )}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false`;
};

const parseBorisFeature = (feature, expectedState) => {
  const attrs = feature?.attributes;
  if (!attrs) {
    return null;
  }

  const bodenrichtwert = toMoneyNumber(pickAttribute(attrs, ['BRW', 'bodenrichtwert', 'BODENRICHTWERT']));
  if (!(bodenrichtwert > 0)) {
    return null;
  }

  const landCode = cleanText(pickAttribute(attrs, ['LAND_KENNUNG', 'LAND']));
  const bundesland = toCanonicalStateByCode(landCode) || expectedState;
  const stichtag = cleanText(pickAttribute(attrs, ['TAG', 'STAG', 'stichtag']));
  const nutzung = formatUsage(attrs);

  return { bodenrichtwert, bundesland, stichtag, nutzung };
};

/**
 * @param {{
 *  lat: number;
 *  lon: number;
 *  requestId?: string;
 *  expectedState: string;
 * }} input
 */
export const queryGermanyBodenrichtwert = async ({ lat, lon, requestId, expectedState }) => {
  const logger = createLogger('connector.germany', requestId);

  const tryLayer = async ({ layer, mode, radius = 0 }) => {
    const url =
      mode === 'point' ? buildPointQueryUrl(layer, lat, lon) : buildEnvelopeQueryUrl(layer, lat, lon, radius);
    const response = await fetchWithRetry(url, {
      timeoutMs: 12000,
      retries: 2,
      retryDelayMs: 500,
      logger,
      headers: toBorisHeaders(),
    });
    const payload = await response.json();
    const features = Array.isArray(payload?.features) ? payload.features : [];

    for (const feature of features) {
      const parsed = parseBorisFeature(feature, expectedState);
      if (parsed) {
        return buildStandardResponse({
          bodenrichtwert: parsed.bodenrichtwert,
          stichtag: parsed.stichtag,
          nutzung: parsed.nutzung,
          bundesland: parsed.bundesland,
          quelle: `${BORIS_DE_ARCGIS_BASE}/${layer}`,
        });
      }
    }

    logger.debug('boris_de_layer_no_match', { layer, mode, radius, found: features.length });
    return null;
  };

  for (const layer of [...BORIS_DE_LAYERS_PRIMARY, ...BORIS_DE_LAYERS_SECONDARY]) {
    const pointHit = await tryLayer({ layer, mode: 'point' });
    if (pointHit) {
      return pointHit;
    }
  }

  for (const radius of BORIS_DE_ENVELOPE_RADII) {
    for (const layer of BORIS_DE_LAYERS_PRIMARY) {
      const hit = await tryLayer({ layer, mode: 'envelope', radius });
      if (hit) {
        return hit;
      }
    }
    for (const layer of BORIS_DE_LAYERS_SECONDARY) {
      const hit = await tryLayer({ layer, mode: 'envelope', radius });
      if (hit) {
        return hit;
      }
    }
  }

  throw new ConnectorError('Kein valider Bodenrichtwert im BORIS-DE Fallback gefunden.', {
    code: 'BORIS_DE_NO_MATCH',
    status: 404,
  });
};
