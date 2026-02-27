-- Replace identity-linked message storage with anonymous drop-token messaging
DROP TABLE IF EXISTS "Message";

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "dropToken" VARCHAR(128) NOT NULL,
    "content" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_dropToken_idx" ON "Message"("dropToken");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt" DESC);
CREATE INDEX "Message_expiresAt_idx" ON "Message"("expiresAt");
CREATE INDEX "Message_dropToken_expiresAt_idx" ON "Message"("dropToken", "expiresAt" DESC);
CREATE INDEX "Message_dropToken_createdAt_idx" ON "Message"("dropToken", "createdAt" DESC);
