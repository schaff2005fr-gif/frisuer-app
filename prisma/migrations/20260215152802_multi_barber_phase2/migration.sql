/*
  Warnings:

  - A unique constraint covering the columns `[barberId,key]` on the table `AppSetting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barberId,key]` on the table `Service` will be added. If there are existing duplicate values, this will fail.
  - Made the column `barberId` on table `AppSetting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `barberId` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `barberId` on table `Service` required. This step will fail if there are existing NULL values in that column.
  - Made the column `barberId` on table `TimeBlock` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AppSetting" DROP CONSTRAINT "AppSetting_barberId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_barberId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_barberId_fkey";

-- DropForeignKey
ALTER TABLE "TimeBlock" DROP CONSTRAINT "TimeBlock_barberId_fkey";

-- AlterTable
ALTER TABLE "AppSetting" ALTER COLUMN "barberId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "barberId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "barberId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TimeBlock" ALTER COLUMN "barberId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_barberId_key_key" ON "AppSetting"("barberId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Service_barberId_key_key" ON "Service"("barberId", "key");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
