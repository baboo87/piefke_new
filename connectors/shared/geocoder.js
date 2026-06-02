import { getCached, setCached } from './cache.js';
import { ConnectorError } from './errors.js';
import { fetchWithRetry } from './httpClient.js';
import { createLogger } from './logger.js';
import { toCanonicalState } from './state.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const GEO_TTL_MS = 1000 * 60 * 60 * 24 * 7;
let lastNominatimCallTs = 0;

const waitForNominatimSlot = async () => {
  const now = Date.now();
  const diff = now - lastNominatimCallTs;
  if (diff < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - diff));
  }
  lastNominatimCallTs = Date.now();
};

const buildAddressText = (payload) =>
  [payload.strasse, payload.hausnummer, payload.plz, payload.ort, payload.bundesland, 'Deutschland']
    .filter(Boolean)
    .join(', ');

/**
 * @param {{
 *   strasse: string;
 *   hausnummer: string;
 *   plz: string;
 *   ort: string;
 *   bundesland?: string;
 *   provider?: 'nominatim' | 'google' | 'here';
 *   requestId?: string;
 * }} payload
 */
export const geocodeAddress = async (payload) => {
  const provider = payload.provider || 'nominatim';
  if (provider !== 'nominatim') {
    throw new ConnectorError(`Geocoder '${provider}' ist vorbereitet, aber nicht konfiguriert.`, {
      code: 'GEOCODER_NOT_CONFIGURED',
      status: 501,
    });
  }

  const logger = createLogger('geocoder.nominatim', payload.requestId);
  const query = buildAddressText(payload);
  const cacheKey = `geo:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    logger.debug('geocode_cache_hit', { query });
    return cached;
  }

  if (!query.trim()) {
    throw new ConnectorError('Adresse unvollständig für Geocoding.', {
      code: 'GEOCODING_INPUT_INVALID',
      status: 400,
    });
  }

  await waitForNominatimSlot();

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'de');
  url.searchParams.set('q', query);

  const userAgent =
    process.env.GEOCODING_USER_AGENT || 'piefke-app/1.0 (contact: support@piefke-app.local)';

  logger.info('geocode_request_start', { query });
  const response = await fetchWithRetry(url.toString(), {
    timeoutMs: 10000,
    retries: 2,
    retryDelayMs: 500,
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent,
    },
    logger,
  });

  /** @type {Array<any>} */
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new ConnectorError('Adresse konnte nicht geokodiert werden.', {
      code: 'GEOCODING_NO_RESULT',
      status: 404,
    });
  }

  const first = data[0];
  const lat = Number.parseFloat(first.lat);
  const lon = Number.parseFloat(first.lon);
  const state = toCanonicalState(first.address?.state || payload.bundesland || '');

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ConnectorError('Ungültige Koordinaten aus Geocoding erhalten.', {
      code: 'GEOCODING_INVALID_COORDS',
      status: 502,
    });
  }

  const result = {
    lat,
    lon,
    bundesland: state,
    formattedAddress: first.display_name || query,
    city: first.address?.city || first.address?.town || first.address?.village || payload.ort || '',
    postalCode: first.address?.postcode || payload.plz || '',
    source: 'OpenStreetMap Nominatim',
  };

  setCached(cacheKey, result, GEO_TTL_MS);
  logger.info('geocode_request_success', { lat, lon, state });
  return result;
};
