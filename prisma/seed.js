import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.service.upsert({
    where: { key: "HAIRCUT" },
    update: { name: "Haarschnitt", durationMin: 20, isActive: true },
    create: { key: "HAIRCUT", name: "Haarschnitt", durationMin: 20, isActive: true },
  });

  await prisma.service.upsert({
    where: { key: "HAIRCUT_BEARD" },
    update: { name: "Haare + Bart", durationMin: 30, isActive: true },
    create: { key: "HAIRCUT_BEARD", name: "Haare + Bart", durationMin: 30, isActive: true },
  });

  console.log("✅ Seeded services");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
