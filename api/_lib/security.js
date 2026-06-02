import crypto from 'node:crypto';
import { ConnectorError } from '../../connectors/shared/errors.js';

export const SESSION_COOKIE = 'piefke_admin_session';
export const CSRF_COOKIE = 'piefke_csrf_token';

/**
 * @param {import('http').IncomingMessage} req
 */
export const parseCookies = (req) => {
  const raw = req.headers.cookie || '';
  return raw.split(';').reduce((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) {
      return acc;
    }
    acc[name] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, /** @type {Record<string,string>} */ ({}));
};

/**
 * @param {string} name
 * @param {string} value
 * @param {{
 *  httpOnly?: boolean;
 *  secure?: boolean;
 *  sameSite?: 'Lax'|'Strict'|'None';
 *  path?: string;
 *  maxAge?: number;
 * }} [options]
 */
export const serializeCookie = (name, value, options = {}) => {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path || '/'}`);
  segments.push(`SameSite=${options.sameSite || 'Lax'}`);

  if (typeof options.maxAge === 'number') {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }
  if (options.httpOnly !== false) {
    segments.push('HttpOnly');
  }
  if (options.secure !== false) {
    segments.push('Secure');
  }
  return segments.join('; ');
};

export const createToken = () => crypto.randomBytes(32).toString('hex');

/**
 * @param {string} token
 */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * @param {string} password
 */
export const hashPassword = (password) =>
  crypto.createHash('sha256').update(`piefke:${password}`).digest('hex');

/**
 * @param {import('http').IncomingMessage} req
 * @param {unknown} body
 */
export const assertCsrf = (req, body) => {
  const cookies = parseCookies(req);
  const cookieToken = cookies[CSRF_COOKIE] || '';
  const headerToken = req.headers['x-csrf-token'] || '';
  const bodyToken =
    body && typeof body === 'object' && body !== null && 'csrfToken' in body
      ? String(body.csrfToken || '')
      : '';
  const effective = typeof headerToken === 'string' && headerToken ? headerToken : bodyToken;

  if (!cookieToken || !effective || cookieToken !== effective) {
    throw new ConnectorError('CSRF-Validierung fehlgeschlagen.', {
      code: 'CSRF_INVALID',
      status: 403,
    });
  }
};
