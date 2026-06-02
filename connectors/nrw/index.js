import { ConnectorError } from '../shared/errors.js';
import { fetchWithRetry } from '../shared/httpClient.js';
import { createLogger } from '../shared/logger.js';
import { buildStandardResponse, cleanText, toMoneyNumber } from '../shared/normalize.js';

const NRW_ARCGIS_BASE =
  process.env.BORIS_NRW_ARCGIS_URL ||
  'https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_nw_bodenrichtwerte_current/MapServer';

const candidateLayers = [2, 5, 8, 11, 14, 17, 20];

/**
 * @param {{ lat: number; lon: number; requestId?: string }} input
 */
export const queryNrwBodenrichtwert = async ({ lat, lon, requestId }) => {
  const logger = createLogger('connector.nrw', requestId);

  for (const layer of candidateLayers) {
    const url = `${NRW_ARCGIS_BASE}/${layer}/query?f=pjson&geometry=${encodeURIComponent(
      `${lon},${lat}`,
    )}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false`;

    const response = await fetchWithRetry(url, {
      timeoutMs: 12000,
      retries: 2,
      retryDelayMs: 450,
      logger,
      headers: {
        Accept: 'application/json',
      },
    });

    const payload = await response.json();
    const feature = payload?.features?.[0];
    if (!feature?.attributes) {
      logger.debug('nrw_layer_empty', { layer });
      continue;
    }

    const a = feature.attributes;
    const usage = [cleanText(a.NUTA), cleanText(a.FREI), cleanText(a.ERGNUTA)].filter(Boolean).join(' ');

    return buildStandardResponse({
      bodenrichtwert: toMoneyNumber(a.BRW),
      stichtag: cleanText(a.STAG),
      nutzung: usage,
      bundesland: 'Nordrhein-Westfalen',
      quelle: `${NRW_ARCGIS_BASE}/${layer}`,
    });
  }

  throw new ConnectorError('Kein passender Bodenrichtwert in NRW gefunden.', {
    code: 'NRW_NO_MATCH',
    status: 404,
  });
};
