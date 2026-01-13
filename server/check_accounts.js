import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const accounts = await prisma.$queryRaw`SELECT id_conta, nome FROM conta_bancaria`;
    console.log('ACCOUNTS:', JSON.stringify(accounts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
