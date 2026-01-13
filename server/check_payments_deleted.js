import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const payments = await prisma.$queryRaw`SELECT id_pagamento_cliente, metodo_pagamento, valor, deleted_at FROM pagamento_cliente WHERE id_os = 13`;
    console.log('PAYMENTS WITH DELETED:', JSON.stringify(payments, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
