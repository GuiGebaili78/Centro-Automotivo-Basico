import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const p1 = await prisma.$queryRaw`SELECT id_pagamento_cliente, dt_cadastro FROM pagamento_cliente WHERE id_pagamento_cliente IN (17, 18)`;
    console.log('PAYMENTS TIMES:', JSON.stringify(p1, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
