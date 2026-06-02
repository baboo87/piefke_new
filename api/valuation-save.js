import { withApiGuard } from './_lib/handler.js';
import { json } from './_lib/http.js';
import { saveValuationRecord, upsertPdfRecord } from './_lib/store.js';
import { validateValuationSaveInput } from './_lib/validation.js';

export default withApiGuard(
  {
    scope: 'api.valuation-save',
    methods: ['POST'],
    rateLimit: { limit: 25, windowMs: 60_000 },
  },
  async ({ body, res, logger }) => {
    const input = validateValuationSaveInput(body);
    try {
      const record = await saveValuationRecord(input);
      await upsertPdfRecord(record.id, {
        metadata: {
          generatedAt: new Date().toISOString(),
          mode: input.checkoutMode,
        },
      });

      json(res, 200, {
        saved: true,
        record: {
          id: record.id,
          createdAt: record.createdAt,
        },
      });
      return;
    } catch (error) {
      logger.warn('valuation_save_storage_unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
      json(res, 200, {
        saved: false,
        reason: 'Lokales Datenbank-Backend momentan nicht verfügbar.',
      });
      return;
    }
  },
);
