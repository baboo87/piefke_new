import { buildStandardResponse, cleanText, toMoneyNumber } from '../shared/normalize.js';
import { createLogger } from '../shared/logger.js';
import { fetchWfsFeatureXml } from '../shared/wfs.js';
import { extractFirstTagValue, extractTagBlock } from '../shared/xml.js';

const NIEDERSACHSEN_WFS_ENDPOINT =
  process.env.BORIS_NIEDERSACHSEN_WFS_URL ||
  'https://opendata.lgln.niedersachsen.de/doorman/noauth/boris_2026_wfs';

/**
 * @param {{ lat: number; lon: number; requestId?: string }} input
 */
export const queryNiedersachsenBodenrichtwert = async ({ lat, lon, requestId }) => {
  const logger = createLogger('connector.niedersachsen', requestId);
  const xml = await fetchWfsFeatureXml({
    endpoint: NIEDERSACHSEN_WFS_ENDPOINT,
    typeName: 'boris:BR_BodenrichtwertZonal',
    lat,
    lon,
    axisOrder: 'latlon',
    logger,
  });

  const nutzungBlock = extractTagBlock(xml, 'nutzung');
  const art = cleanText(extractFirstTagValue(nutzungBlock, 'art'));
  const ergaenzung = cleanText(extractFirstTagValue(nutzungBlock, 'ergaenzung'));
  const nutzung = [art, ergaenzung].filter(Boolean).join(' ');

  return buildStandardResponse({
    bodenrichtwert: toMoneyNumber(extractFirstTagValue(xml, 'bodenrichtwert')),
    stichtag: extractFirstTagValue(xml, 'stichtag'),
    nutzung,
    bundesland: 'Niedersachsen',
    quelle: NIEDERSACHSEN_WFS_ENDPOINT,
  });
};
