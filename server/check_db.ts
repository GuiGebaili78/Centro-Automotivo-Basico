import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Funcionarios ---');
    const funcionarios = await prisma.funcionario.findMany();
    console.log(JSON.stringify(funcionarios, null, 2));

    console.log('--- ServicoMaoDeObra ---');
    const servicos = await prisma.servicoMaoDeObra.findMany();
    console.log(JSON.stringify(servicos, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
