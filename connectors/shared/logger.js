/**
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} details
 */
const write = (level, message, details = {}) => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...details,
  };

  // Keep logs machine-readable for API diagnostics.
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
};

/**
 * @param {string} scope
 * @param {string | undefined} requestId
 */
export const createLogger = (scope, requestId) => ({
  debug: (message, details = {}) => write('debug', message, { scope, requestId, ...details }),
  info: (message, details = {}) => write('info', message, { scope, requestId, ...details }),
  warn: (message, details = {}) => write('warn', message, { scope, requestId, ...details }),
  error: (message, details = {}) => write('error', message, { scope, requestId, ...details }),
});
