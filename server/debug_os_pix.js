
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOSData(osId) {
    console.log(`\n========= ANALISANDO OS #${osId} =========`);

    // 1. Buscar a OS e pagamentos
    const os = await prisma.ordemDeServico.findUnique({
        where: { id_os: osId },
        include: {
            pagamentos_cliente: {
                include: {
                    livro_caixa: true // Ver se tem vínculo
                }
            }
        }
    });

    if (!os) {
        console.log(`❌ OS ${osId} não encontrada.`);
        return;
    }

    console.log(`Status: ${os.status}`);
    console.log(`Valor Final: ${os.valor_final}`);

    if (os.pagamentos_cliente.length === 0) {
        console.log(`⚠️ Nenhum pagamento registrado para esta OS.`);
    } else {
        for (const p of os.pagamentos_cliente) {
            console.log(`\n--- Pagamento ID: ${p.id_pagamento_cliente} ---`);
            console.log(`   Método: ${p.metodo_pagamento}`);
            console.log(`   Valor: ${p.valor}`);
            console.log(`   ID Conta Bancária (Original do Form): ${p.id_conta_bancaria}`);
            console.log(`   ID Livro Caixa (Vínculo): ${p.id_livro_caixa}`);

            if (p.livro_caixa) {
                console.log(`   >>> Dados do Livro Caixa Vinculado:`);
                console.log(`       ID: ${p.livro_caixa.id_livro_caixa}`);
                console.log(`       Descrição: ${p.livro_caixa.descricao}`);
                console.log(`       Valor: ${p.livro_caixa.valor}`);
                console.log(`       ID Conta Bancária (No Livro): ${p.livro_caixa.id_conta_bancaria}  <-- IMPORTANTE`);
                console.log(`       Data: ${p.livro_caixa.dt_movimentacao}`);
            } else {
                console.log(`   ❌ ESTE PAGAMENTO NÃO TEM REGISTRO NO LIVRO CAIXA!`);
            }
        }
    }
}

async function main() {
    await checkOSData(17);
    await checkOSData(18);

    // Listar últimas movimentações da conta Nubank (assumindo id 1, mas vamos listar todas)
    console.log('\n========= ÚLTIMAS 10 MOVIMENTAÇÕES DE CONTA BANCÁRIA (LIVRO CAIXA) =========');
    const movs = await prisma.livroCaixa.findMany({
        where: {
            id_conta_bancaria: { not: null }
        },
        orderBy: { dt_movimentacao: 'desc' },
        take: 10
    });

    movs.forEach(m => {
        console.log(`[${m.dt_movimentacao.toISOString()}] Conta: ${m.id_conta_bancaria} | Valor: ${m.valor} | Desc: ${m.descricao}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
