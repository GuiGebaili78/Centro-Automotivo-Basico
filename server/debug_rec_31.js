import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const rec = await prisma.recebivelCartao.findUnique({
        where: { id_recebivel: 31 },
        include: { operadora: true }
    });
    console.log('RECEBIVEL 31:', JSON.stringify(rec, null, 2));

    const recs_os14 = await prisma.recebivelCartao.findMany({
        where: { id_os: 14 }
    });
    console.log('RECS OS 14:', JSON.stringify(recs_os14, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
