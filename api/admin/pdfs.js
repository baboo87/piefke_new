import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import { listPdfDocuments } from '../_lib/store.js';

const getLimit = (urlString) => {
  try {
    const url = new URL(urlString || '', 'http://localhost');
    const parsed = Number.parseInt(url.searchParams.get('limit') || '50', 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 200) : 50;
  } catch {
    return 50;
  }
};

export default withApiGuard(
  {
    scope: 'api.admin.pdfs',
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    await requireAdminSession(req);
    const pdfs = await listPdfDocuments(getLimit(req.url));
    json(res, 200, { pdfs });
  },
);
