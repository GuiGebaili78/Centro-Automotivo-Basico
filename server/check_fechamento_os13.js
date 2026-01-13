import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const fechamentos = await prisma.$queryRaw`SELECT * FROM fechamento_financeiro WHERE id_os = 13`;
    console.log('FECHAMENTOS:', JSON.stringify(fechamentos, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
