import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const systemCategories = ['FORNECEDOR', 'RECEITA_SERVICO', 'OUTROS', 'EQUIPE'];

  for (const nome of systemCategories) {
    const exists = await prisma.categoriaFinanceira.findUnique({
      where: { nome }
    });

    if (!exists) {
      await prisma.categoriaFinanceira.create({
        data: {
          nome,
          tipo: 'AMBOS'
        }
      });
      console.log(`Categoria criada: ${nome}`);
    } else {
        console.log(`Categoria já existe: ${nome}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
