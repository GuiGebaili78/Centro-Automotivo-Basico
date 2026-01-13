
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function repairOS17() {
    console.log('>>> REPARANDO OS 17 (PIX R$ 1000)...');

    // 1. Check if already repaired
    const os = await prisma.ordemDeServico.findUnique({
        where: { id_os: 17 },
        include: { pagamentos_cliente: true }
    });

    const pix = os.pagamentos_cliente.find(p => p.metodo_pagamento === 'PIX');
    if (pix && !pix.id_livro_caixa) {
        console.log('   Encontrado PIX sem Livro Caixa. Criando...');

        // Criar Livro Caixa com vínculo bancário (Extrato)
        const lc = await prisma.livroCaixa.create({
            data: {
                descricao: `Venda PIX - OS #17 (Reparo Manual)`,
                valor: 1000,
                tipo_movimentacao: 'ENTRADA',
                categoria: 'VENDA',
                dt_movimentacao: new Date(), // Agora
                origem: 'AUTOMATICA',
                id_conta_bancaria: 1 // Nubank
            }
        });

        // Atualizar Saldo
        await prisma.contaBancaria.update({
            where: { id_conta: 1 },
            data: { saldo_atual: { increment: 1000 } }
        });
        console.log('   ✅ Saldo Nubank atualizado (+1000)');

        // Vincular
        await prisma.pagamentoCliente.update({
            where: { id_pagamento_cliente: pix.id_pagamento_cliente },
            data: { id_livro_caixa: lc.id_livro_caixa }
        });
        console.log('   ✅ Vínculo criado.');
    } else {
        console.log('   ⚠️ PIX da OS 17 já parece estar correto ou não encontrado.');
    }
}

async function repairOS18() {
    console.log('\n>>> REPARANDO OS 18 (PIX R$ 100 + CARTÃO R$ 200)...');

    const os = await prisma.ordemDeServico.findUnique({
        where: { id_os: 18 },
        include: { pagamentos_cliente: true }
    });

    // --- REPARO PIX (100) ---
    const pix = os.pagamentos_cliente.find(p => p.metodo_pagamento === 'PIX');
    if (pix && !pix.id_livro_caixa) {
        console.log('   [PIX] Encontrado sem Livro Caixa. Criando...');
        const lc = await prisma.livroCaixa.create({
            data: {
                descricao: `Venda PIX - OS #18 (Reparo Manual)`,
                valor: 100,
                tipo_movimentacao: 'ENTRADA',
                categoria: 'VENDA',
                dt_movimentacao: new Date(),
                origem: 'AUTOMATICA',
                id_conta_bancaria: 1 // Nubank
            }
        });
        await prisma.contaBancaria.update({
            where: { id_conta: 1 },
            data: { saldo_atual: { increment: 100 } }
        });
        await prisma.pagamentoCliente.update({
            where: { id_pagamento_cliente: pix.id_pagamento_cliente },
            data: { id_livro_caixa: lc.id_livro_caixa }
        });
        console.log('   ✅ [PIX] Reparado.');
    }

    // --- REPARO CARTÃO (200) ---
    const card = os.pagamentos_cliente.find(p => p.metodo_pagamento === 'CREDITO');
    if (card && !card.id_livro_caixa) {
        console.log('   [CARTÃO] Encontrado sem Livro Caixa/Recebíveis. Criando...');

        // 1. Livro Caixa (Faturamento - Sem Banco)
        const lc = await prisma.livroCaixa.create({
            data: {
                descricao: `Venda Cartão CREDITO (Reparo OS #18)`,
                valor: 200,
                tipo_movimentacao: 'ENTRADA',
                categoria: 'VENDA',
                dt_movimentacao: new Date(),
                origem: 'AUTOMATICA',
                id_conta_bancaria: null // NAO AFETA BANCO AINDA
            }
        });

        // 2. Vincular
        await prisma.pagamentoCliente.update({
            where: { id_pagamento_cliente: card.id_pagamento_cliente },
            data: { id_livro_caixa: lc.id_livro_caixa }
        });

        // 3. Criar Recebíveis (Simulando Stone/Taxa Padrão pois id_operadora estava null)
        // Vou buscar a operadora 'Stone' ou a primeira disponivel para vincular
        const operadora = await prisma.operadoraCartao.findFirst();
        if (operadora) {
            const parcelas = 3;
            const valorTotal = 200;
            const valorParc = valorTotal / parcelas;

            // Taxa Padrao (Simulada)
            const taxa = Number(operadora.taxa_credito_parc || 3);
            const taxaAplicada = (valorTotal * taxa) / 100;
            const valorLiqTotal = valorTotal - taxaAplicada;
            const valorLiqParc = valorLiqTotal / parcelas;
            const taxaParc = taxaAplicada / parcelas;

            for (let i = 1; i <= parcelas; i++) {
                const dt = new Date();
                dt.setMonth(dt.getMonth() + i);

                await prisma.recebivelCartao.create({
                    data: {
                        id_os: 18,
                        id_operadora: operadora.id_operadora,
                        num_parcela: i,
                        total_parcelas: parcelas,
                        valor_bruto: valorParc,
                        valor_liquido: valorLiqParc,
                        taxa_aplicada: taxaParc,
                        data_venda: new Date(),
                        data_prevista: dt,
                        status: 'PENDENTE'
                    }
                });
            }
            console.log(`   ✅ [CARTÃO] 3 Recebíveis criados na operadora ${operadora.nome}.`);

            // Vincular operadora ao pagamento para corrigir
            await prisma.pagamentoCliente.update({
                where: { id_pagamento_cliente: card.id_pagamento_cliente },
                data: { id_operadora: operadora.id_operadora }
            });
        }

        console.log('   ✅ [CARTÃO] Reparado.');
    }
}

async function main() {
    await repairOS17();
    await repairOS18();
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
