import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const payments = await prisma.$queryRaw`SELECT * FROM pagamento_cliente WHERE id_os = 14`;
    console.log('PAYMENTS OS 14:', JSON.stringify(payments, null, 2));

    const cashbook = await prisma.$queryRaw`SELECT * FROM livro_caixa WHERE descricao LIKE '%OS #14%'`;
    console.log('CASHBOOK OS 14:', JSON.stringify(cashbook, null, 2));

    const accounts = await prisma.$queryRaw`SELECT id_conta, nome, saldo_atual FROM conta_bancaria`;
    console.log('ACCOUNTS:', JSON.stringify(accounts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
