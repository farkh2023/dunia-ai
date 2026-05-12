import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.memoryItem.upsert({
    where: { id: "seed-dunia-profile" },
    update: {},
    create: {
      id: "seed-dunia-profile",
      type: "profile",
      title: "Profil Dunia AI",
      content:
        "Dunia AI est configure comme centre de controle personnel pour recherche, productivite, automatisation et generation de contenu.",
      tags: JSON.stringify(["system", "profile"])
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
