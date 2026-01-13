import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const payments = await prisma.$queryRaw`SELECT id_pagamento_cliente, metodo_pagamento, valor, id_conta_bancaria, id_operadora FROM pagamento_cliente WHERE id_os = 13`;
    console.log('PAYMENTS:', JSON.stringify(payments, null, 2));

    const receivables = await prisma.$queryRaw`SELECT id_recebivel, valor_bruto, status, data_prevista FROM recebivel_cartao WHERE id_os = 13`;
    console.log('RECEIVABLES:', JSON.stringify(receivables, null, 2));

    const cashbook = await prisma.$queryRaw`SELECT id_livro_caixa, descricao, valor, id_conta_bancaria FROM livro_caixa WHERE descricao LIKE '%OS #13%'`;
    console.log('CASHBOOK:', JSON.stringify(cashbook, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
