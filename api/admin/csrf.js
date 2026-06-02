import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import { createToken, CSRF_COOKIE, serializeCookie } from '../_lib/security.js';

export default withApiGuard(
  {
    scope: 'api.admin.csrf',
    methods: ['GET'],
    rateLimit: { limit: 50, windowMs: 60_000 },
  },
  async ({ res }) => {
    const token = createToken();
    res.setHeader(
      'Set-Cookie',
      serializeCookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 2,
      }),
    );
    json(res, 200, { csrfToken: token });
  },
);
