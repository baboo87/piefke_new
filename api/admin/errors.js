import { prisma } from '../_lib/prisma.js';
import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';

const getLimit = (urlString) => {
  try {
    const url = new URL(urlString || '', 'http://localhost');
    const parsed = Number.parseInt(url.searchParams.get('limit') || '120', 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 300) : 120;
  } catch {
    return 120;
  }
};

export default withApiGuard(
  {
    scope: 'api.admin.errors',
    methods: ['GET'],
    rateLimit: { limit: 40, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    await requireAdminSession(req);
    const limit = getLimit(req.url);

    const [errors, grouped] = await Promise.all([
      prisma.apiLog.findMany({
        where: { level: 'error' },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.apiLog.groupBy({
        by: ['scope'],
        where: { level: 'error' },
        _count: { _all: true },
        orderBy: {
          _count: {
            scope: 'desc',
          },
        },
      }),
    ]);

    json(res, 200, {
      errors,
      grouped: grouped.map((item) => ({
        scope: item.scope,
        count: item._count._all,
      })),
    });
  },
);
