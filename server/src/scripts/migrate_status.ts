import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration...");

  // 1. Update PRONTO PARA FINANCEIRO -> FINANCEIRO
  const result1 = await prisma.ordemDeServico.updateMany({
    where: {
      status: "PRONTO PARA FINANCEIRO",
    },
    data: {
      status: "FINANCEIRO",
    },
  });
  console.log(
    `Updated ${result1.count} records from 'PRONTO PARA FINANCEIRO' to 'FINANCEIRO'.`,
  );

  // 2. Fix invalid 'OS' status -> 'ABERTA' (Critical fix for the bug)
  const result2 = await prisma.ordemDeServico.updateMany({
    where: {
      status: "OS",
    },
    data: {
      status: "ABERTA",
    },
  });
  console.log(`Updated ${result2.count} records from 'OS' to 'ABERTA'.`);

  console.log("Migration completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
