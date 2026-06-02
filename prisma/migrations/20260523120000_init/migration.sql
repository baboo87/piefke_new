-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "lastSeenAt" DATETIME,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ValuationRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "paket" TEXT,
  "rolle" TEXT,
  "plz" TEXT,
  "city" TEXT,
  "state" TEXT,
  "objectAddress" TEXT,
  "checkoutMode" TEXT NOT NULL,
  "checkoutStatus" TEXT NOT NULL,
  "marketValue" REAL,
  "aiSummary" TEXT,
  "valuationMethod" TEXT,
  "reportVersion" TEXT,
  "propertyCategory" TEXT,
  "propertySubtype" TEXT,
  "livingArea" REAL,
  "lotAreaShare" REAL,
  "landValueRate" REAL,
  "formData" JSONB NOT NULL,
  "resultData" JSONB NOT NULL,
  "brwData" JSONB,
  "metadata" JSONB
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PdfDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "valuationRequestId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "storageType" TEXT NOT NULL DEFAULT 'render-on-demand',
  "title" TEXT,
  "checksum" TEXT,
  "metadata" JSONB,
  CONSTRAINT "PdfDocument_valuationRequestId_fkey" FOREIGN KEY ("valuationRequestId") REFERENCES "ValuationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "requestId" TEXT,
  "ipAddress" TEXT,
  "route" TEXT,
  "statusCode" INTEGER,
  "durationMs" INTEGER,
  "metadata" JSONB
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExternalCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cacheKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "ValuationRequest_createdAt_idx" ON "ValuationRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "ValuationRequest_plz_idx" ON "ValuationRequest"("plz");
CREATE UNIQUE INDEX IF NOT EXISTS "PdfDocument_valuationRequestId_key" ON "PdfDocument"("valuationRequestId");
CREATE INDEX IF NOT EXISTS "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ApiLog_scope_idx" ON "ApiLog"("scope");
CREATE INDEX IF NOT EXISTS "ApiLog_level_idx" ON "ApiLog"("level");
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalCache_cacheKey_key" ON "ExternalCache"("cacheKey");
CREATE INDEX IF NOT EXISTS "ExternalCache_expiresAt_idx" ON "ExternalCache"("expiresAt");
