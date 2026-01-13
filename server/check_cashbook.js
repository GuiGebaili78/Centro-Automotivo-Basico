import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const cashbook = await prisma.$queryRaw`SELECT * FROM livro_caixa`;
    console.log('CASHBOOK ALL:', JSON.stringify(cashbook, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
