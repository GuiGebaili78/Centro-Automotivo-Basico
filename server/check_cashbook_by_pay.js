import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const cashbook = await prisma.$queryRaw`SELECT * FROM livro_caixa WHERE id_pagamento_cliente IN (17, 18)`;
    console.log('CASHBOOK FOR PAYMENTS:', JSON.stringify(cashbook, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
