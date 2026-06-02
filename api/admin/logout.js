import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import { deleteAdminSession } from '../_lib/store.js';
import { assertCsrf, parseCookies, SESSION_COOKIE, serializeCookie } from '../_lib/security.js';

export default withApiGuard(
  {
    scope: 'api.admin.logout',
    methods: ['POST'],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  async ({ req, body, res }) => {
    assertCsrf(req, body);
    const cookies = parseCookies(req);
    if (cookies[SESSION_COOKIE]) {
      await deleteAdminSession(cookies[SESSION_COOKIE]).catch(() => null);
    }

    res.setHeader(
      'Set-Cookie',
      serializeCookie(SESSION_COOKIE, '', {
        path: '/',
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
      }),
    );

    json(res, 200, { ok: true });
  },
);
