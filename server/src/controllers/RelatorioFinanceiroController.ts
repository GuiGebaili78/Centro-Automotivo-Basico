import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export class RelatorioFinanceiroController {
  async getDashboard(req: Request, res: Response) {
    try {
      // 1. Definição de datas (Default: Últimos 30 dias se não vier na query)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // --- A. KPIS GERAIS ---

      // Receita: Apenas LivroCaixa (Fonte Única da Verdade)
      // Excluir transferências internas e conciliações para evitar duplicidade
      const receitasCaixa = await prisma.livroCaixa.aggregate({
        where: {
          tipo_movimentacao: "ENTRADA",
          dt_movimentacao: { gte: startDate, lte: endDate },
          deleted_at: null,
          // Excluir transferências internas/conciliações
          NOT: {
            categoria: {
              in: ["CONCILIACAO_CARTAO", "TRANSFERENCIA", "AJUSTE_SALDO"],
            },
          },
        },
        _sum: { valor: true },
      });

      // Despesa: Soma de saídas do caixa (inclui peças pagas, luz, água)
      const despesasCaixa = await prisma.livroCaixa.aggregate({
        where: {
          tipo_movimentacao: "SAIDA",
          dt_movimentacao: { gte: startDate, lte: endDate },
        },
        _sum: { valor: true },
      });

      // Usar APENAS LivroCaixa como fonte de receita realizada
      const receitaTotal = Number(receitasCaixa._sum.valor) || 0;
      const despesaTotal = Number(despesasCaixa._sum.valor) || 0;
      const lucroLiquido = receitaTotal - despesaTotal;
      const margemLucro =
        receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

      // Ticket Médio
      const totalOS = await prisma.ordemDeServico.count({
        where: {
          dt_entrega: { gte: startDate, lte: endDate },
          status: "FINALIZADO",
        },
      });
      const ticketMedio = totalOS > 0 ? receitaTotal / totalOS : 0;

      // --- B. FLUXO DE CAIXA (GRÁFICO) ---
      // Agrupamento real por dia no banco de dados para alta performance
      const fluxo_caixa: any[] = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(dt_movimentacao, 'DD/MM') as date,
          SUM(CASE WHEN tipo_movimentacao = 'ENTRADA' THEN valor ELSE 0 END)::FLOAT as "Receitas",
          SUM(CASE WHEN tipo_movimentacao = 'SAIDA' THEN valor ELSE 0 END)::FLOAT as "Despesas"
        FROM "livro_caixa"
        WHERE dt_movimentacao BETWEEN ${startDate} AND ${endDate}
          AND deleted_at IS NULL
          AND NOT (categoria IN ('CONCILIACAO_CARTAO', 'TRANSFERENCIA', 'AJUSTE_SALDO'))
        GROUP BY DATE_TRUNC('day', dt_movimentacao), TO_CHAR(dt_movimentacao, 'DD/MM')
        ORDER BY DATE_TRUNC('day', dt_movimentacao) ASC
      `;

      // --- C. CATEGORIAS DE DESPESA (DONUT) ---
      const despesasPorCategoria = await prisma.livroCaixa.groupBy({
        by: ["categoria"],
        where: {
          tipo_movimentacao: "SAIDA",
          dt_movimentacao: { gte: startDate },
        },
        _sum: { valor: true },
        orderBy: { _sum: { valor: "desc" } },
        take: 5,
      });

      let categorias = despesasPorCategoria.map((d) => ({
        name: d.categoria || "Geral",
        value: Number(d._sum.valor),
      }));

      // Se não tiver dados, enviar mock para não deixar tela em branco
      if (categorias.length === 0) {
        categorias = [
          { name: "Peças", value: 0 },
          { name: "Pessoal", value: 0 },
          { name: "Infraestrutura", value: 0 },
        ];
      }

      return res.json({
        kpis: {
          receita: receitaTotal,
          despesa: despesaTotal,
          lucro: lucroLiquido,
          margem: margemLucro,
          ticket: ticketMedio,
        },
        fluxo_caixa,
        categorias,
      });
    } catch (error) {
      console.error("Erro no Relatório:", error);
      return res
        .status(500)
        .json({ error: "Erro interno ao processar relatório." });
    }
  }
}
