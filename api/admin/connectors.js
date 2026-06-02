import { connectorCatalog } from '../../connectors/index.js';
import { fetchWithRetry } from '../../connectors/shared/httpClient.js';
import { requireAdminSession } from '../_lib/adminAuth.js';
import { withApiGuard } from '../_lib/handler.js';
import { json } from '../_lib/http.js';

const checkSource = async (url) => {
  try {
    const response = await fetchWithRetry(url, {
      timeoutMs: 5000,
      retries: 0,
    });
    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
};

export default withApiGuard(
  {
    scope: 'api.admin.connectors',
    methods: ['GET'],
    rateLimit: { limit: 40, windowMs: 60_000 },
  },
  async ({ req, res }) => {
    await requireAdminSession(req);
    const connectors = await Promise.all(
      connectorCatalog.map(async (connector) => ({
        ...connector,
        health: await checkSource(connector.source),
      })),
    );
    json(res, 200, {
      connectors,
      checkedAt: new Date().toISOString(),
    });
  },
);
