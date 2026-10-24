-- AlterTable
ALTER TABLE "Barber"
ADD COLUMN "isSalonOwner" BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing salon-linked barbers as salon owners
UPDATE "Barber"
SET "isSalonOwner" = true
WHERE "salonId" IS NOT NULL;