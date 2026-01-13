import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- TESTING PIX LOGIC FOR OS 14 ---');
    const idOs = 14;

    const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch OS and payments
        const os = await tx.ordemDeServico.findUnique({
            where: { id_os: idOs },
            include: {
                pagamentos_cliente: {
                    where: { deleted_at: null }
                }
            }
        });

        if (!os) throw new Error('OS not found');
        console.log(`Processing OS #${idOs} with ${os.pagamentos_cliente.length} payments`);

        for (const pagamento of os.pagamentos_cliente) {
            const metodo = pagamento.metodo_pagamento.toUpperCase();
            console.log(`Payment ID ${pagamento.id_pagamento_cliente}, Method: ${metodo}, Value: ${pagamento.valor}`);

            if (metodo === 'PIX') {
                console.log(`Creating LivroCaixa for PIX. Account: ${pagamento.id_conta_bancaria}`);

                try {
                    const libroCaixa = await tx.livroCaixa.create({
                        data: {
                            descricao: `Venda PIX - OS #${idOs} (TEST)`,
                            valor: pagamento.valor,
                            tipo_movimentacao: 'ENTRADA',
                            categoria: 'VENDA',
                            dt_movimentacao: new Date(),
                            origem: 'AUTOMATICA',
                            id_conta_bancaria: (pagamento as any).id_conta_bancaria
                        }
                    });
                    console.log(`LivroCaixa created: ID ${libroCaixa.id_livro_caixa}`);

                    await tx.pagamentoCliente.update({
                        where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
                        data: { id_livro_caixa: libroCaixa.id_livro_caixa }
                    });
                    console.log(`Payment updated with LC ID`);

                    if (pagamento.id_conta_bancaria) {
                        await tx.contaBancaria.update({
                            where: { id_conta: pagamento.id_conta_bancaria },
                            data: { saldo_atual: { increment: Number(pagamento.valor) } }
                        });
                        console.log(`Account ${pagamento.id_conta_bancaria} balance updated (+ ${pagamento.valor})`);
                    }
                } catch (e) {
                    console.error(`Error in PIX block for ID ${pagamento.id_pagamento_cliente}:`, e);
                    throw e;
                }
            }
        }

        return { success: true };
    });

    console.log('RESULT:', JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
