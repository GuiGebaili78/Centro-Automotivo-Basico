import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lc = await prisma.livroCaixa.findMany({
        where: {
            dt_movimentacao: {
                gte: today
            }
        },
        orderBy: {
            dt_movimentacao: 'desc'
        }
    });

    console.log('LIVRO CAIXA HOJE:', JSON.stringify(lc, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
