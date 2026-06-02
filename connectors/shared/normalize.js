/**
 * @param {string | number | null | undefined} value
 */
export const toMoneyNumber = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const normalized = String(value).replace(',', '.').trim();
  return Number.parseFloat(normalized) || 0;
};

/**
 * @param {string | null | undefined} value
 */
export const cleanText = (value) => String(value || '').trim();

/**
 * @param {{
 *  bodenrichtwert: number;
 *  stichtag?: string;
 *  nutzung?: string;
 *  bundesland: string;
 *  quelle: string;
 * }} params
 */
export const buildStandardResponse = ({
  bodenrichtwert,
  stichtag = '',
  nutzung = '',
  bundesland,
  quelle,
}) => ({
  bodenrichtwert: Number.isFinite(bodenrichtwert) ? bodenrichtwert : 0,
  einheit: '€/m²',
  stichtag: cleanText(stichtag),
  nutzung: cleanText(nutzung),
  bundesland: cleanText(bundesland),
  quelle: cleanText(quelle),
});
