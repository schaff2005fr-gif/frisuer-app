import prisma from "../src/prisma.js";

async function main() {
  // 🔴 HIER EMAIL EINTRAGEN
  const BARBER_EMAIL = "barber@test.de"; // <-- anpassen

  console.log("🔎 Suche BARBER User...");

  const user = await prisma.user.findUnique({
    where: { email: BARBER_EMAIL },
  });

  if (!user) {
    throw new Error(`❌ Kein User gefunden mit Email: ${BARBER_EMAIL}`);
  }

  if (user.role !== "BARBER") {
    throw new Error(`❌ User ist kein BARBER: ${BARBER_EMAIL}`);
  }

  console.log("✅ User gefunden:", user.email);

  // Prüfen ob Barber-Profil existiert
  let barber = await prisma.barber.findUnique({
    where: { userId: user.id },
  });

  if (!barber) {
    console.log("🛠 Erstelle Barber Profil...");

    // slug aus email generieren
    const baseSlug = BARBER_EMAIL.split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    let slug = baseSlug || `barber-${user.id}`;
    let counter = 1;

    while (true) {
      const exists = await prisma.barber.findUnique({ where: { slug } });
      if (!exists) break;
      slug = `${baseSlug}-${counter++}`;
    }

    barber = await prisma.barber.create({
      data: {
        userId: user.id,
        name: "Mein Barber",
        phone: null,
        slug,
      },
    });

    console.log("✅ Barber Profil erstellt:", barber.slug);
  } else {
    console.log("✅ Barber Profil existiert bereits:", barber.slug);
  }

  const barberId = barber.id;

  console.log("🔁 Weise bestehende Daten diesem Barber zu...");

  // Services
  const services = await prisma.service.updateMany({
    where: { barberId: null },
    data: { barberId },
  });
  console.log("✔ Services aktualisiert:", services.count);

  // Bookings
  const bookings = await prisma.booking.updateMany({
    where: { barberId: null },
    data: { barberId },
  });
  console.log("✔ Bookings aktualisiert:", bookings.count);

  // TimeBlocks
  const timeBlocks = await prisma.timeBlock.updateMany({
    where: { barberId: null },
    data: { barberId },
  });
  console.log("✔ TimeBlocks aktualisiert:", timeBlocks.count);

  // AppSettings
  const settings = await prisma.appSetting.updateMany({
    where: { barberId: null },
    data: { barberId },
  });
  console.log("✔ AppSettings aktualisiert:", settings.count);

  console.log("🎉 Backfill erfolgreich abgeschlossen!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
