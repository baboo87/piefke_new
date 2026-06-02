import { connectorCatalog } from '../../connectors/index.js';
import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';
import { listValuations, loadDashboardSummary } from '../_lib/store.js';

export default withApiGuard(
  {
    scope: 'api.admin.dashboard',
    methods: ['GET'],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    await requireAdminSession(req);
    const [summary, latestValuations] = await Promise.all([
      loadDashboardSummary(),
      listValuations(10),
    ]);

    json(res, 200, {
      summary,
      latestValuations,
      connectors: connectorCatalog,
      generatedAt: new Date().toISOString(),
    });
  },
);
