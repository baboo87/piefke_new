import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import { listLogs } from '../_lib/store.js';

const getLimit = (urlString) => {
  try {
    const url = new URL(urlString || '', 'http://localhost');
    const parsed = Number.parseInt(url.searchParams.get('limit') || '80', 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 300) : 80;
  } catch {
    return 80;
  }
};

export default withApiGuard(
  {
    scope: 'api.admin.logs',
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    await requireAdminSession(req);
    const logs = await listLogs(getLimit(req.url));
    json(res, 200, { logs });
  },
);
