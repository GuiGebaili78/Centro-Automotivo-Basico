import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.$executeRaw`DELETE FROM conta_bancaria WHERE nome = 'Caixa Geral'`;
    console.log('DELETED:', res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
