-- CreateTable
CREATE TABLE "FavoriteBarber" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "barberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteBarber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteBarber_customerId_idx" ON "FavoriteBarber"("customerId");

-- CreateIndex
CREATE INDEX "FavoriteBarber_barberId_idx" ON "FavoriteBarber"("barberId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteBarber_customerId_barberId_key" ON "FavoriteBarber"("customerId", "barberId");

-- AddForeignKey
ALTER TABLE "FavoriteBarber" ADD CONSTRAINT "FavoriteBarber_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteBarber" ADD CONSTRAINT "FavoriteBarber_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
