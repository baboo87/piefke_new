const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const canonicalStates = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

const stateCodeToCanonical = new Map([
  ['BW', 'Baden-Württemberg'],
  ['BY', 'Bayern'],
  ['BE', 'Berlin'],
  ['BB', 'Brandenburg'],
  ['HB', 'Bremen'],
  ['HH', 'Hamburg'],
  ['HE', 'Hessen'],
  ['MV', 'Mecklenburg-Vorpommern'],
  ['NI', 'Niedersachsen'],
  ['NW', 'Nordrhein-Westfalen'],
  ['RP', 'Rheinland-Pfalz'],
  ['SL', 'Saarland'],
  ['SN', 'Sachsen'],
  ['ST', 'Sachsen-Anhalt'],
  ['SH', 'Schleswig-Holstein'],
  ['TH', 'Thüringen'],
]);

const synonyms = new Map([
  ['baden-wurttemberg', 'Baden-Württemberg'],
  ['baden wurttemberg', 'Baden-Württemberg'],
  ['bw', 'Baden-Württemberg'],
  ['bayern', 'Bayern'],
  ['bavaria', 'Bayern'],
  ['by', 'Bayern'],
  ['berlin', 'Berlin'],
  ['be', 'Berlin'],
  ['brandenburg', 'Brandenburg'],
  ['bb', 'Brandenburg'],
  ['bremen', 'Bremen'],
  ['hb', 'Bremen'],
  ['hamburg', 'Hamburg'],
  ['hh', 'Hamburg'],
  ['hessen', 'Hessen'],
  ['hesse', 'Hessen'],
  ['he', 'Hessen'],
  ['mecklenburg-vorpommern', 'Mecklenburg-Vorpommern'],
  ['mecklenburg vorpommern', 'Mecklenburg-Vorpommern'],
  ['mv', 'Mecklenburg-Vorpommern'],
  ['niedersachsen', 'Niedersachsen'],
  ['lower saxony', 'Niedersachsen'],
  ['ni', 'Niedersachsen'],
  ['nordrhein-westfalen', 'Nordrhein-Westfalen'],
  ['nordrhein westfalen', 'Nordrhein-Westfalen'],
  ['nrw', 'Nordrhein-Westfalen'],
  ['nw', 'Nordrhein-Westfalen'],
  ['rheinland-pfalz', 'Rheinland-Pfalz'],
  ['rheinland pfalz', 'Rheinland-Pfalz'],
  ['rp', 'Rheinland-Pfalz'],
  ['saarland', 'Saarland'],
  ['sl', 'Saarland'],
  ['sachsen', 'Sachsen'],
  ['saxony', 'Sachsen'],
  ['sn', 'Sachsen'],
  ['sachsen-anhalt', 'Sachsen-Anhalt'],
  ['sachsen anhalt', 'Sachsen-Anhalt'],
  ['st', 'Sachsen-Anhalt'],
  ['schleswig-holstein', 'Schleswig-Holstein'],
  ['schleswig holstein', 'Schleswig-Holstein'],
  ['sh', 'Schleswig-Holstein'],
  ['thuringen', 'Thüringen'],
  ['thuringia', 'Thüringen'],
  ['thueringen', 'Thüringen'],
  ['th', 'Thüringen'],
]);

for (const canonical of canonicalStates) {
  synonyms.set(normalize(canonical), canonical);
}

/**
 * @param {string} state
 */
export const toCanonicalState = (state) => {
  const key = normalize(state);
  return synonyms.get(key) || String(state || '');
};

/**
 * @param {string} code
 */
export const toCanonicalStateByCode = (code) => stateCodeToCanonical.get(normalize(code).toUpperCase()) || '';

/**
 * @param {string} state
 */
export const isSupportedState = (state) => canonicalStates.includes(toCanonicalState(state));

export const getSupportedStates = () => [...canonicalStates];
