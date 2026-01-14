import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class RecebivelCartaoRepository {
  async create(data: Prisma.RecebivelCartaoCreateInput) {
    return await prisma.recebivelCartao.create({
      data,
    });
  }

  async findAll() {
    const [recebiveis, pixPendentes] = await Promise.all([
      prisma.recebivelCartao.findMany({
        include: {
          operadora: {
            include: {
              conta_destino: true
            }
          },
          ordem_de_servico: {
            include: {
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: true
                }
              },
              veiculo: true,
              pagamentos_cliente: true
            }
          }
        },
        orderBy: {
          data_prevista: 'asc'
        }
      }),
      // Buscar PIX Pendentes (Pagamentos de OS finalizada sem LivroCaixa)
      prisma.pagamentoCliente.findMany({
        where: {
          metodo_pagamento: 'PIX',
          deleted_at: null,
          id_livro_caixa: null,
          ordem_de_servico: {
            fechamento_financeiro: { isNot: null } // Apenas OSs Consolidadas
          }
        },
        include: {
          ordem_de_servico: {
            include: {
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: true
                }
              },
              veiculo: true,
              pagamentos_cliente: true,
              fechamento_financeiro: true
            }
          },
          conta_bancaria: true // Incluir conta destino do PIX
        }
      })
    ]);

    // Mapear PIX para IRecebivelCartao "Virtual"
    const pixMapped = pixPendentes.map(p => ({
        id_recebivel: -p.id_pagamento_cliente, // ID Negativo para identificar PIX
        id_os: p.id_os,
        id_operadora: 999999, // ID Fictício
        valor_bruto: p.valor,
        valor_liquido: p.valor, // PIX não tem taxa no sistema atual
        taxa_aplicada: 0,
        num_parcela: 1,
        total_parcelas: 1,
        data_venda: p.data_pagamento,
        data_prevista: p.data_pagamento, // Disponível imediatamente
        status: 'PENDENTE',
        data_recebimento: null,
        confirmado_em: null,
        confirmado_por: null,
        created_at: p.data_pagamento,
        updated_at: p.data_pagamento,
        
        // Relacionamentos Simulados
        operadora: {
          id_operadora: 999999,
          nome: 'PIX', // Exibir como PIX na coluna Operadora
          taxa: 0,
          dias_recebimento: 0,
          ativo: true,
          id_conta_destino: p.id_conta_bancaria || 0,
          conta_destino: p.conta_bancaria || { nome: 'Conta N/I' } // Fallback
        },
        ordem_de_servico: p.ordem_de_servico
    }));

    // Merge e Sort
    return [...recebiveis, ...pixMapped].sort((a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime());
  }

  async findById(id: number) {
    return await prisma.recebivelCartao.findUnique({
      where: { id_recebivel: id },
      include: {
        operadora: {
          include: {
            conta_destino: true
          }
        },
        ordem_de_servico: {
          include: {
            cliente: {
              include: {
                pessoa_fisica: { include: { pessoa: true } },
                pessoa_juridica: true
              }
            },
            veiculo: true,
            pagamentos_cliente: true
          }
        }
      }
    });
  }

  async findByOperadora(idOperadora: number) {
    return await prisma.recebivelCartao.findMany({
      where: { id_operadora: idOperadora },
      include: {
        operadora: {
          include: {
            conta_destino: true
          }
        },
        ordem_de_servico: {
            include: {
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: true
                }
              },
              veiculo: true,
              pagamentos_cliente: true
            }
          }
      },
      orderBy: {
        data_prevista: 'asc'
      }
    });
  }

  async findByStatus(status: string) {
    return await prisma.recebivelCartao.findMany({
      where: { status },
      include: {
        operadora: {
          include: {
            conta_destino: true
          }
        },
        ordem_de_servico: {
            include: {
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: true
                }
              },
              veiculo: true,
              pagamentos_cliente: true
            }
          }
      },
      orderBy: {
        data_prevista: 'asc'
      }
    });
  }

  async findByDateRange(dataInicio: Date, dataFim: Date) {
    return await prisma.recebivelCartao.findMany({
      where: {
        data_prevista: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      include: {
        operadora: {
          include: {
            conta_destino: true
          }
        },
        ordem_de_servico: {
            include: {
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: true
                }
              },
              veiculo: true,
              pagamentos_cliente: true
            }
          }
      },
      orderBy: {
        data_prevista: 'asc'
      }
    });
  }

  async confirmarRecebimento(id: number, confirmadoPor: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar recebível
      const recebivel = await tx.recebivelCartao.findUnique({
        where: { id_recebivel: id },
        include: {
          operadora: {
            include: {
              conta_destino: true
            }
          }
        }
      });

      if (!recebivel) {
        throw new Error('Recebível não encontrado');
      }

      if (recebivel.status === 'RECEBIDO') {
        throw new Error('Recebível já foi confirmado');
      }

      // 2. Atualizar saldo da conta bancária (VALOR LÍQUIDO)
      await tx.contaBancaria.update({
        where: { id_conta: recebivel.operadora.id_conta_destino },
        data: {
          saldo_atual: {
            increment: Number(recebivel.valor_liquido)
          }
        }
      });

      // 3. Criar lançamento no LivroCaixa APENAS para o extrato bancário
      // Obs: id_conta_bancaria preenchido faz aparecer no extrato.
      // Categoria diferenciada para não inflar faturamento diário se for filtrado.
      await tx.livroCaixa.create({
        data: {
            descricao: `Rec. Confirmado - ${recebivel.operadora.nome} (OS #${recebivel.id_os}) Parc ${recebivel.num_parcela}/${recebivel.total_parcelas} [REC_ID:${id}]`,
            valor: recebivel.valor_liquido,
            tipo_movimentacao: 'ENTRADA',
            categoria: 'CONCILIACAO_CARTAO',
            dt_movimentacao: new Date(),
            origem: 'AUTOMATICA',
            id_conta_bancaria: recebivel.operadora.id_conta_destino
        }
      });

      // 4. Atualizar status do recebível
      return await tx.recebivelCartao.update({
        where: { id_recebivel: id },
        data: {
          status: 'RECEBIDO',
          data_recebimento: new Date(),
          confirmado_em: new Date(),
          confirmado_por: confirmadoPor
        } as any
      });
    });
  }

  async estornarRecebimento(id: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar recebível
      const recebivel = await tx.recebivelCartao.findUnique({
        where: { id_recebivel: id },
        include: {
          operadora: {
            include: {
              conta_destino: true
            }
          }
        }
      });

      if (!recebivel) {
        throw new Error('Recebível não encontrado');
      }

      if (recebivel.status !== 'RECEBIDO') {
        throw new Error('Recebível não está confirmado');
      }

      // 2. Reverter saldo da conta bancária
      await tx.contaBancaria.update({
        where: { id_conta: recebivel.operadora.id_conta_destino },
        data: {
          saldo_atual: {
            decrement: Number(recebivel.valor_liquido)
          }
        }
      });

      // 3. Remover registros de conciliação do LivroCaixa para este recebível
      await tx.livroCaixa.deleteMany({
          where: {
              categoria: 'CONCILIACAO_CARTAO',
              descricao: {
                  contains: `[REC_ID:${id}]`
              }
          }
      });

      // 4. Reverter status do recebível
      return await tx.recebivelCartao.update({
        where: { id_recebivel: id },
        data: {
          status: 'PENDENTE',
          data_recebimento: null,
          confirmado_em: null,
          confirmado_por: null
        } as any
      });
    });
  }

  async update(id: number, data: Prisma.RecebivelCartaoUpdateInput) {
    return await prisma.recebivelCartao.update({
      where: { id_recebivel: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.recebivelCartao.delete({
      where: { id_recebivel: id },
    });
  }

  // Resumos para Dashboard
  async getResumo() {
    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() + 7);
    const trintaDias = new Date();
    trintaDias.setDate(hoje.getDate() + 30);

    const [totalPendente, receberHoje, receberSeteDias, receberTrintaDias, totalRecebido] = await Promise.all([
      // Total pendente (Cartão + PIX Pendente)
      (async () => {
         const card = await prisma.recebivelCartao.aggregate({ where: { status: 'PENDENTE' }, _sum: { valor_liquido: true } });
         const pix = await prisma.pagamentoCliente.aggregate({
            where: {
               metodo_pagamento: 'PIX',
               deleted_at: null,
               id_livro_caixa: null,
               ordem_de_servico: { fechamento_financeiro: { isNot: null } }
            },
            _sum: { valor: true }
         });
         return Number(card._sum.valor_liquido || 0) + Number(pix._sum.valor || 0);
      })(),

      // Receber hoje (Cartão + PIX)
      (async () => {
         const card = await prisma.recebivelCartao.aggregate({
            where: {
               status: 'PENDENTE',
               data_prevista: {
                   gte: new Date(hoje.setHours(0, 0, 0, 0)),
                   lte: new Date(hoje.setHours(23, 59, 59, 999))
               }
            },
            _sum: { valor_liquido: true }
         });
         // PIX é sempre D+0 praticamente, então entra aqui se pendente
         const pix = await prisma.pagamentoCliente.aggregate({
            where: {
               metodo_pagamento: 'PIX',
               deleted_at: null,
               id_livro_caixa: null,
               ordem_de_servico: { fechamento_financeiro: { isNot: null } }
            },
            _sum: { valor: true }
         });
         return Number(card._sum.valor_liquido || 0) + Number(pix._sum.valor || 0);
      })(),

      // Próximos 7 dias
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'PENDENTE',
          data_prevista: { gte: hoje, lte: seteDias }
        },
        _sum: { valor_liquido: true }
      }),
      // Próximos 30 dias
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'PENDENTE',
          data_prevista: { gte: hoje, lte: trintaDias }
        },
        _sum: { valor_liquido: true }
      }),
      // Total recebido (mês atual) - APENAS CARTÃO POR ENQUANTO (PIX entra como Caixa, complexo rastrear "histórico" sem tabela própria)
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'RECEBIDO',
          data_recebimento: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) }
        },
        _sum: { valor_liquido: true }
      })
    ]);

    return {
      totalPendente: totalPendente || 0,
      receberHoje: receberHoje || 0,
      receberSeteDias: receberSeteDias._sum.valor_liquido || 0,
      receberTrintaDias: receberTrintaDias._sum.valor_liquido || 0,
      totalRecebido: totalRecebido._sum.valor_liquido || 0
    };
  }

  // Confirmação em lote
  async confirmarRecebimentoLote(ids: number[], confirmadoPor: string) {
    return await prisma.$transaction(async (tx) => {
      const resultados = [];

      for (const id of ids) {
        
        // --- FLUXO PIX (ID NEGATIVO) ---
        if (id < 0) {
            const idPagamento = Math.abs(id);
            const pagamento = await tx.pagamentoCliente.findUnique({
                where: { id_pagamento_cliente: idPagamento },
                include: { conta_bancaria: true }
            });

            if (!pagamento || pagamento.id_livro_caixa) continue; // Já processado ou não existe

            console.log(`[PIX CONFIRM] Processing Payment #${idPagamento}`);

            const valor = Number(pagamento.valor);
            const idConta = pagamento.id_conta_bancaria || pagamento.conta_bancaria?.id_conta;

            if (!idConta) {
                console.error(`[PIX ERROR] Payment #${idPagamento} has no bank account provided.`);
                throw new Error(`Pagamento PIX (R$ ${valor}) não possui Conta Bancária vinculada. Edite o pagamento na OS.`);
            }

            // 1. Atualizar Saldo
            await tx.contaBancaria.update({
                where: { id_conta: idConta },
                data: { saldo_atual: { increment: valor } }
            });

            // 2. Criar Livro Caixa (Aparece no Extrato)
            const livro = await tx.livroCaixa.create({
                data: {
                    descricao: `Recebimento PIX - OS #${pagamento.id_os} (Confirmado em Rec.)`,
                    valor: valor,
                    tipo_movimentacao: 'ENTRADA',
                    categoria: 'VENDA', // PIX é venda direta
                    dt_movimentacao: new Date(),
                    origem: 'AUTOMATICA',
                    id_conta_bancaria: idConta
                }
            });

            // 3. Vincular (Marca como CONFIRMADO/FEITO)
            const updated = await tx.pagamentoCliente.update({
                where: { id_pagamento_cliente: idPagamento },
                data: { id_livro_caixa: livro.id_livro_caixa }
            });
            
            resultados.push(updated);
            continue;
        }

        // --- FLUXO CARTÃO (ID POSITIVO) - MANTIDO ---
        // Buscar recebível
        const recebivel = await tx.recebivelCartao.findUnique({
          where: { id_recebivel: id },
          include: {
            operadora: {
              include: {
                conta_destino: true
              }
            }
          }
        });

        if (!recebivel) {
          continue; // Pula se não encontrar
        }

        if (recebivel.status === 'RECEBIDO') {
          continue; // Já confirmado, pula
        }

        // Atualizar saldo da conta bancária
        await tx.contaBancaria.update({
          where: { id_conta: recebivel.operadora.id_conta_destino },
          data: {
            saldo_atual: {
              increment: Number(recebivel.valor_liquido)
            }
          }
        });

        // Registrar no extrato (LivroCaixa com conta vinculada)
        await tx.livroCaixa.create({
            data: {
                descricao: `Rec. Confirmado (Lote) - ${recebivel.operadora.nome} (OS #${recebivel.id_os}) Parc ${recebivel.num_parcela}/${recebivel.total_parcelas} [REC_ID:${id}]`,
                valor: recebivel.valor_liquido,
                tipo_movimentacao: 'ENTRADA',
                categoria: 'CONCILIACAO_CARTAO',
                dt_movimentacao: new Date(),
                origem: 'AUTOMATICA',
                id_conta_bancaria: recebivel.operadora.id_conta_destino
            }
        });

        // Atualizar status do recebível
        const updated = await tx.recebivelCartao.update({
          where: { id_recebivel: id },
          data: {
            status: 'RECEBIDO',
            data_recebimento: new Date(),
            confirmado_em: new Date(),
            confirmado_por: confirmadoPor
          } as any
        });

        resultados.push(updated);
      }

      return resultados;
    });
  }
}
