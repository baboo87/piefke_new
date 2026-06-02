import { AI_ENDPOINT } from '../config';
import type { FormData, ValuationResult } from '../types';

export const generateAiSummary = async ({
  formData,
  result,
}: {
  formData: FormData;
  result: ValuationResult;
}) => {
  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'property-summary',
      formData,
      result,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Der KI-Endpoint hat nicht erfolgreich geantwortet.');
  }

  if (!payload.text) {
    throw new Error('Der KI-Endpoint hat keinen Text zurueckgegeben.');
  }

  return payload.text as string;
};
