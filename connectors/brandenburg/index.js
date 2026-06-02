import { ConnectorError } from '../shared/errors.js';
import { fetchWithRetry } from '../shared/httpClient.js';
import { createLogger } from '../shared/logger.js';
import { buildStandardResponse, cleanText, toMoneyNumber } from '../shared/normalize.js';

const BRANDENBURG_OGC_BASE =
  process.env.BORIS_BRANDENBURG_OGC_API || 'https://ogc-api.geobasis-bb.de/boris';

const radii = [0.0004, 0.001, 0.0025, 0.005];
const residentialUsageFilter =
  "nutzung.art='1100' OR nutzung.art='1200' OR nutzung.art='1300' OR nutzung.art='1400'";

const parseStichtagTimestamp = (value) => {
  const text = cleanText(value);
  if (!text) {
    return 0;
  }
  const timestamp = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const pickBestFeature = (features) => {
  const mapped = features
    .map((feature) => {
      const props = feature?.properties || {};
      return {
        props,
        bodenrichtwert: toMoneyNumber(props.bodenrichtwert),
        stichtagTs: parseStichtagTimestamp(props.stichtag),
      };
    })
    .filter((entry) => entry.bodenrichtwert > 0);

  if (mapped.length === 0) {
    return null;
  }

  mapped.sort((a, b) => {
    if (b.stichtagTs !== a.stichtagTs) {
      return b.stichtagTs - a.stichtagTs;
    }
    return b.bodenrichtwert - a.bodenrichtwert;
  });

  return mapped[0].props;
};

/**
 * @param {{ lat: number; lon: number; requestId?: string }} input
 */
export const queryBrandenburgBodenrichtwert = async ({ lat, lon, requestId }) => {
  const logger = createLogger('connector.brandenburg', requestId);

  for (const radius of radii) {
    const bbox = `${lon - radius},${lat - radius},${lon + radius},${lat + radius}`;
    const baseUrl = `${BRANDENBURG_OGC_BASE}/collections/br_bodenrichtwert/items`;
    const residentialUrl = `${baseUrl}?f=json&bbox=${encodeURIComponent(
      bbox,
    )}&limit=250&filter-lang=cql2-text&filter=${encodeURIComponent(residentialUsageFilter)}`;
    const fallbackUrl = `${baseUrl}?f=json&bbox=${encodeURIComponent(bbox)}&limit=250`;

    const run = async (url) => {
      const response = await fetchWithRetry(url, {
        timeoutMs: 12000,
        retries: 2,
        retryDelayMs: 500,
        logger,
        headers: {
          Accept: 'application/geo+json, application/json',
        },
      });

      const payload = await response.json();
      const features = Array.isArray(payload?.features) ? payload.features : [];
      return pickBestFeature(features);
    };

    const residentialProps = await run(residentialUrl);
    const bestProps = residentialProps || (await run(fallbackUrl));
    if (bestProps) {
      const usageArt = cleanText(bestProps.nutzung?.art);
      const usageErgaenzung = cleanText(bestProps.nutzung?.ergaenzung);
      const nutzung = [usageArt, usageErgaenzung].filter(Boolean).join(' ');

      return buildStandardResponse({
        bodenrichtwert: toMoneyNumber(bestProps.bodenrichtwert),
        stichtag: cleanText(bestProps.stichtag),
        nutzung,
        bundesland: 'Brandenburg',
        quelle: `${BRANDENBURG_OGC_BASE}/collections/br_bodenrichtwert`,
      });
    }

    logger.debug('bb_ogc_empty', { radius });
  }

  throw new ConnectorError('Kein Bodenrichtwert im Suchradius gefunden.', {
    code: 'BB_OGC_NO_MATCH',
    status: 404,
  });
};
