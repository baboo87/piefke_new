import type { FormData, ValuationResult } from '../types';
import type { BodenrichtwertResponse, MietniveauResponse } from './propertyIntelligence';

export interface PersistValuationPayload {
  formData: FormData;
  result: ValuationResult;
  checkoutMode: 'simulated' | 'stripe_redirect';
  aiSummary?: string | null;
  brwLookup?: {
    lat?: number;
    lon?: number;
    bodenrichtwert?: BodenrichtwertResponse;
    mietniveau?: MietniveauResponse;
    fetchedAt?: string;
  } | null;
}

export const saveValuationToBackend = async (payload: PersistValuationPayload) => {
  const response = await fetch('/api/valuation-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Speichern der Bewertung im Backend fehlgeschlagen.');
  }
  return data as { saved: boolean; record?: { id: string; createdAt: string } };
};
