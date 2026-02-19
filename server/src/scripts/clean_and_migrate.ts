import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting cleanup and migration...");

  const fakerDescription = "Barulho estranho no motor e luz de óleo acesa.";

  // Find OS IDs first to delete related records
  const osToDelete = await prisma.ordemDeServico.findMany({
    where: { defeito_relatado: fakerDescription },
    select: { id_os: true },
  });

  const ids = osToDelete.map((os) => os.id_os);
  console.log(`🎯 Found ${ids.length} faker OSs to delete.`);

  if (ids.length > 0) {
    // Delete related FechamentoFinanceiro
    await prisma.fechamentoFinanceiro.deleteMany({
      where: { id_os: { in: ids } },
    });
    console.log("🗑️ Deleted related FechamentoFinanceiro records.");

    // Delete related ServicoMaoDeObra
    await prisma.servicoMaoDeObra.deleteMany({
      where: { id_os: { in: ids } },
    });
    console.log("🗑️ Deleted related ServicoMaoDeObra records.");

    // Delete related ItensOs (if any)
    await prisma.itensOs.deleteMany({
      where: { id_os: { in: ids } },
    });
    console.log("🗑️ Deleted related ItensOs records.");

    // Finally delete OSs
    const deletedOs = await prisma.ordemDeServico.deleteMany({
      where: { id_os: { in: ids } },
    });
    console.log(`🗑️ Deleted ${deletedOs.count} faker OSs.`);
  }

  // Migrate Statuses
  const updatedStatus = await prisma.ordemDeServico.updateMany({
    where: { status: "PRONTO PARA FINANCEIRO" },
    data: { status: "FINANCEIRO" },
  });
  console.log(
    `🔄 Migrated ${updatedStatus.count} OSs from 'PRONTO PARA FINANCEIRO' to 'FINANCEIRO'.`,
  );

  const updatedFinalized = await prisma.ordemDeServico.updateMany({
    where: { status: "FINALIZADO" },
    data: { status: "FINALIZADA" },
  });
  console.log(
    `🔄 Migrated ${updatedFinalized.count} OSs from 'FINALIZADO' to 'FINALIZADA'.`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
