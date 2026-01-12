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
      for (const pagamento of os.pagamentos_cliente) {
        const metodo = pagamento.metodo_pagamento.toUpperCase();

        if (metodo === 'PIX') {
          // PIX: Lançamento no caixa + Atualiza saldo bancário
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Recebimento PIX - OS #${idOs}`,
              valor: pagamento.valor,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: pagamento.id_conta_bancaria,
              id_pagamento_cliente: pagamento.id_pagamento_cliente
            }
          });

          // Vincular pagamento ao livro caixa
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
            data: { id_livro_caixa: livroCaixa.id_livro_caixa }
          });

          // Atualizar saldo bancário (se tiver conta vinculada)
          if (pagamento.id_conta_bancaria) {
            await tx.contaBancaria.update({
              where: { id_conta: pagamento.id_conta_bancaria },
              data: {
                saldo_atual: {
                  increment: pagamento.valor
                }
              }
            });
          }
          
        } else if (metodo === 'DINHEIRO') {
          // DINHEIRO: Apenas lançamento no caixa
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Recebimento Dinheiro - OS #${idOs}`,
              valor: pagamento.valor,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: pagamento.id_conta_bancaria, // Pode ser null (caixa físico)
              id_pagamento_cliente: pagamento.id_pagamento_cliente
            }
          });

          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
            data: { id_livro_caixa: livroCaixa.id_livro_caixa }
          });

          // Atualizar saldo bancário (se tiver conta vinculada)
          if (pagamento.id_conta_bancaria) {
            await tx.contaBancaria.update({
              where: { id_conta: pagamento.id_conta_bancaria },
              data: {
                saldo_atual: {
                  increment: pagamento.valor
                }
              }
            });
          }

        } else if (metodo === 'DEBITO' || metodo === 'CREDITO') {
          // CARTÃO: Lançamento no caixa (faturamento) + Cria recebível
          
          // 1. Lançamento no caixa (valor total - faturamento)
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Faturamento ${metodo} - OS #${idOs}`,
              valor: pagamento.valor,
              tipo_movimentacao: 'ENTRADA',
              categoria: 'VENDA',
              dt_movimentacao: new Date(),
              origem: 'AUTOMATICA',
              id_conta_bancaria: null, // Não entra no banco ainda
              id_pagamento_cliente: pagamento.id_pagamento_cliente
            }
          });

          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
            data: { id_livro_caixa: livroCaixa.id_livro_caixa }
          });

          // 2. Buscar operadora (se informada)
          if (pagamento.id_operadora) {
            const operadora = await tx.operadoraCartao.findUnique({
              where: { id_operadora: pagamento.id_operadora }
            });

            if (operadora) {
              // Calcular taxa e valor líquido
              const taxa = metodo === 'DEBITO' 
                ? operadora.taxa_debito 
                : (pagamento.qtd_parcelas === 1 ? operadora.taxa_credito_vista : operadora.taxa_credito_parc);
              
              const prazo = metodo === 'DEBITO'
                ? operadora.prazo_debito
                : (pagamento.qtd_parcelas === 1 ? operadora.prazo_credito_vista : operadora.prazo_credito_parc);

              const taxaAplicada = (pagamento.valor * Number(taxa)) / 100;
              const valorLiquido = pagamento.valor - taxaAplicada;

              // Calcular data prevista
              const dataPrevista = new Date();
              dataPrevista.setDate(dataPrevista.getDate() + prazo);

              // Criar recebível(is) - um para cada parcela
              const qtdParcelas = pagamento.qtd_parcelas || 1;
              const valorPorParcela = pagamento.valor / qtdParcelas;
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

      // 4. Atualizar status da OS
      await tx.ordemDeServico.update({
        where: { id_os: idOs },
        data: { status: 'FINALIZADA' }
      });

      return fechamento;
    });
  }
}

