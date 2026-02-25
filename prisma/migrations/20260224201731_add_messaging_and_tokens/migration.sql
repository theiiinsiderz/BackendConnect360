/*
  Warnings:

  - You are about to drop the column `emergencyContactName` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactPhone` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `plateNumber` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleColor` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleMake` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleModel` on the `Tag` table. All the data in the column will be lost.
  - The `status` column on the `Tag` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('CAR', 'KID', 'PET');

-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('MINTED', 'UNCLAIMED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "emergencyContactName",
DROP COLUMN "emergencyContactPhone",
DROP COLUMN "isActive",
DROP COLUMN "plateNumber",
DROP COLUMN "type",
DROP COLUMN "vehicleColor",
DROP COLUMN "vehicleMake",
DROP COLUMN "vehicleModel",
ADD COLUMN     "domainType" "DomainType" NOT NULL DEFAULT 'CAR',
DROP COLUMN "status",
ADD COLUMN     "status" "TagStatus" NOT NULL DEFAULT 'MINTED',
ALTER COLUMN "allowMaskedCall" SET DEFAULT false,
ALTER COLUMN "allowWhatsapp" SET DEFAULT false,
ALTER COLUMN "allowSms" SET DEFAULT false;

-- CreateTable
CREATE TABLE "CarProfile" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "vehicleType" TEXT DEFAULT 'Coupe',
    "plateNumber" TEXT NOT NULL,
    "emergencyContacts" JSONB,
    "allowPoliceDispatch" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CarProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidProfile" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "primaryGuardian" JSONB NOT NULL,
    "medicalAlerts" TEXT,
    "requireLocationShare" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KidProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetProfile" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "petName" TEXT NOT NULL,
    "breedInfo" TEXT,
    "vetContact" JSONB,
    "ownerContact" JSONB NOT NULL,

    CONSTRAINT "PetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "ownerId" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("ownerId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarProfile_tagId_key" ON "CarProfile"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "KidProfile_tagId_key" ON "KidProfile"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PetProfile_tagId_key" ON "PetProfile"("tagId");

-- AddForeignKey
ALTER TABLE "CarProfile" ADD CONSTRAINT "CarProfile_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidProfile" ADD CONSTRAINT "KidProfile_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetProfile" ADD CONSTRAINT "PetProfile_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
