import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const os = await prisma.$queryRaw`SELECT id_os, status FROM ordem_de_servico WHERE id_os = 13`;
    console.log('OS:', JSON.stringify(os, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
