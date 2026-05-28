import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.pagamentoPeca.findMany({
    where: { item_os: { id_os: 50 } },
    include: {
      item_os: { include: { ordem_de_servico: true } },
      fornecedor: true
    }
  });
  console.log(JSON.stringify(p, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
