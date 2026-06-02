import { prisma } from './prisma.js';
import { hashPassword, hashToken } from './security.js';

/**
 * @param {{
 *  level: string;
 *  scope: string;
 *  message: string;
 *  requestId?: string;
 *  ipAddress?: string;
 *  route?: string;
 *  statusCode?: number;
 *  durationMs?: number;
 *  metadata?: unknown;
 * }} entry
 */
export const logApiEvent = async (entry) => {
  await prisma.apiLog
    .create({
      data: {
        level: entry.level,
        scope: entry.scope,
        message: entry.message,
        requestId: entry.requestId || null,
        ipAddress: entry.ipAddress || null,
        route: entry.route || null,
        statusCode: entry.statusCode || null,
        durationMs: entry.durationMs || null,
        metadata: entry.metadata || {},
      },
    })
    .catch(() => null);
};

/**
 * @param {string} cacheKey
 */
export const getPersistentCache = async (cacheKey) => {
  const record = await prisma.externalCache.findUnique({
    where: { cacheKey },
  });

  if (!record) {
    return null;
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.externalCache.delete({ where: { cacheKey } }).catch(() => null);
    return null;
  }

  return record.payload;
};

/**
 * @param {string} cacheKey
 * @param {unknown} payload
 * @param {number} ttlMs
 */
export const setPersistentCache = async (cacheKey, payload, ttlMs) => {
  await prisma.externalCache.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      payload,
      expiresAt: new Date(Date.now() + ttlMs),
    },
    update: {
      payload,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
};

/**
 * @param {{
 *  formData: Record<string, any>;
 *  result: Record<string, any>;
 *  checkoutMode: string;
 *  aiSummary?: string | null;
 *  brwLookup?: Record<string, any> | null;
 * }} input
 */
export const saveValuationRecord = async ({ formData, result, checkoutMode, aiSummary, brwLookup }) => {
  const objectAddress = [formData.strasse, formData.hausnummer].filter(Boolean).join(' ').trim();
  const liv = Number.parseFloat(String(formData.wohnflaeche || '').replace(',', '.')) || null;
  const lot = Number.parseFloat(String(formData.grundstueck || formData.mea || '').replace(',', '.')) || null;
  const brw = Number.parseFloat(String(formData.bodenwert || '').replace(',', '.')) || null;

  return prisma.valuationRequest.create({
    data: {
      paket: formData.paket || null,
      rolle: formData.rolle || null,
      plz: formData.plz || null,
      city: formData.stadt || null,
      state: formData.bundesland || null,
      objectAddress: objectAddress || null,
      checkoutMode,
      checkoutStatus: 'success_return',
      marketValue: Number.isFinite(result.finalerMarktwert) ? Number(result.finalerMarktwert) : null,
      aiSummary: aiSummary || null,
      valuationMethod: 'ertragswert',
      reportVersion: 'reference_v2',
      propertyCategory: formData.kategorie || null,
      propertySubtype: formData.untertyp || null,
      livingArea: liv,
      lotAreaShare: lot,
      landValueRate: brw,
      formData,
      resultData: result,
      brwData: brwLookup || null,
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'web-app',
      },
    },
  });
};

/**
 * @param {string} valuationRequestId
 * @param {{ checksum?: string; title?: string; metadata?: unknown }} [payload]
 */
export const upsertPdfRecord = async (valuationRequestId, payload = {}) =>
  prisma.pdfDocument.upsert({
    where: { valuationRequestId },
    create: {
      valuationRequestId,
      checksum: payload.checksum || null,
      title: payload.title || 'Immobilien-Kurzbewertung',
      metadata: payload.metadata || {},
    },
    update: {
      checksum: payload.checksum || null,
      title: payload.title || 'Immobilien-Kurzbewertung',
      metadata: payload.metadata || {},
    },
  });

export const ensureDefaultAdminUser = async () => {
  const email = (process.env.ADMIN_EMAIL || 'admin@piefke.local').toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || hashPassword(process.env.ADMIN_PASSWORD || 'ChangeMe123!');

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  return prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
};

/**
 * @param {string} email
 */
export const findAdminUserByEmail = async (email) =>
  prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  });

/**
 * @param {{ userId: string; sessionToken: string; expiresAt: Date; ipAddress?: string; userAgent?: string }} params
 */
export const createAdminSession = async ({ userId, sessionToken, expiresAt, ipAddress, userAgent }) =>
  prisma.adminSession.create({
    data: {
      userId,
      tokenHash: hashToken(sessionToken),
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

/**
 * @param {string} token
 */
export const findAdminSession = async (token) =>
  prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

/**
 * @param {string} token
 */
export const deleteAdminSession = async (token) =>
  prisma.adminSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });

/**
 * @param {string} sessionId
 */
export const touchAdminSession = async (sessionId) =>
  prisma.adminSession.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date() },
  });

export const loadDashboardSummary = async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [total, today, week, logsErrors] = await Promise.all([
    prisma.valuationRequest.count(),
    prisma.valuationRequest.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.valuationRequest.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.apiLog.count({ where: { level: 'error', createdAt: { gte: startOfWeek } } }),
  ]);

  return { total, today, week, logsErrors };
};

/**
 * @param {number} take
 */
export const listValuations = async (take = 40) =>
  prisma.valuationRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      createdAt: true,
      objectAddress: true,
      plz: true,
      city: true,
      state: true,
      paket: true,
      marketValue: true,
      checkoutMode: true,
      checkoutStatus: true,
      brwData: true,
    },
  });

/**
 * @param {number} take
 */
export const listLogs = async (take = 80) =>
  prisma.apiLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });

/**
 * @param {number} take
 */
export const listPdfDocuments = async (take = 50) =>
  prisma.pdfDocument.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      valuationRequest: {
        select: {
          objectAddress: true,
          city: true,
          state: true,
          createdAt: true,
        },
      },
    },
  });
