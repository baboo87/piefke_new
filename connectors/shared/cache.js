const memoryCache = new Map();

/**
 * @template T
 * @param {string} key
 * @returns {T | null}
 */
export const getCached = (key) => {
  const hit = memoryCache.get(key);
  if (!hit) {
    return null;
  }

  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return hit.value;
};

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} ttlMs
 */
export const setCached = (key, value, ttlMs) => {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const clearCache = () => {
  memoryCache.clear();
};
