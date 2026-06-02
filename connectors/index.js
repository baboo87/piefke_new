import { queryBrandenburgBodenrichtwert } from './brandenburg/index.js';
import { queryGermanyBodenrichtwert } from './germany/index.js';
import { queryHessenBodenrichtwert } from './hessen/index.js';
import { queryNiedersachsenBodenrichtwert } from './niedersachsen/index.js';
import { queryNrwBodenrichtwert } from './nrw/index.js';
import { getCached, setCached } from './shared/cache.js';
import { ConnectorError } from './shared/errors.js';
import { createLogger } from './shared/logger.js';
import { isSupportedState, toCanonicalState } from './shared/state.js';

const BRW_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const byState = {
  Hessen: queryHessenBodenrichtwert,
  Niedersachsen: queryNiedersachsenBodenrichtwert,
  Brandenburg: queryBrandenburgBodenrichtwert,
  'Nordrhein-Westfalen': queryNrwBodenrichtwert,
};

const round = (num) => Math.round(num * 10000) / 10000;

const cacheKey = (state, lat, lon) => `brw:v2:${state}:${round(lat)}:${round(lon)}`;

const parseStichtagTimestamp = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return 0;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const timestamp = Date.parse(`${text}T00:00:00Z`);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text)) {
    const [day, month, year] = text.split('.');
    const timestamp = Date.parse(
      `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`,
    );
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const isVeryOldStichtag = (result) => {
  const timestamp = parseStichtagTimestamp(result?.stichtag);
  if (!timestamp) {
    return true;
  }
  const year = new Date(timestamp).getUTCFullYear();
  return year < new Date().getUTCFullYear() - 2;
};

/**
 * @param {{
 *  bundesland: string;
 *  lat: number;
 *  lon: number;
 *  requestId?: string;
 * }} params
 */
export const resolveBodenrichtwert = async ({ bundesland, lat, lon, requestId }) => {
  const canonical = toCanonicalState(bundesland);
  const logger = createLogger('connector.dispatch', requestId);
  if (!isSupportedState(canonical)) {
    throw new ConnectorError(`Kein Connector für Bundesland '${bundesland}' vorhanden.`, {
      code: 'CONNECTOR_NOT_AVAILABLE',
      status: 400,
    });
  }

  const key = cacheKey(canonical, lat, lon);
  const cached = getCached(key);
  if (cached) {
    logger.debug('brw_cache_hit', { bundesland: canonical });
    return cached;
  }

  const stateConnector = byState[canonical];
  /** @type {any | null} */
  let stateResult = null;
  /** @type {unknown} */
  let stateError = null;

  if (stateConnector) {
    try {
      const result = await stateConnector({ lat, lon, requestId });
      if (!(result?.bodenrichtwert > 0)) {
        throw new ConnectorError('Connector lieferte keinen validen Bodenrichtwert > 0.', {
          code: 'NO_VALID_BRW',
          status: 502,
        });
      }
      stateResult = result;
    } catch (error) {
      stateError = error;
      logger.warn('brw_connector_failed', {
        connector: `state:${canonical}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const shouldTryFallback = !stateResult || isVeryOldStichtag(stateResult);

  /** @type {any | null} */
  let fallbackResult = null;
  /** @type {unknown} */
  let fallbackError = null;

  if (shouldTryFallback) {
    try {
      const result = await queryGermanyBodenrichtwert({
        lat,
        lon,
        requestId,
        expectedState: canonical,
      });
      if (!(result?.bodenrichtwert > 0)) {
        throw new ConnectorError('Fallback lieferte keinen validen Bodenrichtwert > 0.', {
          code: 'NO_VALID_BRW_FALLBACK',
          status: 502,
        });
      }
      fallbackResult = result;
    } catch (error) {
      fallbackError = error;
      logger.warn('brw_connector_failed', {
        connector: 'fallback:boris-de',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let selected = stateResult;

  if (!selected && fallbackResult) {
    selected = fallbackResult;
  } else if (selected && fallbackResult) {
    const stateTs = parseStichtagTimestamp(selected.stichtag);
    const fallbackTs = parseStichtagTimestamp(fallbackResult.stichtag);
    if (fallbackTs > stateTs) {
      selected = fallbackResult;
    }
  }

  if (!selected) {
    const lastError = fallbackError || stateError;
    if (lastError instanceof ConnectorError) {
      throw lastError;
    }
    throw new ConnectorError('Bodenrichtwert konnte nicht ermittelt werden.', {
      code: 'CONNECTOR_RESOLUTION_FAILED',
      status: 502,
      cause: lastError,
    });
  }

  setCached(key, selected, BRW_CACHE_TTL_MS);
  return selected;
};

export const connectorCatalog = [
  { state: 'Brandenburg', type: 'OGC API Features', source: 'https://ogc-api.geobasis-bb.de/boris' },
  {
    state: 'Niedersachsen',
    type: 'WFS 2.0',
    source: 'https://opendata.lgln.niedersachsen.de/doorman/noauth/boris_2026_wfs',
  },
  {
    state: 'Hessen',
    type: 'WFS 2.0',
    source: 'https://www.gds.hessen.de/wfs2/boris/cgi-bin/brw/2024/wfs',
  },
  {
    state: 'Nordrhein-Westfalen',
    type: 'ArcGIS REST',
    source:
      'https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_nw_bodenrichtwerte_current/MapServer',
  },
  {
    state: 'Deutschland (alle 16 Bundesländer)',
    type: 'ArcGIS REST Fallback',
    source:
      'https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_de_bodenrichtwerte_current/MapServer',
  },
];
