-- Performance indexes for high-volume read paths
CREATE INDEX IF NOT EXISTS "Company_createdAt_idx"
ON "Company"("createdAt");

CREATE INDEX IF NOT EXISTS "Tag_status_createdAt_idx"
ON "Tag"("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Tag_companyId_status_createdAt_idx"
ON "Tag"("companyId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Tag_domainType_status_createdAt_idx"
ON "Tag"("domainType", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Tag_userId_createdAt_idx"
ON "Tag"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Product_isActive_idx"
ON "Product"("isActive");

CREATE INDEX IF NOT EXISTS "Message_ownerId_createdAt_idx"
ON "Message"("ownerId", "createdAt" DESC);
