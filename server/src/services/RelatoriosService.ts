import { prisma } from "../prisma.js";
import {
  startOfDay,
  endOfDay,
  subMonths,
  format,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  getQuarter,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const fixEncoding = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .replace(/├º/g, "ç")
    .replace(/├ú/g, "ã")
    .replace(/├á/g, "à")
    .replace(/├í/g, "á")
    .replace(/├®/g, "é")
    .replace(/├¬/g, "ê")
    .replace(/├¡/g, "í")
    .replace(/├ó/g, "â")
    .replace(/├│/g, "ó")
    .replace(/├╡/g, "õ")
    .replace(/├úo/g, "ão")
    .replace(/├ô/g, "Ô")
    .replace(/├Ç/g, "À")
    .replace(/├ê/g, "Ê")
    .replace(/├É/g, "É")
    .replace(/├Í/g, "Í")
    .replace(/├Ó/g, "Ó")
    .replace(/├Ú/g, "Ú")
    .replace(/├Ñ/g, "Ñ");
};

export class RelatoriosService {
  /**
   * Resumo Financeiro Granular
   */
  async getResumoFinanceiro(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // 1. Fetch OS Finalizadas
    const osList = await prisma.ordemDeServico.findMany({
      where: {
        status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
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
        fechamento_financeiro: true,
      },
    });

    let receitaTotal = 0;
    let receitaMaoDeObra = 0;
    let receitaPecas = 0;
    let receitaPecasEstoque = 0;
    let receitaPecasFora = 0;

    let custoPecasEstoque = 0;
    let custoPecasFora = 0;

    // Cálculo detalhado OS a OS
    for (const os of osList) {
      receitaTotal += Number(os.valor_total_cliente || 0);
      receitaMaoDeObra += Number(os.valor_mao_de_obra || 0); // Soma dos serviços
      receitaPecas += Number(os.valor_pecas || 0);

      for (const item of os.itens_os) {
        const valorVendaItem = Number(item.valor_total || 0);

        // Verifica se é peça de fora (tem pagamento_peca vinculado)
        if (item.pagamentos_peca && item.pagamentos_peca.length > 0) {
          // É peça externa
          receitaPecasFora += valorVendaItem;
          // Custo real do pagamento ao fornecedor
          const custoReal = item.pagamentos_peca.reduce(
            (c, pp) => c + Number(pp.custo_real || 0),
            0,
          );
          custoPecasFora += custoReal;
        } else {
          // É peça de estoque
          receitaPecasEstoque += valorVendaItem;
          // Custo de estoque (Unitário * Qtd)
          const custoUnit = Number(item.pecas_estoque?.valor_custo || 0);
          custoPecasEstoque += custoUnit * item.quantidade;
        }
      }
    }

    // 2. Despesas (Contas Pagar + Equipe)
    const despesasContas = await prisma.contasPagar.findMany({
      where: {
        status: "PAGO",
        dt_pagamento: { gte: start, lte: end },
      },
      include: { categoria_financeira: true },
    });

    // Agrupar despesas por categoria corrigida
    const despesasMap = new Map<string, number>();
    let totalContasPagar = 0;

    despesasContas.forEach((c) => {
      const val = Number(c.valor);
      totalContasPagar += val;
      const catName = fixEncoding(
        c.categoria || c.categoria_financeira?.nome || "Outros",
      );
      despesasMap.set(catName, (despesasMap.get(catName) || 0) + val);
    });

    // Despesas com Equipe (Comissões + Salários Pagos no período)
    const pagamentosEquipe = await prisma.pagamentoEquipe.findMany({
      where: { dt_pagamento: { gte: start, lte: end } },
    });

    const totalEquipe = pagamentosEquipe.reduce(
      (acc, pg) => acc + Number(pg.valor_total || 0),
      0,
    );
    const totalDespesas = totalContasPagar + totalEquipe;

    // 3. Resultado Líquido
    // Lucro Bruto = Receita - CMV (Peças)
    // Lucro Líquido = Lucro Bruto - Despesas Operacionais (Equipe + Contas)
    // *Nota: Comissões são tecnicamente Custo Variável, mas no modelo simplificado solicitado entram como "Despesa Equipe".

    // Lucro Líquido por segmento
    const lucroMaoDeObra = receitaMaoDeObra - totalEquipe; // Simplificação: Custo toda equipe abatido da MO
    const lucroPecasEstoque = receitaPecasEstoque - custoPecasEstoque;
    const lucroPecasFora = receitaPecasFora - custoPecasFora;

    const lucroLiquidoTotal =
      receitaTotal - (custoPecasEstoque + custoPecasFora) - totalDespesas;

    return {
      periodo: { start, end },
      bruta: {
        maoDeObra: receitaMaoDeObra,
        pecasFora: receitaPecasFora,
        pecasEstoque: receitaPecasEstoque,
        total: receitaTotal,
      },
      liquida: {
        maoDeObra: lucroMaoDeObra, // Receita MO - Custo Equipe Total
        pecasFora: lucroPecasFora,
        pecasEstoque: lucroPecasEstoque,
        total: lucroLiquidoTotal,
      },
      custos: {
        pecasEstoque: custoPecasEstoque,
        pecasFora: custoPecasFora,
        equipe: totalEquipe,
        contas: totalContasPagar,
        total: custoPecasEstoque + custoPecasFora + totalDespesas,
      },
      despesasPorCategoria: Array.from(despesasMap.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor),
      indicadores: {
        lucroLiquido: lucroLiquidoTotal,
        margemLiquida:
          receitaTotal > 0 ? (lucroLiquidoTotal / receitaTotal) * 100 : 0,
        pontoEquilibrio: totalDespesas, // Quanto precisa faturar pra cobrir custos fixos/operacionais (aprox)
      },
    };
  }

  /**
   * Performance da Equipe (Com Lucro de Peças)
   */
  async getPerformanceEquipe(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const funcionarios = await prisma.funcionario.findMany({
      where: { ativo: "S" },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        servicos_mao_de_obra: {
          where: {
            ordem_de_servico: {
              status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
              updated_at: { gte: start, lte: end },
            },
          },
        },
        pagamentos: {
          // Pagamentos FEITOS ao funcionário no período (Custo Empresa)
          where: { dt_pagamento: { gte: start, lte: end } },
        },
        // Buscar OSs onde ele é o responsável principal para atribuir lucro de peças
        ordens_de_servico: {
          where: {
            status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
            updated_at: { gte: start, lte: end },
          },
          include: {
            itens_os: {
              include: { pecas_estoque: true, pagamentos_peca: true },
            },
          },
        },
      },
    });

    const report = funcionarios.map((f: any) => {
      // 1. Produção de Mão de Obra
      const totalProduzidoMO = f.servicos_mao_de_obra.reduce(
        (acc: number, svc: any) => acc + Number(svc.valor || 0),
        0,
      );

      // 2. Lucro gerado com Peças (nas OSs que ele liderou)
      let lucroPecas = 0;
      f.ordens_de_servico.forEach((os: any) => {
        os.itens_os.forEach((item: any) => {
          const venda = Number(item.valor_total || 0);
          let custo = 0;
          if (item.pagamentos_peca && item.pagamentos_peca.length > 0) {
            custo = item.pagamentos_peca.reduce(
              (c: number, pp: any) => c + Number(pp.custo_real || 0),
              0,
            );
          } else {
            custo =
              Number(item.pecas_estoque?.valor_custo || 0) * item.quantidade;
          }
          lucroPecas += venda - custo;
        });
      });

      // 3. Custo do Colaborador (Comissões + Salário pagos no período)
      const custoColaborador = f.pagamentos.reduce(
        (acc: number, pg: any) => acc + Number(pg.valor_total || 0),
        0,
      );

      return {
        id: f.id_funcionario,
        nome: fixEncoding(f.pessoa_fisica?.pessoa?.nome),
        maoDeObraTotal: totalProduzidoMO,
        lucroPecas: lucroPecas,
        totalGerado: totalProduzidoMO + lucroPecas,
        custoColaborador: custoColaborador,
        roi: totalProduzidoMO + lucroPecas - custoColaborador,
      };
    });

    return report.sort((a, b) => b.roi - a.roi); // Rank by ROI
  }

  /**
   * Operadoras de Cartão (Mantido, apenas fix typing/encoding se precisar)
   */
  async getOperadorasCartao(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const pagamentos = await prisma.pagamentoCliente.findMany({
      where: {
        data_pagamento: { gte: start, lte: end },
        metodo_pagamento: { in: ["CREDITO", "DEBITO"] },
        deleted_at: null,
      },
      include: { operadora: true },
    });

    const porOperadora: Record<string, any> = {};

    for (const pg of pagamentos) {
      const opName = fixEncoding(pg.operadora?.nome || "Desconhecida");
      if (!porOperadora[opName]) {
        porOperadora[opName] = {
          nome: opName,
          totalBruto: 0,
          totalTaxas: 0,
          totalLiquido: 0,
          count: 0,
        };
      }

      const valor = Number(pg.valor || 0);
      let rate = 0;
      if (pg.operadora) {
        if (pg.metodo_pagamento === "DEBITO")
          rate = Number(pg.operadora.taxa_debito || 0);
        else if (pg.metodo_pagamento === "CREDITO") {
          rate =
            pg.qtd_parcelas === 1
              ? Number(pg.operadora.taxa_credito_vista || 0)
              : Number(pg.operadora.taxa_credito_parc || 0);
        }
      }

      const taxa = valor * (rate / 100);
      const liquido = valor - taxa;

      porOperadora[opName].totalBruto += valor;
      porOperadora[opName].totalTaxas += taxa;
      porOperadora[opName].totalLiquido += liquido;
      porOperadora[opName].count += 1;
    }

    return Object.values(porOperadora);
  }

  /**
   * Evolução Temporal (Mês ou Trimestre)
   */
  async getEvolucaoMensal(groupBy: "month" | "quarter" = "month") {
    const today = new Date();
    // Se for mensal, ultimos 12 meses. Se for trimestral, 4 trimestres (1 ano).
    const start =
      groupBy === "month"
        ? subMonths(startOfDay(today), 11)
        : subQuarters(startOfDay(today), 3);
    const end = endOfDay(today);

    // Fetch All Data needed
    // Receitas
    const allOs = await prisma.ordemDeServico.findMany({
      where: {
        status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
        updated_at: { gte: start, lte: end },
      },
      select: { updated_at: true, valor_total_cliente: true },
    });

    // Despesas Contas
    const despesas = await prisma.contasPagar.findMany({
      where: {
        status: "PAGO",
        dt_pagamento: { gte: start, lte: end },
      },
      select: { dt_pagamento: true, valor: true },
    });

    // Despesas Equipe
    const equipe = await prisma.pagamentoEquipe.findMany({
      where: { dt_pagamento: { gte: start, lte: end } },
      select: { dt_pagamento: true, valor_total: true },
    });

    // Strategy: Create a map with keys based on groupBy
    const map = new Map<
      string,
      {
        label: string;
        receita: number;
        despesa: number;
        lucro: number;
        sortKey: string;
      }
    >();

    // Initial Population
    if (groupBy === "month") {
      for (let i = 0; i < 12; i++) {
        const d = subMonths(today, i);
        const key = format(d, "yyyy-MM");
        map.set(key, {
          label: format(d, "MMM/yy", { locale: ptBR }),
          receita: 0,
          despesa: 0,
          lucro: 0,
          sortKey: key,
        });
      }
    } else {
      // Quarters
      for (let i = 0; i < 4; i++) {
        const d = subQuarters(today, i);
        const q = getQuarter(d); // 1, 2, 3, 4
        const y = d.getFullYear();
        const key = `${y}-Q${q}`;
        map.set(key, {
          label: `${q}º Tri/${y}`,
          receita: 0,
          despesa: 0,
          lucro: 0,
          sortKey: key,
        });
      }
    }

    const getKey = (date: Date) => {
      if (!date) return null;
      if (groupBy === "month") return format(date, "yyyy-MM");
      return `${date.getFullYear()}-Q${getQuarter(date)}`;
    };

    const processItem = (
      item: any,
      dateField: string,
      type: "receita" | "despesa",
      valField: string,
    ) => {
      const d = item[dateField];
      if (!d) return;
      const key = getKey(new Date(d));
      if (key && map.has(key)) {
        const entry = map.get(key)!;
        entry[type] += Number(item[valField] || 0);
      } else if (key) {
        // If outside the initialized range (shouldn't happen with filter), ignore for now or add?
        // Prompt says "last 12 months" or "4 quarters", so we stick to initialized keys or filter handles it.
        // If the filter date logic is perfect, we can add if missing.
        // Let's safe init if missing?
        // No, better strict to period.
      }
    };

    allOs.forEach((i) =>
      processItem(i, "updated_at", "receita", "valor_total_cliente"),
    );
    despesas.forEach((i) => processItem(i, "dt_pagamento", "despesa", "valor"));
    equipe.forEach((i) =>
      processItem(i, "dt_pagamento", "despesa", "valor_total"),
    );

    // Calc Lucro
    for (const val of map.values()) {
      val.lucro = val.receita - val.despesa;
    }

    return Array.from(map.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey),
    );
  }
}

export const relatoriosService = new RelatoriosService();
