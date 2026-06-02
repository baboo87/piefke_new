import { buildStandardResponse, cleanText, toMoneyNumber } from '../shared/normalize.js';
import { createLogger } from '../shared/logger.js';
import { fetchWfsFeatureXml } from '../shared/wfs.js';
import { extractFirstTagValue, extractTagBlock } from '../shared/xml.js';

const HESSEN_WFS_ENDPOINT =
  process.env.BORIS_HESSEN_WFS_URL ||
  'https://www.gds.hessen.de/wfs2/boris/cgi-bin/brw/2024/wfs';

/**
 * @param {{ lat: number; lon: number; requestId?: string }} input
 */
export const queryHessenBodenrichtwert = async ({ lat, lon, requestId }) => {
  const logger = createLogger('connector.hessen', requestId);
  const xml = await fetchWfsFeatureXml({
    endpoint: HESSEN_WFS_ENDPOINT,
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
    bundesland: 'Hessen',
    quelle: HESSEN_WFS_ENDPOINT,
  });
};
