const buckets = new Map();

/**
 * @param {{
 *  key: string;
 *  limit: number;
 *  windowMs: number;
 }} params
 */
export const hitRateLimit = ({ key, limit, windowMs }) => {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false, remaining: limit - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { blocked: true, remaining: 0, resetAt: bucket.resetAt };
  }

  return { blocked: false, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
};
