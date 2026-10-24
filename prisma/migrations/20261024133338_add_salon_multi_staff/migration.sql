-- AlterTable
ALTER TABLE "Barber" ADD COLUMN "salonId" INTEGER;

-- CreateTable
CREATE TABLE "Salon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "imageUrl" TEXT,
    "bio" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salon_slug_key" ON "Salon"("slug");

-- CreateIndex
CREATE INDEX "Barber_salonId_idx" ON "Barber"("salonId");

-- AddForeignKey
ALTER TABLE "Barber"
ADD CONSTRAINT "Barber_salonId_fkey"
FOREIGN KEY ("salonId")
REFERENCES "Salon"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create one salon for every existing barber.
-- Existing profile data is copied so nothing is lost.
INSERT INTO "Salon" (
    "name",
    "slug",
    "phone",
    "imageUrl",
    "bio",
    "street",
    "postalCode",
    "city",
    "instagram",
    "website",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "name",
    "slug",
    "phone",
    "imageUrl",
    "bio",
    "street",
    "postalCode",
    "city",
    "instagram",
    "website",
    "isActive",
    "createdAt",
    CURRENT_TIMESTAMP
FROM "Barber";

-- Connect every existing barber with its newly created salon.
UPDATE "Barber" AS b
SET "salonId" = s."id"
FROM "Salon" AS s
WHERE s."slug" = b."slug"
  AND b."salonId" IS NULL;