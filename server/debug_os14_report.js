import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
    const os14 = await prisma.ordemDeServico.findUnique({
        where: { id_os: 14 },
        include: {
            pagamentos_cliente: {
                include: {
                    livro_caixa: true
                }
            }
        }
    });

    const lc = await prisma.livroCaixa.findMany({
        where: { descricao: { contains: 'OS #14' } }
    });

    const accounts = await prisma.contaBancaria.findMany();

    const report = {
        os14,
        livro_caixa_all: lc,
        accounts
    };

    fs.writeFileSync('os14_report.json', JSON.stringify(report, null, 2));
    console.log('Report saved to os14_report.json');
}
main().catch(console.error).finally(() => prisma.$disconnect());
