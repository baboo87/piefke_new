import { toCanonicalState } from './state.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const round2 = (value) => Math.round(value * 100) / 100;

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const STATE_BASE_RENT = {
  'Baden-Württemberg': 11.4,
  Bayern: 11.8,
  Berlin: 14.6,
  Brandenburg: 8.9,
  Bremen: 10.1,
  Hamburg: 13.2,
  Hessen: 11.7,
  'Mecklenburg-Vorpommern': 7.9,
  Niedersachsen: 8.8,
  'Nordrhein-Westfalen': 10.2,
  'Rheinland-Pfalz': 9.6,
  Saarland: 8.7,
  Sachsen: 8.2,
  'Sachsen-Anhalt': 7.7,
  'Schleswig-Holstein': 10.1,
  Thüringen: 7.9,
};

const CITY_PREMIUM = new Map(
  Object.entries({
    berlin: 1.1,
    potsdam: 2.2,
    muenchen: 5.6,
    munchen: 5.6,
    hamburg: 1.9,
    frankfurt: 3.2,
    'frankfurt am main': 3.2,
    koeln: 2.0,
    koln: 2.0,
    duesseldorf: 2.2,
    dusseldorf: 2.2,
    stuttgart: 2.7,
    hannover: 1.4,
    nuernberg: 1.4,
    nurnberg: 1.4,
    leipzig: 1.2,
    dresden: 1.0,
    freiburg: 2.3,
    mainz: 1.5,
    bonn: 1.4,
    muenster: 1.3,
    munster: 1.3,
    kiel: 0.9,
    rostock: 0.8,
    erfurt: 0.7,
    magdeburg: 0.6,
    bremen: 0.8,
    mannheim: 1.7,
    karlsruhe: 1.8,
    augsburg: 1.5,
    regensburg: 1.6,
  }),
);

const TYPE_ADJUSTMENT = {
  haus: -0.35,
  wohnung: 0.35,
};

const estimateBrwAdjustment = (bodenrichtwert) => {
  if (!(bodenrichtwert > 0)) {
    return 0;
  }

  const lowRef = Math.log(80);
  const highRef = Math.log(500);
  const normalized = (Math.log(bodenrichtwert) - lowRef) / (highRef - lowRef);
  return clamp(normalized * 3 - 1.2, -1.2, 2.8);
};

const estimateSizeAdjustment = (wohnflaeche) => {
  if (!(wohnflaeche > 0)) {
    return 0;
  }
  if (wohnflaeche <= 45) {
    return 0.35;
  }
  if (wohnflaeche <= 120) {
    return 0;
  }
  return -0.25;
};

/**
 * @param {{
 *  bundesland?: string;
 *  ort?: string;
 *  gebaeudetyp?: string;
 *  wohnflaeche?: number;
 *  bodenrichtwert?: number;
 * }} input
 */
export const estimateRentLevel = (input) => {
  const state = toCanonicalState(input.bundesland || '');
  const cityKey = normalize(input.ort || '');
  const typeKey = normalize(input.gebaeudetyp || '').includes('wohnung') ? 'wohnung' : 'haus';

  const stateBase = STATE_BASE_RENT[state] ?? 9.2;
  const cityPremium = CITY_PREMIUM.get(cityKey) ?? 0;
  const brwAdjustment = estimateBrwAdjustment(input.bodenrichtwert || 0);
  const typeAdjustment = TYPE_ADJUSTMENT[typeKey] ?? 0;
  const sizeAdjustment = estimateSizeAdjustment(input.wohnflaeche || 0);

  const kaltmieteProM2 = round2(clamp(stateBase + cityPremium + brwAdjustment + typeAdjustment + sizeAdjustment, 5.5, 29));
  const bandbreiteVon = round2(clamp(kaltmieteProM2 * 0.9, 4.5, 26));
  const bandbreiteBis = round2(clamp(kaltmieteProM2 * 1.1, 6, 32));

  return {
    kaltmieteProM2,
    bandbreiteVon,
    bandbreiteBis,
    ort: input.ort || '',
    bundesland: state,
    stand: new Date().toISOString().slice(0, 10),
    quelle: 'Automatisches Mietniveau-Modell (Region + Lage + Bodenrichtwert)',
  };
};

