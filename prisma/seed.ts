import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { resolveSeedAdmin } from "./seed-admin";

const prisma = new PrismaClient();

/**
 * Seed DEMO idempotente (upserts).
 *
 * - No crea clientes/pedidos reales.
 * - Admin solo vía SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME (obligatorios; sin defaults de password).
 * - Re-ejecutar: actualiza CMS DEMO, productos DEMO, servicios DEMO y reglas de disponibilidad
 *   de las ubicaciones seed. No borra Orders/Bookings/CustomerProfile ajenos.
 * - Limitación: sobrescribe valores de keys CMS listadas y stock/descripciones de productos DEMO.
 */
async function main() {
  const { email, password, displayName } = resolveSeedAdmin(process.env);
  const passwordHash = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
      adminProfile: {
        upsert: {
          create: { displayName },
          update: { displayName },
        },
      },
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      adminProfile: {
        create: { displayName },
      },
    },
  });

  const defaults: Array<{ key: string; type: "TEXT" | "RICHTEXT"; value: string }> = [
    { key: "brand.name", type: "TEXT", value: "Ser Brújula" },
    { key: "brand.tagline", type: "TEXT", value: "Orientación, intuición y presencia." },
    { key: "home.hero.title", type: "TEXT", value: "El cuerpo como brújula" },
    {
      key: "home.hero.subtitle",
      type: "TEXT",
      value:
        "Un espacio de autoconocimiento, aceptación, amor propio y conexión con el cuerpo.",
    },
    {
      key: "home.services.intro",
      type: "TEXT",
      value: "Masajes y acompañamientos para volver al cuerpo con presencia.",
    },
    {
      key: "home.about.teaser",
      type: "TEXT",
      value:
        "Un acompañamiento cercano, profesional y conectado con la naturaleza del cuerpo.",
    },
    { key: "about.title", type: "TEXT", value: "Sobre Ser Brújula" },
    {
      key: "about.story",
      type: "RICHTEXT",
      value:
        "Ser Brújula nace del deseo de acompañar procesos de autoconocimiento desde el cuerpo, la intuición y el cuidado.",
    },
    {
      key: "about.philosophy",
      type: "RICHTEXT",
      value:
        "El cuerpo como brújula: escuchar señales, respetar ritmos y orientarnos con honestidad hacia el propio camino.",
    },
    {
      key: "about.professional",
      type: "RICHTEXT",
      value:
        "Formación y experiencia en masajes, movilidad y prácticas de autocuidado, con una mirada sensible y profesional.",
    },
    {
      key: "about.approach",
      type: "RICHTEXT",
      value:
        "Trabajamos con presencia, límites claros y un espacio seguro para explorar el bienestar.",
    },
    {
      key: "services.intro",
      type: "TEXT",
      value:
        "Masajes y sesiones de acompañamiento. En la demo, coordiná por el formulario de contacto.",
    },
    {
      key: "services.office",
      type: "TEXT",
      value: "Atención presencial en un espacio cuidado para escuchar al cuerpo.",
    },
    {
      key: "services.home",
      type: "TEXT",
      value: "Sesiones a domicilio según zona de cobertura y disponibilidad.",
    },
    {
      key: "services.cta",
      type: "TEXT",
      value: "Para coordinar una sesión, escribinos por el formulario de contacto.",
    },
    {
      key: "contact.email",
      type: "TEXT",
      value: process.env.EMAIL_ADMIN_TO ?? "hola@serbrujula.local",
    },
    {
      key: "contact.intro",
      type: "TEXT",
      value: "Escribinos tu consulta. Te respondemos a la brevedad.",
    },
    { key: "shipping.flatCents", type: "TEXT", value: "250000" },
  ];

  for (const item of defaults) {
    await prisma.siteContent.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: item,
    });
  }

  const category = await prisma.productCategory.upsert({
    where: { slug: "autocuidado" },
    update: {},
    create: {
      name: "Autocuidado",
      slug: "autocuidado",
      description: "Productos para el cuidado cotidiano del cuerpo. [DEMO]",
      sortOrder: 1,
    },
  });

  const demoProducts = [
    {
      name: "[DEMO] Aceite de automasaje",
      slug: "aceite-automasaje",
      description:
        "Aceite vegetal para automasajes suaves. Ideal para rituales de presencia corporal.\n\n[DEMO] Producto de demostración — no es una oferta comercial real.",
      priceCents: 890000,
      stock: 25,
      featured: true,
      image:
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "[DEMO] Crema facial natural",
      slug: "crema-facial-natural",
      description:
        "Crema ligera de cuidado diario con ingredientes de origen natural.\n\n[DEMO] Producto de demostración — no es una oferta comercial real.",
      priceCents: 1250000,
      stock: 15,
      featured: true,
      image:
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d451?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "[DEMO] Kit de estiramientos",
      slug: "kit-estiramientos",
      description:
        "Kit introductorio con guía impresa de movilidad y estiramientos conscientes.\n\n[DEMO] Producto de demostración — no es una oferta comercial real.",
      priceCents: 650000,
      stock: 8,
      featured: false,
      image:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
    },
  ];

  for (const p of demoProducts) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        isFeatured: p.featured,
        isActive: true,
        categoryId: category.id,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceCents: p.priceCents,
        isFeatured: p.featured,
        isActive: true,
        categoryId: category.id,
      },
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      create: { productId: product.id, quantity: p.stock, lowStockThreshold: 5 },
      update: { quantity: p.stock },
    });

    const primary = await prisma.productImage.findFirst({
      where: { productId: product.id, isPrimary: true },
    });
    if (primary) {
      await prisma.productImage.update({
        where: { id: primary.id },
        data: { url: p.image },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: p.image,
          isPrimary: true,
          sortOrder: 0,
        },
      });
    }
  }

  const consultorio = await prisma.serviceLocation.upsert({
    where: { id: "seed-loc-consultorio" },
    update: {
      name: "Consultorio [DEMO]",
      type: "CONSULTORIO",
      address: "CABA — dirección de demostración",
      isActive: true,
      travelBufferMinutes: 0,
    },
    create: {
      id: "seed-loc-consultorio",
      name: "Consultorio [DEMO]",
      type: "CONSULTORIO",
      address: "CABA — dirección de demostración",
      isActive: true,
      travelBufferMinutes: 0,
    },
  });

  const domicilio = await prisma.serviceLocation.upsert({
    where: { id: "seed-loc-domicilio" },
    update: {
      name: "Domicilio [DEMO]",
      type: "DOMICILIO",
      coverageNotes: "CABA y alrededores (DEMO)",
      isActive: true,
      travelBufferMinutes: 30,
    },
    create: {
      id: "seed-loc-domicilio",
      name: "Domicilio [DEMO]",
      type: "DOMICILIO",
      coverageNotes: "CABA y alrededores (DEMO)",
      isActive: true,
      travelBufferMinutes: 30,
    },
  });

  const facial = await prisma.service.upsert({
    where: { slug: "masaje-facial" },
    update: {
      name: "[DEMO] Masaje facial",
      description: "Sesión facial de autocuidado. [DEMO]",
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      priceCents: 1800000,
      isActive: true,
    },
    create: {
      name: "[DEMO] Masaje facial",
      slug: "masaje-facial",
      description: "Sesión facial de autocuidado. [DEMO]",
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      priceCents: 1800000,
      isActive: true,
    },
  });

  const corporal = await prisma.service.upsert({
    where: { slug: "masaje-corporal" },
    update: {
      name: "[DEMO] Masaje corporal",
      description: "Sesión corporal completa. [DEMO]",
      durationMinutes: 75,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 20,
      priceCents: 2200000,
      isActive: true,
    },
    create: {
      name: "[DEMO] Masaje corporal",
      slug: "masaje-corporal",
      description: "Sesión corporal completa. [DEMO]",
      durationMinutes: 75,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 20,
      priceCents: 2200000,
      isActive: true,
    },
  });

  for (const [serviceId, locationId] of [
    [facial.id, consultorio.id],
    [facial.id, domicilio.id],
    [corporal.id, consultorio.id],
  ] as const) {
    await prisma.serviceOffering.upsert({
      where: {
        serviceId_locationId: { serviceId, locationId },
      },
      update: { isActive: true },
      create: { serviceId, locationId, isActive: true },
    });
  }

  // Solo reglas de las ubicaciones seed (no toca otras ubicaciones).
  await prisma.availabilityRule.deleteMany({
    where: { locationId: { in: [consultorio.id, domicilio.id] } },
  });
  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    await prisma.availabilityRule.create({
      data: {
        locationId: consultorio.id,
        dayOfWeek,
        startTimeLocal: "10:00",
        endTimeLocal: "18:00",
      },
    });
  }
  for (const dayOfWeek of [2, 4]) {
    await prisma.availabilityRule.create({
      data: {
        locationId: domicilio.id,
        dayOfWeek,
        startTimeLocal: "14:00",
        endTimeLocal: "18:00",
      },
    });
  }

  console.log(`Seed OK — admin: ${user.email}`);
  console.log("Seed OK — productos DEMO creados/actualizados");
  console.log("Seed OK — servicios/ubicaciones/disponibilidad DEMO");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
