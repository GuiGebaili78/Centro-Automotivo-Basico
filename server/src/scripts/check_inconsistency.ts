import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const inconsistentOs = await prisma.ordemDeServico.findMany({
    where: {
      status: "FINALIZADA",
      fechamento_financeiro: null,
    },
    select: {
      id_os: true,
      status: true,
      valor_total_cliente: true,
    },
  });

  console.log(
    `Found ${inconsistentOs.length} inconsistent OSs (FINALIZADA but no FechamentoFinanceiro):`,
  );
  inconsistentOs.forEach((os) => {
    console.log(`- OS #${os.id_os}: ${os.valor_total_cliente}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
