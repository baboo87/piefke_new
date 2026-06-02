import { ConnectorError } from '../../connectors/shared/errors.js';
import { toCanonicalState } from '../../connectors/shared/state.js';

const trim = (value) => String(value || '').trim();

const sanitize = (value) =>
  trim(value)
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u0000-\u001f]/g, '');

/**
 * @param {unknown} value
 * @param {string} field
 */
const requireText = (value, field) => {
  const text = sanitize(value);
  if (!text) {
    throw new ConnectorError(`Feld '${field}' fehlt.`, { code: 'VALIDATION_ERROR', status: 400 });
  }
  return text;
};

/**
 * @param {unknown} value
 */
const toFiniteNumber = (value) => {
  const n = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * @param {unknown} body
 */
export const validateAddressLookupInput = (body) => {
  if (!body || typeof body !== 'object') {
    throw new ConnectorError('Ungültiger Request-Body.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  const obj = /** @type {Record<string, unknown>} */ (body);
  const strasse = requireText(obj.strasse, 'strasse');
  const hausnummer = requireText(obj.hausnummer, 'hausnummer');
  const plz = requireText(obj.plz, 'plz').replace(/\D/g, '').slice(0, 5);
  const ort = requireText(obj.ort, 'ort');
  const bundesland = toCanonicalState(sanitize(obj.bundesland));
  const wohnflaeche = toFiniteNumber(obj.wohnflaeche);
  const grundstuecksflaeche = toFiniteNumber(obj.grundstuecksflaeche);
  const gebaeudetyp = sanitize(obj.gebaeudetyp);

  return {
    strasse,
    hausnummer,
    plz,
    ort,
    bundesland,
    wohnflaeche,
    grundstuecksflaeche,
    gebaeudetyp,
  };
};

/**
 * @param {unknown} body
 */
export const validateAdminLoginInput = (body) => {
  if (!body || typeof body !== 'object') {
    throw new ConnectorError('Ungültiger Login-Body.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  const obj = /** @type {Record<string, unknown>} */ (body);
  return {
    email: requireText(obj.email, 'email').toLowerCase(),
    password: requireText(obj.password, 'password'),
  };
};

/**
 * @param {unknown} body
 */
export const validateValuationSaveInput = (body) => {
  if (!body || typeof body !== 'object') {
    throw new ConnectorError('Ungültiger Request-Body.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  const obj = /** @type {Record<string, any>} */ (body);
  if (!obj.formData || typeof obj.formData !== 'object') {
    throw new ConnectorError('formData fehlt.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  if (!obj.result || typeof obj.result !== 'object') {
    throw new ConnectorError('result fehlt.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  return {
    formData: obj.formData,
    result: obj.result,
    checkoutMode:
      obj.checkoutMode === 'stripe_redirect' ? 'stripe_redirect' : obj.checkoutMode === 'simulated' ? 'simulated' : 'simulated',
    aiSummary: typeof obj.aiSummary === 'string' ? sanitize(obj.aiSummary) : null,
    brwLookup: obj.brwLookup && typeof obj.brwLookup === 'object' ? obj.brwLookup : null,
  };
};

export const sanitizeText = sanitize;
