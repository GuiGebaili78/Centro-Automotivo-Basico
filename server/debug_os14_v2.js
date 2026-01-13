import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const os14 = await prisma.ordemDeServico.findUnique({
        where: { id_os: 14 },
        include: {
            pagamentos_cliente: true
        }
    });
    console.log('OS 14:', JSON.stringify(os14, null, 2));

    const lc = await prisma.livroCaixa.findMany({
        where: { descricao: { contains: 'OS #14' } }
    });
    console.log('LIVRO CAIXA OS 14:', JSON.stringify(lc, null, 2));

    const accounts = await prisma.contaBancaria.findMany();
    console.log('ACCOUNTS:', JSON.stringify(accounts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
