import { ConnectorError } from './errors.js';
import { fetchWithRetry } from './httpClient.js';
import { extractNumberReturned, hasFeatureMember } from './xml.js';

const defaultRadii = [0.0004, 0.001, 0.0025, 0.005];

const formatBbox = (lat, lon, radius, axisOrder) => {
  const minLon = lon - radius;
  const minLat = lat - radius;
  const maxLon = lon + radius;
  const maxLat = lat + radius;

  if (axisOrder === 'latlon') {
    return `${minLat},${minLon},${maxLat},${maxLon},EPSG:4326`;
  }
  return `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;
};

/**
 * @param {{
 *  endpoint: string;
 *  typeName: string;
 *  lat: number;
 *  lon: number;
 *  axisOrder?: 'lonlat'|'latlon';
 *  radii?: number[];
 *  logger?: { debug: Function; warn: Function };
 * }} params
 */
export const fetchWfsFeatureXml = async ({
  endpoint,
  typeName,
  lat,
  lon,
  axisOrder = 'lonlat',
  radii = defaultRadii,
  logger,
}) => {
  for (const radius of radii) {
    const url = new URL(endpoint);
    url.searchParams.set('SERVICE', 'WFS');
    url.searchParams.set('VERSION', '2.0.0');
    url.searchParams.set('REQUEST', 'GetFeature');
    url.searchParams.set('TYPENAMES', typeName);
    url.searchParams.set('SRSNAME', 'EPSG:4326');
    url.searchParams.set('BBOX', formatBbox(lat, lon, radius, axisOrder));
    url.searchParams.set('COUNT', '1');

    const response = await fetchWithRetry(url.toString(), {
      timeoutMs: 12000,
      retries: 2,
      retryDelayMs: 500,
      logger,
    });
    const xml = await response.text();
    const count = extractNumberReturned(xml);

    if (count > 0 || hasFeatureMember(xml)) {
      logger?.debug('wfs_feature_match', { typeName, radius });
      return xml;
    }

    logger?.debug('wfs_feature_empty', { typeName, radius });
  }

  throw new ConnectorError('Kein Bodenrichtwert im Suchradius gefunden.', {
    code: 'WFS_NO_MATCH',
    status: 404,
  });
};
