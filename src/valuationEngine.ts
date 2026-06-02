import { GEWICHTUNG, NHK_TABELLE, REGIONAL_DATA } from './calculationData';
import type { FormData, ValuationResult } from './types';

const toNumber = (value: string) => Number.parseFloat(value.replace(',', '.')) || 0;

export const calculateMarketValue = (formData: FormData): ValuationResult => {
  const plzPrefix = formData.plz.slice(0, 2);
  const regional = REGIONAL_DATA[plzPrefix] || REGIONAL_DATA.default;
  const autoMiete = toNumber(formData.miete);
  const mieteProM2 = autoMiete > 0 && formData.mieteQuelle ? autoMiete : regional.miete;

  const flaeche = toNumber(formData.wohnflaeche);
  const grundstuecksAnteil = toNumber(formData.grundstueck || formData.mea);
  const bodenrichtwert = toNumber(formData.bodenwert);
  const alter = new Date().getFullYear() - (Number.parseInt(formData.baujahr, 10) || 1980);
  const liegenschaftszins = 0.0325;

  const jahresrohertrag = flaeche * mieteProM2 * 12;
  const bewirtschaftung = jahresrohertrag * 0.27;
  const bodenwert = grundstuecksAnteil * bodenrichtwert;
  const reinertragBaul = jahresrohertrag - bewirtschaftung - bodenwert * liegenschaftszins;

  let basisRND = Math.max(80 - alter, 15);
  if (formData.modernisierungFenster.length > 0) {
    basisRND += 5;
  }
  if (formData.modernisierungElektrik.length > 0) {
    basisRND += 5;
  }
  if (formData.modernisierungDaemmung.length > 0) {
    basisRND += 8;
  }

  const q = 1 + liegenschaftszins;
  const vervielfaeltiger =
    (Math.pow(q, basisRND) - 1) / (liegenschaftszins * Math.pow(q, basisRND));
  const ertragswert = reinertragBaul * vervielfaeltiger + bodenwert;

  const bgf = flaeche * 1.35;
  const nhkBasis = NHK_TABELLE[formData.untertyp] || 1100;
  const herstellungskostenNeu = bgf * nhkBasis * regional.faktor;
  const alterswertminderung = Math.min(alter / 80, 1) * herstellungskostenNeu;
  const zustandsBonus =
    formData.modernisierungFenster.length * 0.03 +
    formData.modernisierungElektrik.length * 0.02 +
    formData.modernisierungDaemmung.length * 0.05;
  const gebaeudesachwert = Math.max(
    (herstellungskostenNeu - alterswertminderung) * (1 + zustandsBonus),
    0,
  );

  const pvLeistung = toNumber(formData.pvGroesse);
  const pvAlter = formData.pvBaujahr
    ? Math.max(new Date().getFullYear() - (Number.parseInt(formData.pvBaujahr, 10) || 0), 0)
    : 0;
  const pvWert = formData.pvAnlage
    ? Math.max(pvLeistung * 1200 * (1 - pvAlter * 0.04), pvLeistung * 250)
    : 0;

  const sachwert = gebaeudesachwert + bodenwert + pvWert;
  const gewichtKey =
    formData.untertyp === 'Mehrfamilienhaus' ? 'Mehrfamilienhaus' : formData.kategorie;
  const gewichte = GEWICHTUNG[gewichtKey] || GEWICHTUNG.Haus;
  const finalerMarktwert = ertragswert * gewichte.ertragswert + sachwert * gewichte.sachwert;

  return {
    finalerMarktwert,
    ertragswert,
    sachwert,
    rnd: basisRND,
    trend: regional.trend,
    miete: mieteProM2,
    modernisierungsVorteil: gebaeudesachwert * zustandsBonus + pvWert,
    ortsName: regional.ort,
    bodenwert,
    gebaeudesachwert,
    reinertrag: reinertragBaul,
    vV: Number(vervielfaeltiger.toFixed(2)),
    regionFaktor: regional.faktor,
    pvWert,
  };
};
