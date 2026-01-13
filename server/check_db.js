import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const accounts = await prisma.contaBancaria.findMany();
    console.log('ACCOUNTS:', JSON.stringify(accounts, null, 2));
    const os13 = await prisma.ordemDeServico.findUnique({
        where: { id_os: 13 },
        include: { pagamentos_cliente: true }
    });
    console.log('OS13:', JSON.stringify(os13, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
