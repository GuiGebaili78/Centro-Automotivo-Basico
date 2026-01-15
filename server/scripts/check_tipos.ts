import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tipos = await prisma.tipo.findMany();
  console.log("Tipos found:", JSON.stringify(tipos, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
