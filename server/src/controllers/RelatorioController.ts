import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export class RelatorioController {
  async getRelatorioCompleto(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      // Definição de datas (padrão: mês atual se não informado)
      const now = new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate
        ? new Date(endDate as string)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // --- KPIs PRINCIPAIS ---
      const osFinalizadas = await prisma.ordemDeServico.findMany({
        where: {
          status: "FINALIZADA",
          updated_at: { gte: start, lte: end },
        },
        include: {
          itens_os: {
            include: {
              pecas_estoque: true,
              pagamentos_peca: true,
            },
          },
          servicos_mao_de_obra: true,
        },
      });

      let receitaBruta = 0;
      let custoPecasTotal = 0;
      let lucroEstoque = 0;
      let lucroPecasExternas = 0;
      let maoDeObraTotal = 0;

      const evolucaoMensal: Record<
        string,
        { maoDeObra: number; lucroEstoque: number; lucroPecasExternas: number }
      > = {};
      const porCategoria: Record<string, number> = {};

      for (const os of osFinalizadas) {
        const valorOs = Number(os.valor_final || 0);
        receitaBruta += valorOs;

        let custoPecasOs = 0;
        let lucroEstoqueOs = 0;
        let lucroPecasExternasOs = 0;

        // Calcular custos e lucros por item
        for (const item of os.itens_os) {
          const valorVenda = Number(item.valor_venda) * item.quantidade;

          if (item.pecas_estoque) {
            // PEÇA DE ESTOQUE
            const custo =
              Number(item.pecas_estoque.valor_custo) * item.quantidade;
            custoPecasOs += custo;
            lucroEstoqueOs += valorVenda - custo;
          } else {
            // PEÇA EXTERNA
            const pagPeca = item.pagamentos_peca[0];
            if (pagPeca) {
              const custoReal = Number(pagPeca.custo_real);
              custoPecasOs += custoReal;
              lucroPecasExternasOs += valorVenda - custoReal;
            } else {
              // Se não tem pagamento registrado, assumir margem zero
              custoPecasOs += valorVenda;
            }
          }
        }

        custoPecasTotal += custoPecasOs;
        lucroEstoque += lucroEstoqueOs;
        lucroPecasExternas += lucroPecasExternasOs;

        // Mão de Obra e Categorias
        for (const servico of os.servicos_mao_de_obra) {
          const valorServ = Number(servico.valor);
          maoDeObraTotal += valorServ;
          const cat = servico.categoria || "OUTROS";
          porCategoria[cat] = (porCategoria[cat] || 0) + valorServ;
        }

        // Evolução Mensal
        const mesKey = os.updated_at.toISOString().slice(0, 7);
        if (!evolucaoMensal[mesKey]) {
          evolucaoMensal[mesKey] = {
            maoDeObra: 0,
            lucroEstoque: 0,
            lucroPecasExternas: 0,
          };
        }
        evolucaoMensal[mesKey].maoDeObra += Number(os.valor_mao_de_obra || 0);
        evolucaoMensal[mesKey].lucroEstoque += lucroEstoqueOs;
        evolucaoMensal[mesKey].lucroPecasExternas += lucroPecasExternasOs;
      }

      // Taxas de Cartão (Recebiveis)
      const idsOs = osFinalizadas.map((o) => o.id_os);
      const recebiveis = await prisma.recebivelCartao.findMany({
        where: { id_os: { in: idsOs } },
      });
      const taxasCartaoTotal = recebiveis.reduce(
        (acc, curr) => acc + Number(curr.taxa_aplicada || 0),
        0,
      );

      const receitaLiquida = receitaBruta - custoPecasTotal - taxasCartaoTotal;
      const margem =
        receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0;
      const ticketMedio =
        osFinalizadas.length > 0 ? receitaBruta / osFinalizadas.length : 0;

      // --- TAXA DE CONVERSÃO ---
      const osOrcamentos = await prisma.ordemDeServico.count({
        where: {
          status: "ORCAMENTO",
          dt_abertura: { gte: start, lte: end },
        },
      });
      const taxaConversao =
        osOrcamentos > 0 ? (osFinalizadas.length / osOrcamentos) * 100 : 0;

      // --- CHURN (Clientes sem OS há 180+ dias) ---
      const dataLimiteChurn = new Date();
      dataLimiteChurn.setDate(dataLimiteChurn.getDate() - 180);

      const clientesAtivos = await prisma.cliente.findMany({
        include: {
          ordens_de_servico: {
            orderBy: { dt_abertura: "desc" },
            take: 1,
          },
        },
      });

      const churn = clientesAtivos.filter((cliente) => {
        if (cliente.ordens_de_servico.length === 0) return true;
        const ultimaOS = cliente.ordens_de_servico[0]!;
        return new Date(ultimaOS.dt_abertura) < dataLimiteChurn;
      }).length;

      // --- BREAK-EVEN (Despesas Fixas do Período) ---
      const despesasFixas = await prisma.contasPagar.aggregate({
        where: {
          dt_vencimento: { gte: start, lte: end },
          categoria: {
            in: ["Ocupação", "Água", "Luz", "Internet", "Telefone"],
          },
        },
        _sum: { valor: true },
      });
      const breakEven = Number(despesasFixas._sum.valor || 0);

      // --- RANKING DE EQUIPE (COMPLETO) ---
      const servicosPorFuncionario = await prisma.servicoMaoDeObra.groupBy({
        by: ["id_funcionario"],
        where: {
          ordem_de_servico: {
            status: "FINALIZADA",
            updated_at: { gte: start, lte: end },
          },
        },
        _sum: { valor: true },
      });

      const funcionarios = await prisma.funcionario.findMany({
        where: {
          id_funcionario: {
            in: servicosPorFuncionario.map((s) => s.id_funcionario),
          },
        },
        include: { pessoa_fisica: { include: { pessoa: true } } },
      });

      // Calcular peças vendidas e lucro por funcionário
      const rankingEquipe = await Promise.all(
        servicosPorFuncionario.map(async (servico) => {
          const func = funcionarios.find(
            (f) => f.id_funcionario === servico.id_funcionario,
          );

          // Buscar OS deste funcionário no período
          const osDoFuncionario = await prisma.ordemDeServico.findMany({
            where: {
              id_funcionario: servico.id_funcionario,
              status: "FINALIZADA",
              updated_at: { gte: start, lte: end },
            },
            include: {
              itens_os: {
                include: {
                  pecas_estoque: true,
                  pagamentos_peca: true,
                },
              },
            },
          });

          let pecasVendidas = 0;
          let lucroPecas = 0;

          for (const os of osDoFuncionario) {
            for (const item of os.itens_os) {
              pecasVendidas += item.quantidade;
              const valorVenda = Number(item.valor_venda) * item.quantidade;

              if (item.pecas_estoque) {
                const custo =
                  Number(item.pecas_estoque.valor_custo) * item.quantidade;
                lucroPecas += valorVenda - custo;
              } else {
                const pagPeca = item.pagamentos_peca[0];
                if (pagPeca) {
                  lucroPecas += valorVenda - Number(pagPeca.custo_real);
                }
              }
            }
          }

          return {
            nome: func?.pessoa_fisica?.pessoa.nome || "Desconhecido",
            totalMaoDeObra: Number(servico._sum.valor || 0),
            pecasVendidas,
            lucroPecas,
            totalContribuicao: Number(servico._sum.valor || 0) + lucroPecas,
          };
        }),
      );

      rankingEquipe.sort((a, b) => b.totalContribuicao - a.totalContribuicao);

      // --- RANKING DE FORNECEDORES ---
      const entradasPorFornecedor = await prisma.entradaEstoque.groupBy({
        by: ["id_fornecedor"],
        where: {
          data_compra: { gte: start, lte: end },
        },
        _sum: { valor_total: true },
        _count: { id_entrada: true },
      });

      const fornecedores = await prisma.fornecedor.findMany({
        where: {
          id_fornecedor: {
            in: entradasPorFornecedor.map((e) => e.id_fornecedor),
          },
        },
      });

      const rankingFornecedores = entradasPorFornecedor
        .map((entrada) => {
          const forn = fornecedores.find(
            (f) => f.id_fornecedor === entrada.id_fornecedor,
          );
          return {
            nome: forn?.nome || "Desconhecido",
            totalCompras: Number(entrada._sum.valor_total || 0),
            quantidadeCompras: entrada._count.id_entrada,
          };
        })
        .sort((a, b) => b.totalCompras - a.totalCompras)
        .slice(0, 10);

      // --- ANÁLISE DE OPERADORAS ---
      const recebiveisPorOperadora = await prisma.recebivelCartao.groupBy({
        by: ["id_operadora", "status"],
        where: {
          data_venda: { gte: start, lte: end },
        },
        _sum: {
          valor_liquido: true,
          taxa_aplicada: true,
        },
      });

      const operadoras = await prisma.operadoraCartao.findMany({
        where: {
          id_operadora: {
            in: recebiveisPorOperadora.map((r) => r.id_operadora),
          },
        },
      });

      const analiseOperadoras = operadoras.map((op) => {
        const recebido = recebiveisPorOperadora
          .filter(
            (r) =>
              r.id_operadora === op.id_operadora && r.status === "RECEBIDO",
          )
          .reduce((acc, curr) => acc + Number(curr._sum.valor_liquido || 0), 0);

        const aReceber = recebiveisPorOperadora
          .filter(
            (r) =>
              r.id_operadora === op.id_operadora && r.status === "PENDENTE",
          )
          .reduce((acc, curr) => acc + Number(curr._sum.valor_liquido || 0), 0);

        const taxasDescontadas = recebiveisPorOperadora
          .filter(
            (r) =>
              r.id_operadora === op.id_operadora && r.status === "RECEBIDO",
          )
          .reduce((acc, curr) => acc + Number(curr._sum.taxa_aplicada || 0), 0);

        return {
          nome: op.nome,
          recebido,
          aReceber,
          taxasDescontadas,
        };
      });

      // --- DESPESAS POR CATEGORIA ---
      const despesasPorCategoriaRaw = await prisma.contasPagar.groupBy({
        by: ["categoria"],
        where: {
          status: "PAGO",
          dt_pagamento: { gte: start, lte: end },
        },
        _sum: { valor: true },
      });

      const despesasPorCategoria = despesasPorCategoriaRaw.map((d) => ({
        name: d.categoria || "Sem Categoria",
        value: Number(d._sum.valor || 0),
        percentualFaturamento:
          receitaBruta > 0
            ? (Number(d._sum.valor || 0) / receitaBruta) * 100
            : 0,
      }));

      // --- LIVRO CAIXA ---
      const livroCaixa = await prisma.livroCaixa.findMany({
        where: {
          dt_movimentacao: { gte: start, lte: end },
          deleted_at: null,
        },
        orderBy: { dt_movimentacao: "desc" },
        take: 100,
      });

      return res.json({
        kpis: {
          receitaBruta,
          receitaLiquida,
          margem,
          ticketMedio,
          taxaConversao,
          churn,
          breakEven,
          countOs: osFinalizadas.length,
        },
        charts: {
          evolucaoMensal: Object.entries(evolucaoMensal).map(([mes, vals]) => ({
            mes,
            ...vals,
          })),
          porCategoria: Object.entries(porCategoria).map(([name, value]) => ({
            name,
            value,
          })),
          despesasPorCategoria,
        },
        ranking: {
          equipe: rankingEquipe,
          fornecedores: rankingFornecedores,
        },
        operadoras: analiseOperadoras,
        livroCaixa,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  }
}
