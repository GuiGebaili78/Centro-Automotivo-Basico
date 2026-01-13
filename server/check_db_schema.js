import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const tableInfoPay = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'pagamento_cliente'
  `;
    console.log('COLUMNS pagamento_cliente:', tableInfoPay);

    const tableInfoLC = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'livro_caixa'
  `;
    console.log('COLUMNS livro_caixa:', tableInfoLC);
}
main().catch(console.error).finally(() => prisma.$disconnect());
