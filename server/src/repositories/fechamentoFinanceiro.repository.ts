import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class FechamentoFinanceiroRepository {
  async create(data: Prisma.FechamentoFinanceiroCreateInput) {
    return await prisma.fechamentoFinanceiro.create({
      data,
    });
  }

  async findAll() {
    return await prisma.fechamentoFinanceiro.findMany({
        include: { 
            ordem_de_servico: {
                include: { 
                    veiculo: true,
                    servicos_mao_de_obra: {
                        where: { deleted_at: null },
                        include: {
                            funcionario: {
                                include: {
                                    pessoa_fisica: {
                                        include: {
                                            pessoa: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } 
        }
    });
  }

  async findById(id: number) {
    return await prisma.fechamentoFinanceiro.findUnique({
      where: { id_fechamento_financeiro: id },
        include: { ordem_de_servico: true }
    });
  }

  async update(id: number, data: Prisma.FechamentoFinanceiroUpdateInput) {
    return await prisma.fechamentoFinanceiro.update({
      where: { id_fechamento_financeiro: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.fechamentoFinanceiro.delete({
      where: { id_fechamento_financeiro: id },
    });
  }

  /**
   * Consolida uma OS financeiramente
   * - Cria lançamentos no Livro Caixa para TODOS os pagamentos
   * - PIX: Atualiza saldo bancário imediatamente
   * - Dinheiro: Apenas lançamento no caixa
   * - Débito/Crédito: Lançamento no caixa + cria recebível (NÃO atualiza saldo ainda)
   */
  async consolidarOS(idOs: number, custoTotalPecasReal: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar OS com todos os pagamentos
      const os = await tx.ordemDeServico.findUnique({
        where: { id_os: idOs },
        include: {
          pagamentos_cliente: {
            where: { deleted_at: null }
          }
        }
      });

      if (!os) {
        throw new Error('OS não encontrada');
      }

      if (os.status !== 'PRONTO PARA FINANCEIRO') {
        throw new Error('OS não está pronta para consolidação financeira');
      }

      // 2. Criar Fechamento Financeiro
      const fechamento = await tx.fechamentoFinanceiro.create({
        data: {
          id_os: idOs,
          custo_total_pecas_real: custoTotalPecasReal,
          data_fechamento_financeiro: new Date()
        }
      });

      // 3. Processar cada pagamento do cliente
      console.log(`🔍 [CONSOLIDAÇÃO] Iniciando processamento de ${os.pagamentos_cliente.length} pagamento(s) para OS #${idOs}`);
      
      for (const pagamento of os.pagamentos_cliente) {
        const metodo = (pagamento.metodo_pagamento || '').trim().toUpperCase();
        const valorPagamento = Number(pagamento.valor);
        const idContaBancaria = (pagamento as any).id_conta_bancaria;
        const idPagamentoCliente = pagamento.id_pagamento_cliente;

        // Buscar operadora para descrição (se houver)
        let operadoraNome = '';
        if (pagamento.id_operadora) {
          const op = await tx.operadoraCartao.findUnique({ where: { id_operadora: pagamento.id_operadora } });
          operadoraNome = op?.nome || '';
        }

        console.log(`   🔸 Pagamento ${idPagamentoCliente}: ${metodo} | R$ ${valorPagamento} | Conta: ${idContaBancaria}`);

        if (metodo === 'PIX' || metodo === 'DINHEIRO') {
          // PIX/DINHEIRO: Lançamento no caixa + Atualiza saldo bancário (se conta informada)
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda ${metodo} - OS #${idOs}`,
              valor: valorPagamento,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: idContaBancaria
            }
          });

          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any
          });

          if (idContaBancaria) {
            await tx.contaBancaria.update({
              where: { id_conta: idContaBancaria },
              data: { saldo_atual: { increment: valorPagamento } }
            });
            console.log(`      ✅ [PIX/DIN] Saldo da conta ${idContaBancaria} atualizado (+ R$ ${valorPagamento})`);
          }
          
        } else if (metodo === 'DEBITO' || metodo === 'CREDITO') {
          // CARTÃO: Lançamento no caixa (faturamento bruto total) + Cria recebível (NÃO atualiza saldo bancário agora)
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda Cartão ${metodo} ${operadoraNome ? `(${operadoraNome})` : ''} - OS #${idOs}`,
              valor: valorPagamento,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: null 
            }
          });
          
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any
          });

          if (pagamento.id_operadora) {
            const operadora = await tx.operadoraCartao.findUnique({
              where: { id_operadora: pagamento.id_operadora }
            });

            if (operadora) {
              const taxa = metodo === 'DEBITO' 
                ? Number(operadora.taxa_debito) 
                : (pagamento.qtd_parcelas === 1 ? Number(operadora.taxa_credito_vista) : Number(operadora.taxa_credito_parc));
              
              const prazo = metodo === 'DEBITO'
                ? Number(operadora.prazo_debito)
                : (pagamento.qtd_parcelas === 1 ? Number(operadora.prazo_credito_vista) : Number(operadora.prazo_credito_parc));

              const taxaAplicada = (valorPagamento * taxa) / 100;
              const valorLiquido = valorPagamento - taxaAplicada;

              const dataPrevistaBase = new Date();
              dataPrevistaBase.setDate(dataPrevistaBase.getDate() + prazo);

              const qtdParcelas = pagamento.qtd_parcelas || 1;
              const valorPorParcela = valorPagamento / qtdParcelas;
              const valorLiquidoPorParcela = valorLiquido / qtdParcelas;
              const taxaPorParcela = taxaAplicada / qtdParcelas;

              for (let i = 1; i <= qtdParcelas; i++) {
                const dataPrevistaParcela = new Date(dataPrevistaBase);
                dataPrevistaParcela.setMonth(dataPrevistaParcela.getMonth() + (i - 1));

                await tx.recebivelCartao.create({
                  data: {
                    id_os: idOs,
                    id_operadora: pagamento.id_operadora,
                    num_parcela: i,
                    total_parcelas: qtdParcelas,
                    valor_bruto: valorPorParcela,
                    valor_liquido: valorLiquidoPorParcela,
                    taxa_aplicada: taxaPorParcela,
                    data_venda: new Date(),
                    data_prevista: dataPrevistaParcela,
                    status: 'PENDENTE'
                  }
                });
              }
              console.log(`      ✅ [CARTÃO] ${qtdParcelas} recebível(eis) criado(s) para OS #${idOs}`);
            }
          }
        }
      }

      await tx.ordemDeServico.update({
        where: { id_os: idOs },
        data: { status: 'FINALIZADA' }
      });

      return fechamento;
    });
  }
}

