/*
  Warnings:

  - The primary key for the `AppSetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `updatedAt` on the `AppSetting` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Service_key_key";

-- AlterTable
ALTER TABLE "AppSetting" DROP CONSTRAINT "AppSetting_pkey",
DROP COLUMN "updatedAt",
ADD COLUMN     "barberId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "barberId" INTEGER;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "barberId" INTEGER;

-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN     "barberId" INTEGER;

-- CreateTable
CREATE TABLE "Barber" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Barber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBlock" (
    "id" SERIAL NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "reason" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "barberId" INTEGER NOT NULL,

    CONSTRAINT "RecurringBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Barber_slug_key" ON "Barber"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_userId_key" ON "Barber"("userId");

-- CreateIndex
CREATE INDEX "RecurringBlock_barberId_weekday_idx" ON "RecurringBlock"("barberId", "weekday");

-- CreateIndex
CREATE INDEX "AppSetting_barberId_idx" ON "AppSetting"("barberId");

-- CreateIndex
CREATE INDEX "Booking_barberId_date_idx" ON "Booking"("barberId", "date");

-- CreateIndex
CREATE INDEX "Service_barberId_idx" ON "Service"("barberId");

-- CreateIndex
CREATE INDEX "TimeBlock_barberId_date_idx" ON "TimeBlock"("barberId", "date");

-- AddForeignKey
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBlock" ADD CONSTRAINT "RecurringBlock_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
