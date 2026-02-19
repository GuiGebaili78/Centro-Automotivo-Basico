import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Looking for inconsistent OSs...");

  const inconsistentOs = await prisma.ordemDeServico.findMany({
    where: {
      status: "FINALIZADA",
      fechamento_financeiro: null,
    },
    select: {
      id_os: true,
      valor_total_cliente: true,
      dt_entrega: true,
      updated_at: true,
    },
  });

  console.log(`Found ${inconsistentOs.length} OSs to fix.`);

  for (const os of inconsistentOs) {
    const dataFechamento = os.dt_entrega || os.updated_at || new Date();

    // Create missing financial closure record
    await prisma.fechamentoFinanceiro.create({
      data: {
        id_os: os.id_os,
        data_fechamento_financeiro: dataFechamento,
        custo_total_pecas_real: 0, // Simplified assumption for fix
        // Other fields will be default or calculated by triggers if present
      },
    });

    console.log(`✅ Fixed OS #${os.id_os} - Created FechamentoFinanceiro`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
