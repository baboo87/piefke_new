import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import { listValuations } from '../_lib/store.js';

const getLimit = (urlString) => {
  try {
    const url = new URL(urlString || '', 'http://localhost');
    const parsed = Number.parseInt(url.searchParams.get('limit') || '40', 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 200) : 40;
  } catch {
    return 40;
  }
};

export default withApiGuard(
  {
    scope: 'api.admin.valuations',
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    await requireAdminSession(req);
    const valuations = await listValuations(getLimit(req.url));
    json(res, 200, { valuations });
  },
);
