/**
 * VALUATION ENGINE - KREISEL IMMOBILIEN
 * Basierend auf ImmoWertV (Sachwertverfahren)
 * Stand: 2026
 */

interface ValuationInput {
  wohnflaeche: number;
  grundstueck: number;
  baujahr: number;
  bodenwert: number; // Bodenrichtwert pro m²
  plz: string;
  modernisierungFenster?: string[];
  modernisierungHeizung?: string;
  pvAnlage?: string;
  pvGroesse?: number;
  untertyp?: string;
}

// 1. REGIONALDATEN-MAPPING (PLZ -> Name & Marktanpassung)
const getRegionData = (plz: string) => {
  const regions: Record<string, { name: string; faktor: number }> = {
    '31135': { name: 'Hildesheim', faktor: 1.12 },
    '31134': { name: 'Hildesheim', faktor: 1.15 },
    '31137': { name: 'Hildesheim', faktor: 1.08 },
    '31139': { name: 'Hildesheim', faktor: 1.18 },
    '31141': { name: 'Hildesheim', faktor: 1.14 },
    '30159': { name: 'Hannover', faktor: 1.35 },
    // Fallback für unbekannte PLZ in der Region
    'default': { name: plz || 'Ihre Region', faktor: 1.00 }
  };
  return regions[plz] || regions['default'];
};

export const calculateMarketValue = (data: ValuationInput) => {
  // --- A. BASIS-DATEN ---
  const region = getRegionData(data.plz);
  const aktuellesJahr = 2026;
  const standardNutzungsdauer = 80; // Standard für Ein-/Zweifamilienhäuser

  // --- B. BODENWERT-ERMITTLUNG ---
  // Grundstücksfläche x Bodenrichtwert
  const bodenwertGesamt = Number(data.grundstueck) * Number(data.bodenwert);

  // --- C. GEBÄUDESACHWERT (NHK 2010 Logik) ---
  // 1. Basis-Herstellungskosten (Durchschnittswert für 2010)
  const nhk2010 = 1950; // € pro m² Wohnfläche inkl. Baunebenkosten
  
  // 2. Baupreisindex-Anpassung (Von 2010 auf 2026)
  // Der Index ist von 2010 bis 2026 massiv gestiegen (ca. 82% Steigerung)
  const baupreisIndex2026 = 1.82; 
  
  const herstellungskostenNeu = data.wohnflaeche * nhk2010 * baupreisIndex2026;

  // --- D. ALTERSWERTMINDERUNG (RND-LOGIK) ---
  // Berechnung der Restnutzungsdauer (RND)
  let alter = aktuellesJahr - data.baujahr;
  let theoretischeRND = Math.max(0, standardNutzungsdauer - alter);

  // Modernisierungs-Check (Verlängert die RND fiktiv)
  let modernisierungsPunkte = 0;
  if (data.modernisierungFenster && data.modernisierungFenster.length > 0) modernisierungsPunkte += 5;
  if (data.modernisierungHeizung) modernisierungsPunkte += 7;
  if (data.pvAnlage === 'ja') modernisierungsPunkte += 3;

  // Die effektive RND (ImmoWertV Punktesystem vereinfacht)
  const effektiveRND = Math.min(standardNutzungsdauer, theoretischeRND + modernisierungsPunkte);
  
  // Zeitwert-Faktor (Lineare Wertminderung)
  const zeitwertFaktor = effektiveRND / standardNutzungsdauer;
  const gebaeudeZeitwert = herstellungskostenNeu * zeitwertFaktor;

  // --- E. BESONDERE OBJEKTMERKMALE (PV-ANLAGE) ---
  let pvAnlageWert = 0;
  if (data.pvAnlage === 'ja') {
    const kwp = data.pvGroesse || 8;
    // PV-Anlage Wert inkl. Speicher 2025/2026 ca. 1.800€/kWp installierter Wert
    pvAnlageWert = kwp * 1900; 
  }

  // --- F. VORLÄUFIGER SACHWERT ---
  const vorlaeufigerSachwert = bodenwertGesamt + gebaeudeZeitwert + pvAnlageWert;

  // --- G. MARKTANPASSUNG ---
  // Der Sachwert wird an die regionale Marktlage angepasst (Angebot/Nachfrage)
  const finalerMarktwert = vorlaeufigerSachwert * region.faktor;

  // --- H. RÜCKGABE FÜR DAS PDF ---
  return {
    finalerMarktwert: Math.round(finalerMarktwert / 1000) * 1000, // Gerundet auf volle 1000
    gebaeudesachwert: Math.round(gebaeudeZeitwert),
    bodenwert: Math.round(bodenwertGesamt),
    pvWert: Math.round(pvAnlageWert),
    rnd: effektiveRND,
    ortsName: region.name,
    regionFaktor: region.faktor,
    baupreisIndex: baupreisIndex2026,
    nhkBasis: nhk2010
  };
};
