import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Inspecting 'Teste' data...");

  // Find clients with 'Teste' in the name
  const testClients = await prisma.cliente.findMany({
    where: {
      pessoa_fisica: {
        pessoa: {
          nome: {
            contains: "Teste",
            mode: "insensitive",
          },
        },
      },
    },
    include: {
      pessoa_fisica: {
        include: {
          pessoa: true,
        },
      },
    },
  });

  console.log(`Found ${testClients.length} clients with 'Teste' in name.`);

  for (const client of testClients) {
    const osList = await prisma.ordemDeServico.findMany({
      where: {
        id_cliente: client.id_cliente,
      },
      include: {
        fechamento_financeiro: true,
      },
    });

    console.log(
      `Client ${client.pessoa_fisica?.pessoa.nome} (ID: ${client.id_cliente}) has ${osList.length} OSs.`,
    );

    // Check specific complained state
    const stuckOs = osList.filter(
      (os) => os.status === "FINALIZADA" && !os.fechamento_financeiro,
    );
    console.log(
      `- ${stuckOs.length} are FINALIZADA but missing FechamentoFinanceiro.`,
    );

    if (stuckOs.length > 0) {
      console.log(
        `Sample Stuck OS ID: ${stuckOs[0].id_os}, Description: ${stuckOs[0].defeito_relatado}`,
      );
    }
  }

  // Also check based on previous pattern failure
  const totalStuck = await prisma.ordemDeServico.count({
    where: {
      status: "FINALIZADA",
      fechamento_financeiro: null,
    },
  });
  console.log(
    `\nTotal FINALIZADA OSs without FechamentoFinanceiro in DB: ${totalStuck}`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
