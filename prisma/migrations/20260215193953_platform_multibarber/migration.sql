/*
  Warnings:

  - You are about to drop the column `userId` on the `Barber` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[barberId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Barber" DROP CONSTRAINT "Barber_userId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_customerId_fkey";

-- DropIndex
DROP INDEX "AppSetting_barberId_idx";

-- DropIndex
DROP INDEX "Barber_userId_key";

-- DropIndex
DROP INDEX "Service_barberId_idx";

-- AlterTable
ALTER TABLE "Barber" DROP COLUMN "userId",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "barberId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_barberId_key" ON "User"("barberId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
