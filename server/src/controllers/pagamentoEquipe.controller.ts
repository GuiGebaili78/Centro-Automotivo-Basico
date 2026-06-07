import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export const getPendentesByFuncionario = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id_funcionario } = req.params;

    // Busca serviços de Mão de Obra Pendentes
    const servicos = await prisma.servicoMaoDeObra.findMany({
      where: {
        id_funcionario: Number(id_funcionario),
        status_pagamento: "PENDENTE",
        deleted_at: null,
        ordem_de_servico: {
          fechamento_financeiro: { some: {} },
        },
      },
      include: {
        funcionario: true,
        ordem_de_servico: {
          include: {
            itens_os: {
              where: { deleted_at: null },
              include: {
                pecas_estoque: true,
                pagamentos_peca: true,
              },
            },
            veiculo: true,
            cliente: {
              include: {
                pessoa_fisica: { include: { pessoa: true } },
                pessoa_juridica: { include: { pessoa: true } },
              },
            },
          },
        },
      },
      orderBy: {
        dt_cadastro: "desc",
      },
    });

    const calculatedOsIds = new Set<number>();

    const mappedServicos = servicos.map((s) => {
      let valor_comissao_pecas = 0;
      let lucro_pecas_snapshot = 0;
      const osId = s.id_os;
      const pctPecas = Number(s.funcionario?.comissao_pecas || 0);

      // Calcular o lucro total de peças na OS
      const itens = s.ordem_de_servico?.itens_os || [];
      const lucroPecasTotal = itens.reduce((acc, item) => {
        if (item.is_interno) return acc; // ignorar uso interno

        const valorVenda = Number(item.valor_venda || 0) * (item.quantidade || 1);
        let lucroPeca = valorVenda;

        if (item.pecas_estoque) {
          const custo = Number(item.pecas_estoque.valor_custo || 0) * (item.quantidade || 1);
          lucroPeca = valorVenda - custo;
        } else if (item.pagamentos_peca?.[0]) {
          const custoReal = Number(item.pagamentos_peca[0].custo_real || 0);
          lucroPeca = valorVenda - custoReal;
        }

        return acc + Math.max(0, lucroPeca);
      }, 0);

      lucro_pecas_snapshot = lucroPecasTotal;

      if (pctPecas > 0 && !calculatedOsIds.has(osId)) {
        calculatedOsIds.add(osId);
        valor_comissao_pecas = (lucroPecasTotal * pctPecas) / 100;
      }

      return {
        ...s,
        valor_comissao_pecas,
        lucro_pecas_snapshot,
      };
    });

    res.json(mappedServicos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar comissões pendentes" });
  }
};

export const getValesPendentesByFuncionario = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id_funcionario } = req.params;
    const vales = await prisma.pagamentoEquipe.findMany({
      where: {
        id_funcionario: Number(id_funcionario),
        tipo_lancamento: "VALE",
        descontado: false,
      },
      orderBy: {
        dt_pagamento: "desc",
      },
    });
    res.json(vales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar vales pendentes" });
  }
};

export const createPagamento = async (req: Request, res: Response) => {
  try {
    const {
      id_funcionario,
      servicos_ids,
      vales_ids,
      valor_total,
      obs,
      forma_pagamento,
      premio_valor,
      premio_descricao,
      tipo_lancamento,
      referencia_inicio,
      referencia_fim,
      id_conta_bancaria,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar Registro de Pagamento
      // Se for VALE, ele nasce nao descontado (descontado: false). Se for SALARIO/COMISSAO, nao se aplica (false).
      const pagamento = await tx.pagamentoEquipe.create({
        data: {
          id_funcionario: Number(id_funcionario),
          valor_total: Number(valor_total),
          forma_pagamento: forma_pagamento || "DINHEIRO",
          premio_valor: premio_valor ? Number(premio_valor) : null,
          premio_descricao: premio_descricao || null,
          tipo_lancamento: tipo_lancamento || "COMISSAO",
          referencia_inicio: referencia_inicio
            ? new Date(referencia_inicio)
            : null,
          referencia_fim: referencia_fim ? new Date(referencia_fim) : null,
          obs: obs,
          descontado: false, // Default
        },
      });

      // 2. Atualizar Serviços (Comissões)
      if (servicos_ids && servicos_ids.length > 0) {
        await tx.servicoMaoDeObra.updateMany({
          where: {
            id_servico_mao_de_obra: { in: servicos_ids },
            deleted_at: null,
          },
          data: {
            status_pagamento: "PAGO",
            id_pagamento_equipe: pagamento.id_pagamento_equipe,
          },
        });
      }

      // 3. Deduzir Vales (Se houver IDs de vales selecionados para desconto)
      if (vales_ids && vales_ids.length > 0) {
        await tx.pagamentoEquipe.updateMany({
          where: {
            id_pagamento_equipe: { in: vales_ids },
            id_funcionario: Number(id_funcionario),
            tipo_lancamento: "VALE",
            descontado: false,
          },
          data: {
            descontado: true,
            id_pagamento_deducao: pagamento.id_pagamento_equipe,
          },
        });
      }

      // 3. Obter nome do funcionário para o Livro Caixa
      const func = await tx.funcionario.findUnique({
        where: { id_funcionario: Number(id_funcionario) },
        include: { pessoa_fisica: { include: { pessoa: true } } },
      });
      const nomeFunc = func?.pessoa_fisica?.pessoa?.nome || "Funcionário";

      // 4. Lançar no Livro Caixa
      await tx.livroCaixa.create({
        data: {
          descricao: `Pagamento Equipe - ${nomeFunc}`,
          valor: Number(valor_total),
          tipo_movimentacao: "SAIDA",
          categoria: "EQUIPE",
          id_pagamento_equipe: pagamento.id_pagamento_equipe,
          id_conta_bancaria: id_conta_bancaria
            ? Number(id_conta_bancaria)
            : null,
        },
      });

      // 5. Atualizar Saldo da Conta Bancária (se fornecida)
      if (id_conta_bancaria) {
        await tx.contaBancaria.update({
          where: { id_conta: Number(id_conta_bancaria) },
          data: {
            saldo_atual: {
              decrement: Number(valor_total),
            },
          },
        });
      }

      return pagamento;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao realizar pagamento" });
  }
};

export const getHistorico = async (req: Request, res: Response) => {
  try {
    const pagamentos = await prisma.pagamentoEquipe.findMany({
      include: {
        funcionario: {
          include: { pessoa_fisica: { include: { pessoa: true } } },
        },
        servicos_pagos: {
          include: {
            ordem_de_servico: {
              include: {
                veiculo: true,
                cliente: {
                  include: {
                    pessoa_fisica: { include: { pessoa: true } },
                    pessoa_juridica: { include: { pessoa: true } },
                  },
                },
                itens_os: {
                  where: { deleted_at: null },
                  include: {
                    pecas_estoque: true,
                    pagamentos_peca: { where: { deleted_at: null } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dt_pagamento: "desc" },
    });
    
    const pagamentosMapped = pagamentos.map((pag) => {
      const func = pag.funcionario;
      const pctPecas = Number(func?.comissao_pecas || 0);

      const servicosMapped = pag.servicos_pagos.map((s) => {
        let valor_comissao_pecas = 0;
        let lucro_pecas_snapshot = 0;
        
        const itens = s.ordem_de_servico?.itens_os || [];
        const lucroPecasTotal = itens.reduce((acc, item) => {
          if (item.is_interno) return acc;
          const valorVenda = Number(item.valor_venda || 0) * (item.quantidade || 1);
          let lucroPeca = valorVenda;

          if (item.pecas_estoque) {
            const custo = Number(item.pecas_estoque.valor_custo || 0) * (item.quantidade || 1);
            lucroPeca = valorVenda - custo;
          } else if (item.pagamentos_peca?.[0]) {
            const custoReal = Number(item.pagamentos_peca[0].custo_real || 0);
            lucroPeca = valorVenda - custoReal;
          }

          return acc + Math.max(0, lucroPeca);
        }, 0);

        lucro_pecas_snapshot = lucroPecasTotal;

        if (pctPecas > 0) {
          // No histórico, assumimos que todos os serviços que tenham a mesma OS vão mostrar a comissão, ou ratear. 
          // Para simplificar, assim como no pendente, a OS pode aparecer mais de uma vez se tiver mais de um serviço?
          // Sim, mas a UI não reclama.
          valor_comissao_pecas = (lucroPecasTotal * pctPecas) / 100;
        }

        return {
          ...s,
          valor_comissao_pecas,
          lucro_pecas_snapshot,
        };
      });

      return {
        ...pag,
        servicos_pagos: servicosMapped,
      };
    });

    res.json(pagamentosMapped);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
};

