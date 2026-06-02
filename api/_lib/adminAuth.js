import { ConnectorError } from '../../connectors/shared/errors.js';
import { findAdminSession, touchAdminSession } from './store.js';
import { parseCookies, SESSION_COOKIE } from './security.js';

/**
 * @param {import('http').IncomingMessage} req
 */
export const requireAdminSession = async (req) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];

  if (!token) {
    throw new ConnectorError('Keine gültige Admin-Session vorhanden.', {
      code: 'AUTH_REQUIRED',
      status: 401,
    });
  }

  const session = await findAdminSession(token);
  if (!session || !session.user || !session.user.isActive) {
    throw new ConnectorError('Admin-Session ungültig.', {
      code: 'AUTH_INVALID',
      status: 401,
    });
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw new ConnectorError('Admin-Session abgelaufen.', {
      code: 'AUTH_EXPIRED',
      status: 401,
    });
  }

  await touchAdminSession(session.id).catch(() => null);

  return {
    token,
    session,
    user: session.user,
  };
};
