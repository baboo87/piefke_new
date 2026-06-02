import { ConnectorError } from './errors.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string} url
 * @param {{
 *  method?: string;
 *  headers?: Record<string, string>;
 *  body?: string;
 *  timeoutMs?: number;
 *  retries?: number;
 *  retryDelayMs?: number;
 *  logger?: { warn: Function; debug: Function };
 * }} options
 */
export const fetchWithRetry = async (url, options = {}) => {
  const {
    method = 'GET',
    headers,
    body,
    timeoutMs = 9000,
    retries = 2,
    retryDelayMs = 350,
    logger,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const err = new ConnectorError(`HTTP ${response.status} fuer ${url}`, {
          code: 'HTTP_ERROR',
          status: response.status,
          retryable: response.status >= 500 || response.status === 429,
          cause: text,
        });

        if (attempt < retries && err.retryable) {
          logger?.warn('connector_http_retry', {
            attempt: attempt + 1,
            status: response.status,
            url,
          });
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        throw err;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutHandle);
      lastError = error;
      const retryable = !(error instanceof ConnectorError) || error.retryable;

      if (attempt < retries && retryable) {
        logger?.warn('connector_network_retry', {
          attempt: attempt + 1,
          url,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      break;
    }
  }

  if (lastError instanceof ConnectorError) {
    throw lastError;
  }

  throw new ConnectorError('Netzwerkfehler beim Connector-Aufruf.', {
    code: 'NETWORK_ERROR',
    status: 502,
    retryable: false,
    cause: lastError,
  });
};
