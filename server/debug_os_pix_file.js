
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function getOSData(osId) {
    const os = await prisma.ordemDeServico.findUnique({
        where: { id_os: osId },
        include: {
            pagamentos_cliente: {
                include: {
                    livro_caixa: true
                }
            }
        }
    });
    return os;
}

async function main() {
    try {
        const os17 = await getOSData(17);
        const os18 = await getOSData(18);

        // Buscar todas as movimentações de conta bancária recentes
        const extrato = await prisma.livroCaixa.findMany({
            where: { id_conta_bancaria: { not: null } },
            orderBy: { dt_movimentacao: 'desc' },
            take: 20
        });

        const report = {
            os17,
            os18,
            extrato_last_20: extrato
        };

        fs.writeFileSync('debug_os_output.json', JSON.stringify(report, null, 2));
        console.log('Report saved to debug_os_output.json');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
