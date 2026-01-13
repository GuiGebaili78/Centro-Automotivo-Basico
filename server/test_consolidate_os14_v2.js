import { PrismaClient } from '@prisma/client';
import { FechamentoFinanceiroRepository } from './src/repositories/fechamentoFinanceiro.repository.js';

const prisma = new PrismaClient();
const repo = new FechamentoFinanceiroRepository();

async function main() {
    console.log('--- TEST CONSOLIDATION OS 14 ---');

    // 1. Reset OS 14 status to testing state
    await prisma.ordemDeServico.update({
        where: { id_os: 14 },
        data: { status: 'PRONTO PARA FINANCEIRO' }
    });

    // 2. Remove any previous fechamento for OS 14 to allow re-consolidation
    await prisma.fechamentoFinanceiro.deleteMany({
        where: { id_os: 14 }
    });

    // 3. Clear LC links from payments
    await prisma.pagamentoCliente.updateMany({
        where: { id_os: 14 },
        data: { id_livro_caixa: null }
    });

    try {
        const result = await repo.consolidarOS(14, 0);
        console.log('CONSOLIDATION SUCCESSFUL:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('CONSOLIDATION FAILED:', err);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
