import { connectorCatalog } from '../connectors/index.js';
import { fetchWithRetry } from '../connectors/shared/httpClient.js';
import { withApiGuard } from './_lib/handler.js';
import { json } from './_lib/http.js';

const checkSource = async (url) => {
  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
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
    scope: 'api.connectors-status',
    methods: ['GET'],
    rateLimit: { limit: 25, windowMs: 60_000 },
  },
  async ({ res }) => {
    const checks = await Promise.all(
      connectorCatalog.map(async (connector) => {
        const health = await checkSource(connector.source);
        return { ...connector, health };
      }),
    );

    json(res, 200, {
      checkedAt: new Date().toISOString(),
      connectors: checks,
    });
  },
);
