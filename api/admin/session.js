import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';

export default withApiGuard(
  {
    scope: 'api.admin.session',
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    const auth = await requireAdminSession(req);
    json(res, 200, {
      ok: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        role: auth.user.role,
      },
      expiresAt: auth.session.expiresAt.toISOString(),
    });
  },
);
