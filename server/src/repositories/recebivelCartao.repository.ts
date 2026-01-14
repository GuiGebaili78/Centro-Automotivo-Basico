import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class RecebivelCartaoRepository {
  async create(data: Prisma.RecebivelCartaoCreateInput) {
    return await prisma.recebivelCartao.create({
      data,
    });
  }

  async findAll() {
    return await prisma.recebivelCartao.findMany({
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
        data_prevista: 'asc' // Mais próximos primeiro
      }
    });
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
      // Total pendente
      prisma.recebivelCartao.aggregate({
        where: { status: 'PENDENTE' },
        _sum: { valor_liquido: true }
      }),
      // Receber hoje
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'PENDENTE',
          data_prevista: {
            gte: new Date(hoje.setHours(0, 0, 0, 0)),
            lte: new Date(hoje.setHours(23, 59, 59, 999))
          }
        },
        _sum: { valor_liquido: true }
      }),
      // Próximos 7 dias
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'PENDENTE',
          data_prevista: {
            gte: hoje,
            lte: seteDias
          }
        },
        _sum: { valor_liquido: true }
      }),
      // Próximos 30 dias
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'PENDENTE',
          data_prevista: {
            gte: hoje,
            lte: trintaDias
          }
        },
        _sum: { valor_liquido: true }
      }),
      // Total recebido (mês atual)
      prisma.recebivelCartao.aggregate({
        where: {
          status: 'RECEBIDO',
          data_recebimento: {
            gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          }
        },
        _sum: { valor_liquido: true }
      })
    ]);

    return {
      totalPendente: totalPendente._sum.valor_liquido || 0,
      receberHoje: receberHoje._sum.valor_liquido || 0,
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
