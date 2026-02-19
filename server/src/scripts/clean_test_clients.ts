import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting cleanup of 'Cliente Teste'...");

  // 1. Find the specific "Cliente Teste"
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
    select: {
      id_cliente: true,
      pessoa_fisica: {
        select: {
          id_pessoa_fisica: true,
          id_pessoa: true,
        },
      },
    },
  });

  console.log(`🎯 Found ${testClients.length} clients to remove.`);

  for (const client of testClients) {
    console.log(`Processing Client ID: ${client.id_cliente}`);

    // Find OS IDs
    const osList = await prisma.ordemDeServico.findMany({
      where: { id_cliente: client.id_cliente },
      select: { id_os: true },
    });
    const osIds = osList.map((os) => os.id_os);
    console.log(`- Found ${osIds.length} related OSs.`);

    if (osIds.length > 0) {
      // Delete OS Relations
      await prisma.fechamentoFinanceiro.deleteMany({
        where: { id_os: { in: osIds } },
      });
      await prisma.servicoMaoDeObra.deleteMany({
        where: { id_os: { in: osIds } },
      });

      // Delete PagamentoPeca (Linked to ItensOs)
      // First find items to find payments
      const itensOs = await prisma.itensOs.findMany({
        where: { id_os: { in: osIds } },
        select: { id_iten: true },
      });
      const itemIds = itensOs.map((i) => i.id_iten);
      if (itemIds.length > 0) {
        await prisma.pagamentoPeca.deleteMany({
          where: { id_item_os: { in: itemIds } },
        });
      }

      await prisma.itensOs.deleteMany({ where: { id_os: { in: osIds } } });
      await prisma.pagamentoCliente.deleteMany({
        where: { id_os: { in: osIds } },
      });
      await prisma.recebivelCartao.deleteMany({
        where: { id_os: { in: osIds } },
      });

      // Delete OSs
      await prisma.ordemDeServico.deleteMany({
        where: { id_os: { in: osIds } },
      });
      console.log(`- Deleted OSs.`);
    }

    // Delete Vehicles
    await prisma.veiculo.deleteMany({
      where: { id_cliente: client.id_cliente },
    });
    console.log(`- Deleted Vehicles.`);

    // Delete Client
    await prisma.cliente.delete({ where: { id_cliente: client.id_cliente } });
    console.log(`- Deleted Cliente record.`);

    // Delete Person Hierarchy if exists
    if (client.pessoa_fisica) {
      await prisma.pessoaFisica.delete({
        where: { id_pessoa_fisica: client.pessoa_fisica.id_pessoa_fisica },
      });
      await prisma.pessoa.delete({
        where: { id_pessoa: client.pessoa_fisica.id_pessoa },
      });
      console.log(`- Deleted Pessoa/PessoaFisica records.`);
    }
  }

  console.log("✅ Cleanup complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
