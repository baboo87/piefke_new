export const REGIONAL_DATA: Record<
  string,
  { ort: string; miete: number; faktor: number; trend: string }
> = {
  '31': {
    ort: 'Bad Münder / Hameln-Pyrmont',
    miete: 9.5,
    faktor: 0.94,
    trend: 'Stabil bis leicht steigend',
  },
  '30': {
    ort: 'Hannover',
    miete: 12,
    faktor: 1.05,
    trend: 'Steigend',
  },
  '37': {
    ort: 'Holzminden / Höxter',
    miete: 8.8,
    faktor: 0.91,
    trend: 'Stabil',
  },
  default: {
    ort: 'Ihrer Region',
    miete: 10.5,
    faktor: 1,
    trend: 'Seitwärts',
  },
};

export const NHK_TABELLE: Record<string, number> = {
  'Einfamilienhaus (freistehend)': 1180,
  Doppelhaushaelfte: 1090,
  'Doppelhaushälfte': 1090,
  Reihenhaus: 1040,
  Mehrfamilienhaus: 980,
  Etagenwohnung: 1100,
  Penthouse: 1220,
  Maisonette: 1140,
  Loft: 1200,
  Erdgeschosswohnung: 1080,
};

export const GEWICHTUNG = {
  Haus: { sachwert: 0.8, ertragswert: 0.2 },
  Wohnung: { sachwert: 0.5, ertragswert: 0.5 },
  Mehrfamilienhaus: { sachwert: 0.1, ertragswert: 0.9 },
};
