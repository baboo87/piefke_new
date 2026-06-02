import { ConnectorError } from '../../connectors/shared/errors.js';
import { createLogger } from '../../connectors/shared/logger.js';
import { getClientIp, getRequestId, json, parseBody } from './http.js';
import { hitRateLimit } from './rateLimit.js';
import { logApiEvent } from './store.js';

/**
 * @param {{
 *  scope: string;
 *  methods?: string[];
 *  rateLimit?: { limit: number; windowMs: number };
 * }} config
 * @param {(ctx: {
 *  req: any;
 *  res: any;
 *  body: any;
 *  requestId: string;
 *  ipAddress: string;
 *  logger: ReturnType<typeof createLogger>;
 * }) => Promise<void>} callback
 */
export const withApiGuard = (config, callback) => async (req, res) => {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  const ipAddress = getClientIp(req);
  const scope = config.scope;
  const logger = createLogger(scope, requestId);
  const methods = config.methods || ['POST'];

  if (!methods.includes(req.method || '')) {
    json(res, 405, { error: 'Methode nicht erlaubt.', requestId });
    return;
  }

  if (config.rateLimit) {
    const key = `${scope}:${ipAddress}`;
    const limitInfo = hitRateLimit({
      key,
      limit: config.rateLimit.limit,
      windowMs: config.rateLimit.windowMs,
    });
    if (limitInfo.blocked) {
      json(res, 429, { error: 'Zu viele Anfragen. Bitte später erneut versuchen.', requestId });
      return;
    }
    res.setHeader('X-RateLimit-Remaining', String(limitInfo.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(limitInfo.resetAt / 1000)));
  }

  try {
    const body = await parseBody(req);
    await callback({
      req,
      res,
      body,
      requestId,
      ipAddress,
      logger,
    });

    await logApiEvent({
      level: 'info',
      scope,
      message: 'request_success',
      requestId,
      ipAddress,
      route: req.url || '',
      statusCode: res.statusCode || 200,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const status = error instanceof ConnectorError ? error.status : 500;
    const code = error instanceof ConnectorError ? error.code : 'UNHANDLED_ERROR';
    const message =
      error instanceof ConnectorError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unbekannter Fehler.';

    logger.error('request_failed', {
      code,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    await logApiEvent({
      level: 'error',
      scope,
      message,
      requestId,
      ipAddress,
      route: req.url || '',
      statusCode: status,
      durationMs: Date.now() - startedAt,
      metadata: {
        code,
      },
    });

    json(res, status, {
      error: message,
      code,
      requestId,
    });
  }
};
