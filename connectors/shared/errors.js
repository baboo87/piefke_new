export class ConnectorError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string; status?: number; retryable?: boolean; cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'ConnectorError';
    this.code = options.code || 'CONNECTOR_ERROR';
    this.status = options.status || 500;
    this.retryable = Boolean(options.retryable);
    this.cause = options.cause;
  }
}
