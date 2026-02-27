-- CreateTable
CREATE TABLE "InAppMessage" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InAppMessage_ownerId_createdAt_idx" ON "InAppMessage"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InAppMessage_ownerId_isRead_idx" ON "InAppMessage"("ownerId", "isRead");

-- AddForeignKey
ALTER TABLE "InAppMessage" ADD CONSTRAINT "InAppMessage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
