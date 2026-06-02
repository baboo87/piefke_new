import { ConnectorError } from '../../connectors/shared/errors.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import {
  createToken,
  assertCsrf,
  hashPassword,
  SESSION_COOKIE,
  serializeCookie,
} from '../_lib/security.js';
import {
  createAdminSession,
  ensureDefaultAdminUser,
  findAdminUserByEmail,
  logApiEvent,
} from '../_lib/store.js';
import { validateAdminLoginInput } from '../_lib/validation.js';

const SESSION_TTL_SEC = 60 * 60 * 12;

export default withApiGuard(
  {
    scope: 'api.admin.login',
    methods: ['POST'],
    rateLimit: { limit: 10, windowMs: 60_000 },
  },
  async ({ req, body, requestId, ipAddress, res }) => {
    assertCsrf(req, body);
    await ensureDefaultAdminUser();
    const input = validateAdminLoginInput(body);

    const user = await findAdminUserByEmail(input.email);
    if (!user || !user.isActive || user.passwordHash !== hashPassword(input.password)) {
      await logApiEvent({
        level: 'warn',
        scope: 'auth',
        message: 'login_failed',
        requestId,
        ipAddress,
        metadata: { email: input.email },
      });
      throw new ConnectorError('Ungültige Zugangsdaten.', {
        code: 'AUTH_INVALID',
        status: 401,
      });
    }

    const sessionToken = createToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000);
    await createAdminSession({
      userId: user.id,
      sessionToken,
      expiresAt,
      ipAddress,
      userAgent: String(req.headers['user-agent'] || ''),
    });

    res.setHeader(
      'Set-Cookie',
      serializeCookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: SESSION_TTL_SEC,
      }),
    );

    json(res, 200, {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      expiresAt: expiresAt.toISOString(),
    });
  },
);
