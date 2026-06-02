export interface PropertyIntelligenceRequest {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  bundesland?: string;
  wohnflaeche?: number;
  grundstuecksflaeche?: number;
  gebaeudetyp?: string;
}

export interface BodenrichtwertResponse {
  bodenrichtwert: number;
  einheit: string;
  stichtag: string;
  nutzung: string;
  bundesland: string;
  quelle: string;
}

export interface MietniveauResponse {
  kaltmieteProM2: number;
  bandbreiteVon: number;
  bandbreiteBis: number;
  ort: string;
  bundesland: string;
  stand: string;
  quelle: string;
}

export interface PropertyIntelligenceResult {
  address: {
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
    bundesland: string;
    formatted: string;
  };
  geo: {
    lat: number;
    lon: number;
    source: string;
  };
  bodenrichtwert: BodenrichtwertResponse;
  mietniveau: MietniveauResponse;
  fetchedAt: string;
  cached: boolean;
}

export const lookupPropertyIntelligence = async (
  payload: PropertyIntelligenceRequest,
): Promise<PropertyIntelligenceResult> => {
  const response = await fetch('/api/property-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Automatische Bodenrichtwert-Ermittlung fehlgeschlagen.');
  }

  return data as PropertyIntelligenceResult;
};
