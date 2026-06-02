const toRegExpTag = (tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @param {string} xml
 * @param {string} localTag
 */
export const extractFirstTagValue = (xml, localTag) => {
  const escaped = toRegExpTag(localTag);
  const pattern = `<(?:[a-zA-Z0-9_-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${escaped}>`;
  const match = xml.match(new RegExp(pattern, 'i'));
  return match?.[1]?.trim() || '';
};

/**
 * @param {string} xml
 * @param {string} localTag
 */
export const extractTagBlock = (xml, localTag) => {
  const escaped = toRegExpTag(localTag);
  const pattern = `<(?:[a-zA-Z0-9_-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${escaped}>`;
  const match = xml.match(new RegExp(pattern, 'i'));
  return match?.[1] || '';
};

/**
 * @param {string} xml
 */
export const extractNumberReturned = (xml) => {
  const attrMatch = xml.match(/numberReturned="(\d+)"/i);
  if (attrMatch?.[1]) {
    return Number.parseInt(attrMatch[1], 10);
  }
  return 0;
};

/**
 * @param {string} xml
 */
export const hasFeatureMember = (xml) =>
  /<(?:wfs:)?member>/i.test(xml) || /<(?:gml:)?featureMember>/i.test(xml);
