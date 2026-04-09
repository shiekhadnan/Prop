-- AlterTable
ALTER TABLE "Client" ADD COLUMN "capabilities" TEXT;
ALTER TABLE "Client" ADD COLUMN "naicsCodes" TEXT;
ALTER TABLE "Client" ADD COLUMN "setAsideTypes" TEXT;

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "solicitationNum" TEXT,
    "department" TEXT,
    "agency" TEXT,
    "office" TEXT,
    "type" TEXT,
    "setAside" TEXT,
    "naicsCode" TEXT,
    "classificationCode" TEXT,
    "description" TEXT,
    "postedDate" DATETIME,
    "responseDeadline" DATETIME,
    "archiveDate" DATETIME,
    "placeOfPerformance" TEXT,
    "pointOfContact" TEXT,
    "resourceLinks" TEXT,
    "estimatedValue" REAL,
    "awardDate" DATETIME,
    "awardee" TEXT,
    "awardAmount" REAL,
    "source" TEXT NOT NULL DEFAULT 'sam.gov',
    "status" TEXT NOT NULL DEFAULT 'active',
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "matchScore" REAL,
    "matchedClientId" TEXT,
    "notes" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_matchedClientId_fkey" FOREIGN KEY ("matchedClientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_externalId_key" ON "Opportunity"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiSetting_key_key" ON "ApiSetting"("key");
