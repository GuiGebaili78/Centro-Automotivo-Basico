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
      console.log('🔍 [CONSOLIDAÇÃO] Iniciando processamento de', os.pagamentos_cliente.length, 'pagamento(s)');
      
      for (const pagamento of os.pagamentos_cliente) {
        const metodo = pagamento.metodo_pagamento.toUpperCase();
        
        // Buscar operadora para descrição (se houver)
        let operadoraNome = '';
        if (pagamento.id_operadora) {
          const op = await tx.operadoraCartao.findUnique({ where: { id_operadora: pagamento.id_operadora } });
          operadoraNome = op?.nome || '';
        }

        if (metodo === 'PIX') {
          // PIX: Lançamento no caixa + Atualiza saldo bancário + Aparece no Extrato
          console.log(`💰 [CONSOLIDAÇÃO] Processando PIX: R$ ${pagamento.valor} na conta ${(pagamento as any).id_conta_bancaria}`);
          
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda PIX - OS #${idOs}`,
              valor: pagamento.valor,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: (pagamento as any).id_conta_bancaria
            }
          });

          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any
          });

          if ((pagamento as any).id_conta_bancaria) {
            await tx.contaBancaria.update({
              where: { id_conta: (pagamento as any).id_conta_bancaria },
              data: { saldo_atual: { increment: Number(pagamento.valor) } }
            });
            console.log(`✅ [CONSOLIDAÇÃO] Saldo da conta ${(pagamento as any).id_conta_bancaria} incrementado.`);
          }
          
        } else if (metodo === 'DINHEIRO') {
          // DINHEIRO: Lançamento no caixa + Atualiza saldo (se conta informada)
          console.log(`💵 [CONSOLIDAÇÃO] Processando DINHEIRO: R$ ${pagamento.valor}`);
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda Dinheiro - OS #${idOs}`,
              valor: pagamento.valor,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: (pagamento as any).id_conta_bancaria
            }
          });

          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any
          });

          if ((pagamento as any).id_conta_bancaria) {
            await tx.contaBancaria.update({
              where: { id_conta: (pagamento as any).id_conta_bancaria },
              data: { saldo_atual: { increment: Number(pagamento.valor) } }
            });
          }

        } else if (metodo === 'DEBITO' || metodo === 'CREDITO') {
          // CARTÃO: Lançamento no caixa (faturamento bruto total) + Cria recebível
          console.log(`💳 [CONSOLIDAÇÃO] Processando CARTÃO ${metodo}: R$ ${pagamento.valor}`);
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda Cartão ${metodo} ${operadoraNome ? `(${operadoraNome})` : ''} - OS #${idOs}`,
              valor: pagamento.valor,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: null
            }
          });
          
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any
          });

          if (pagamento.id_operadora) {
            const operadora = await tx.operadoraCartao.findUnique({
              where: { id_operadora: pagamento.id_operadora }
            });

            if (operadora) {
              const taxa = metodo === 'DEBITO' 
                ? operadora.taxa_debito 
                : (pagamento.qtd_parcelas === 1 ? operadora.taxa_credito_vista : operadora.taxa_credito_parc);
              
              const prazo = metodo === 'DEBITO'
                ? operadora.prazo_debito
                : (pagamento.qtd_parcelas === 1 ? operadora.prazo_credito_vista : operadora.prazo_credito_parc);

              const taxaAplicada = (Number(pagamento.valor) * Number(taxa)) / 100;
              const valorLiquido = Number(pagamento.valor) - taxaAplicada;

              const dataPrevista = new Date();
              dataPrevista.setDate(dataPrevista.getDate() + prazo);

              const qtdParcelas = pagamento.qtd_parcelas || 1;
              const valorPorParcela = Number(pagamento.valor) / qtdParcelas;
              const valorLiquidoPorParcela = valorLiquido / qtdParcelas;
              const taxaPorParcela = taxaAplicada / qtdParcelas;

              for (let i = 1; i <= qtdParcelas; i++) {
                const dataPrevisaParcela = new Date(dataPrevista);
                dataPrevisaParcela.setMonth(dataPrevisaParcela.getMonth() + (i - 1));

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
                    data_prevista: dataPrevisaParcela,
                    status: 'PENDENTE'
                  }
                });
              }
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

