import { resolveBodenrichtwert } from '../connectors/index.js';
import { ConnectorError } from '../connectors/shared/errors.js';
import { geocodeAddress } from '../connectors/shared/geocoder.js';
import { estimateRentLevel } from '../connectors/shared/rentLevel.js';
import { toCanonicalState } from '../connectors/shared/state.js';
import { withApiGuard } from './_lib/handler.js';
import { json } from './_lib/http.js';
import { getPersistentCache, setPersistentCache } from './_lib/store.js';
import { validateAddressLookupInput } from './_lib/validation.js';

const PERSISTENT_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const volatileCache = new Map();

const getVolatileCache = (key) => {
  const record = volatileCache.get(key);
  if (!record) {
    return null;
  }
  if (record.expiresAt < Date.now()) {
    volatileCache.delete(key);
    return null;
  }
  return record.payload;
};

const setVolatileCache = (key, payload, ttlMs) => {
  volatileCache.set(key, {
    payload,
    expiresAt: Date.now() + ttlMs,
  });
};

const parseStichtagYear = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
};

const cacheKey = (input) =>
  `intelligence:v2:${[
    input.strasse,
    input.hausnummer,
    input.plz,
    input.ort,
    input.bundesland || '',
    input.gebaeudetyp || '',
  ]
    .join('|')
    .toLowerCase()}`;

export default withApiGuard(
  {
    scope: 'api.property-intelligence',
    methods: ['POST'],
    rateLimit: {
      limit: 20,
      windowMs: 1000 * 60,
    },
  },
  async ({ body, requestId, logger, res }) => {
    const input = validateAddressLookupInput(body);
    const key = cacheKey(input);
    let cached = getVolatileCache(key);
    try {
      const persisted = await getPersistentCache(key);
      if (persisted) {
        cached = persisted;
        setVolatileCache(key, persisted, PERSISTENT_CACHE_TTL_MS);
      }
    } catch (error) {
      logger.warn('property_intelligence_persistent_cache_unavailable', {
        cacheKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (cached) {
      if (!cached.mietniveau) {
        cached = {
          ...cached,
          mietniveau: estimateRentLevel({
            bundesland: cached?.address?.bundesland || input.bundesland,
            ort: cached?.address?.ort || input.ort,
            gebaeudetyp: input.gebaeudetyp,
            wohnflaeche: input.wohnflaeche,
            bodenrichtwert: cached?.bodenrichtwert?.bodenrichtwert || 0,
          }),
        };
      }
      const cachedYear = parseStichtagYear(cached?.bodenrichtwert?.stichtag);
      const minAcceptedYear = new Date().getFullYear() - 2;
      if (cachedYear && cachedYear < minAcceptedYear) {
        logger.warn('property_intelligence_cache_stale', {
          stichtag: cached?.bodenrichtwert?.stichtag || '',
          cacheKey: key,
        });
      } else {
        json(res, 200, { ...cached, cached: true });
        return;
      }
    }

    if (cached) {
      logger.info('property_intelligence_cache_refresh', { cacheKey: key });
    }

    const geo = await geocodeAddress({
      strasse: input.strasse,
      hausnummer: input.hausnummer,
      plz: input.plz,
      ort: input.ort,
      bundesland: input.bundesland,
      requestId,
    });

    const state = toCanonicalState(geo.bundesland || input.bundesland);
    if (!state) {
      throw new ConnectorError('Bundesland konnte nicht automatisch erkannt werden.', {
        code: 'STATE_NOT_DETECTED',
        status: 422,
      });
    }

    const brw = await resolveBodenrichtwert({
      bundesland: state,
      lat: geo.lat,
      lon: geo.lon,
      requestId,
    });
    const resolvedState = toCanonicalState(brw.bundesland || state);
    const mietniveau = estimateRentLevel({
      bundesland: resolvedState,
      ort: geo.city || input.ort,
      gebaeudetyp: input.gebaeudetyp,
      wohnflaeche: input.wohnflaeche,
      bodenrichtwert: brw.bodenrichtwert,
    });

    const payload = {
      address: {
        strasse: input.strasse,
        hausnummer: input.hausnummer,
        plz: geo.postalCode || input.plz,
        ort: geo.city || input.ort,
        bundesland: resolvedState,
        formatted: geo.formattedAddress,
      },
      geo: {
        lat: geo.lat,
        lon: geo.lon,
        source: geo.source,
      },
      bodenrichtwert: brw,
      mietniveau,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    setVolatileCache(key, payload, PERSISTENT_CACHE_TTL_MS);
    await setPersistentCache(key, payload, PERSISTENT_CACHE_TTL_MS).catch((error) => {
      logger.warn('property_intelligence_persistent_cache_write_failed', {
        cacheKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    logger.info('property_intelligence_success', {
      bundesland: resolvedState,
      bodenrichtwert: brw.bodenrichtwert,
      mietniveau: mietniveau.kaltmieteProM2,
    });

    json(res, 200, payload);
  },
);
