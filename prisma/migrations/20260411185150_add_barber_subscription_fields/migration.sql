/*
  Warnings:

  - A unique constraint covering the columns `[revenueCatAppUserId]` on the table `Barber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Barber" ADD COLUMN     "revenueCatAppUserId" TEXT,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionPlan" TEXT,
ADD COLUMN     "subscriptionSource" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN     "subscriptionUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Barber_revenueCatAppUserId_key" ON "Barber"("revenueCatAppUserId");
