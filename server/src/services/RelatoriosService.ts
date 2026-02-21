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
  addMonths,
  startOfMonth,
  endOfMonth,
  differenceInMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Categorias do sistema que não devem ser editadas pelo usuário
export const CATEGORIAS_SISTEMA = [
  "Fornecedor / Pg. Fornecedor",
  "Fornecedor / Estoque",
  "Receita / Serviços",
  "Colaboradores / (Adiantamento, Comissão, Prêmio e Contrato)",
];

// Categorias consideradas "fornecedor" para separação de despesas
const CATEGORIAS_FORNECEDOR = [
  "Fornecedor / Pg. Fornecedor",
  "Fornecedor / Estoque",
];

const fixEncoding = (str: string | null | undefined): string => {
  if (!str) return "";
  return (
    str
      // ── minúsculas ────────────────────────────────────────────────────────────
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
      .replace(/├╣/g, "ú")
      .replace(/├┤/g, "ô")
      .replace(/├«/g, "î")
      .replace(/├»/g, "ï")
      .replace(/├╕/g, "û")
      .replace(/├▒/g, "ñ")
      // ── maiúsculas ───────────────────────────────────────────────────────────
      .replace(/├ü/g, "Á")
      .replace(/├â/g, "Â")
      .replace(/├Ç/g, "À")
      .replace(/├É/g, "É")
      .replace(/├ê/g, "Ê")
      .replace(/├Í/g, "Í")
      .replace(/├Ó/g, "Ó")
      .replace(/├ô/g, "Ô")
      .replace(/├Ú/g, "Ú")
      .replace(/├ç/g, "Ç")
      .replace(/├Ñ/g, "Ñ")
      // ── compostos ────────────────────────────────────────────────────────────
      .replace(/├úo/g, "ão") // ã seguido de o (sufixo comum)
      .replace(/├╡es/g, "ões")
  ); // õ seguido de es
};

export class RelatoriosService {
  /**
   * Resumo Financeiro Granular
   */
  async getResumoFinanceiro(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Calcular diferença em meses para médias (mínimo 1)
    const diffMeses = Math.max(1, differenceInMonths(endDate, startDate));

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
    let receitaPecasEstoque = 0;
    let receitaPecasTerceiros = 0;

    let custoPecasEstoque = 0;
    let custoPecasTerceiros = 0;

    // Cálculo detalhado OS a OS
    for (const os of osList) {
      receitaTotal += Number(os.valor_total_cliente || 0);
      receitaMaoDeObra += Number(os.valor_mao_de_obra || 0);

      for (const item of os.itens_os) {
        const valorVendaItem = Number(item.valor_total || 0);

        // Peças de terceiros = tem pagamento_peca vinculado (comprado fora)
        if (item.pagamentos_peca && item.pagamentos_peca.length > 0) {
          receitaPecasTerceiros += valorVendaItem;
          const custoReal = item.pagamentos_peca.reduce(
            (c, pp) => c + Number(pp.custo_real || 0),
            0,
          );
          custoPecasTerceiros += custoReal;
        } else {
          // Peças de estoque
          receitaPecasEstoque += valorVendaItem;
          const custoUnit = Number(item.pecas_estoque?.valor_custo || 0);
          const quantidade = Number(item.quantidade || 0);
          custoPecasEstoque += custoUnit * quantidade;
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

    // Agrupar despesas por categoria e separar fornecedor vs operacional
    const despesasMap = new Map<string, number>();
    let totalContasPagar = 0;
    let despesasFornecedor = 0;
    let despesasOperacional = 0;

    despesasContas.forEach((c) => {
      const val = Number(c.valor || 0);
      totalContasPagar += val;
      const catName = fixEncoding(
        c.categoria || c.categoria_financeira?.nome || "Sem Categoria",
      );
      despesasMap.set(catName, (despesasMap.get(catName) || 0) + val);

      // Separar fornecedor de operacional
      if (CATEGORIAS_FORNECEDOR.includes(catName)) {
        despesasFornecedor += val;
      } else {
        despesasOperacional += val;
      }
    });

    // Despesas com Equipe (entram como operacional)
    const pagamentosEquipe = await prisma.pagamentoEquipe.findMany({
      where: { dt_pagamento: { gte: start, lte: end } },
    });

    const totalEquipe = pagamentosEquipe.reduce(
      (acc, pg) => acc + Number(pg.valor_total || 0),
      0,
    );

    // Equipe é custo operacional
    despesasOperacional += totalEquipe;

    const totalDespesas = totalContasPagar + totalEquipe;

    // 3. Comissões pagas (para cálculo do lucro líquido de MO)
    const comissoesPagas = pagamentosEquipe.reduce(
      (acc, pg) => acc + Number(pg.valor_total || 0),
      0,
    );

    // 4. Resultado Líquido por segmento
    // MO Líquida = MO Bruta - Comissões pagas
    const lucroMaoDeObra = receitaMaoDeObra - comissoesPagas;
    // Estoque = Valor cobrado na OS - Custo de Compra (fallback 0)
    const lucroPecasEstoque = receitaPecasEstoque - custoPecasEstoque;
    // Terceiros = Valor cobrado na OS - Custo pago ao fornecedor
    const lucroPecasTerceiros = receitaPecasTerceiros - custoPecasTerceiros;

    const lucroLiquidoTotal =
      receitaTotal - (custoPecasEstoque + custoPecasTerceiros) - totalDespesas;

    // 5. Médias mensais
    const medias = {
      receitaBruta: receitaTotal / diffMeses,
      lucroLiquido: lucroLiquidoTotal / diffMeses,
      despesasTotais: totalDespesas / diffMeses,
    };

    return {
      periodo: { start, end },
      bruta: {
        maoDeObra: receitaMaoDeObra,
        pecasTerceiros: receitaPecasTerceiros,
        pecasEstoque: receitaPecasEstoque,
        total: receitaTotal,
      },
      liquida: {
        maoDeObra: Number(lucroMaoDeObra || 0),
        pecasTerceiros: Number(lucroPecasTerceiros || 0),
        pecasEstoque: Number(lucroPecasEstoque || 0),
        total: Number(lucroLiquidoTotal || 0),
      },
      custos: {
        pecasEstoque: custoPecasEstoque,
        pecasTerceiros: custoPecasTerceiros,
        equipe: totalEquipe,
        contas: totalContasPagar,
        total: custoPecasEstoque + custoPecasTerceiros + totalDespesas,
      },
      despesas: {
        operacional: despesasOperacional,
        fornecedor: despesasFornecedor,
        total: totalDespesas,
      },
      medias,
      despesasPorCategoria: Array.from(despesasMap.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor),
      indicadores: {
        lucroLiquido: Number(lucroLiquidoTotal || 0),
        margemLiquida:
          receitaTotal > 0 ? (lucroLiquidoTotal / receitaTotal) * 100 : 0,
        pontoEquilibrio: totalDespesas,
      },
    };
  }

  /**
   * Evolução de Despesas Temporal (10 meses: 6 passados + 4 futuros)
   * Aceita filtro opcional por categoria
   */
  async getEvolucaoDespesasTemporal(categoriaFiltro?: string) {
    const today = new Date();

    // Janela: 6 meses passados + 4 meses futuros = 10 meses totais
    const startWindow = startOfMonth(subMonths(today, 6));
    const endWindow = endOfMonth(addMonths(today, 3));

    // Buscar Contas Pagar na janela
    const contasJanela = await prisma.contasPagar.findMany({
      where: {
        OR: [
          {
            status: "PAGO",
            dt_pagamento: { gte: startWindow, lte: endWindow },
          },
          {
            status: "PENDENTE",
            dt_vencimento: { gte: startWindow, lte: endWindow },
          },
        ],
      },
      include: { categoria_financeira: true },
    });

    // Buscar Pagamentos Equipe (realizados) na janela passada
    const equipeJanela = await prisma.pagamentoEquipe.findMany({
      where: {
        dt_pagamento: { gte: startWindow, lte: today },
      },
    });

    const projectionMap = new Map<
      string,
      { realizado: number; previsto: number; dateObj: Date }
    >();

    // Inicializar todos os 10 meses: -6 a +3
    for (let i = -6; i <= 3; i++) {
      const d = addMonths(startOfMonth(today), i);
      const key = format(d, "MMM/yy", { locale: ptBR });
      projectionMap.set(key, { realizado: 0, previsto: 0, dateObj: d });
    }

    const populateRealizado = (date: Date | null, val: number) => {
      if (!date) return;
      const key = format(date, "MMM/yy", { locale: ptBR });
      if (projectionMap.has(key)) {
        projectionMap.get(key)!.realizado += val;
      }
    };

    const populatePrevisto = (date: Date | null, val: number) => {
      if (!date) return;
      const key = format(date, "MMM/yy", { locale: ptBR });
      if (projectionMap.has(key)) {
        projectionMap.get(key)!.previsto += val;
      }
    };

    contasJanela.forEach((c) => {
      const val = Number(c.valor || 0);

      // Aplicar filtro de categoria se fornecido
      if (categoriaFiltro) {
        const catName = fixEncoding(
          c.categoria || c.categoria_financeira?.nome || "Sem Categoria",
        );
        if (catName !== categoriaFiltro) return;
      }

      if (c.status === "PAGO" && c.dt_pagamento) {
        populateRealizado(c.dt_pagamento, val);
      } else if (c.status === "PENDENTE" && c.dt_vencimento) {
        populatePrevisto(c.dt_vencimento, val);
      }
    });

    // Equipe somente no realizado (sem filtro de categoria pois são pagamentos diretos)
    if (!categoriaFiltro) {
      equipeJanela.forEach((e) => {
        const val = Number(e.valor_total || 0);
        if (e.dt_pagamento) {
          populateRealizado(e.dt_pagamento, val);
        }
      });
    }

    return Array.from(projectionMap.entries())
      .map(([mes, data]) => ({
        mes: mes.charAt(0).toUpperCase() + mes.slice(1),
        realizado: data.realizado,
        previsto: data.previsto,
        sortKey: data.dateObj.getTime(),
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ mes, realizado, previsto }) => ({ mes, realizado, previsto }));
  }

  /**
   * Performance da Equipe — KPI de MO + Vendas de Estoque
   * Lógica invertida: OS → Colaborador (evita duplicação relacional)
   */
  async getPerformanceEquipe(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // ── 1. Busca todas as OSs finalizadas no período ────────────────────────
    const ordens = await prisma.ordemDeServico.findMany({
      where: {
        status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
        updated_at: { gte: start, lte: end },
      },
      include: {
        itens_os: {
          include: {
            pagamentos_peca: true,
            pecas_estoque: true,
          },
        },
        servicos_mao_de_obra: true, // para saber quais mecânicos trabalharam nessa OS
      },
    });

    // ── 2. Constrói o Map: id_funcionario → totalVendasEstoque ──────────────
    // Para cada OS, calcula o total de peças de estoque (sem pagamentos_peca)
    // e distribui esse total para todos os mecânicos que trabalharam nela.
    const vendasEstoquePorMecanico = new Map<number, number>();

    for (const os of ordens) {
      // Total de peças de estoque interno nesta OS
      const totalEstoqueOS = os.itens_os.reduce((acc: number, item: any) => {
        const ehEstoqueInterno =
          !item.pagamentos_peca || item.pagamentos_peca.length === 0;
        if (ehEstoqueInterno && item.pecas_estoque) {
          return acc + Number(item.valor_total || 0);
        }
        return acc;
      }, 0);

      if (totalEstoqueOS <= 0) continue;

      // Distribui o valor para cada mecânico que fez serviço nesta OS
      const mecanicos = new Set<number>(
        os.servicos_mao_de_obra
          .map((svc: any) => svc.id_funcionario)
          .filter(Boolean),
      );

      for (const idFunc of mecanicos) {
        vendasEstoquePorMecanico.set(
          idFunc,
          (vendasEstoquePorMecanico.get(idFunc) || 0) + totalEstoqueOS,
        );
      }
    }

    // ── 3. Busca funcionários ativos com seus serviços e comissões ──────────
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
          where: { dt_pagamento: { gte: start, lte: end } },
        },
      },
    });

    // ── 4. Monta o array de relatório ────────────────────────────────────────
    const report = funcionarios.map((f: any) => {
      const maoDeObraBruta = f.servicos_mao_de_obra.reduce(
        (acc: number, svc: any) => acc + Number(svc.valor || 0),
        0,
      );

      const comissaoPaga = f.pagamentos.reduce(
        (acc: number, pg: any) => acc + Number(pg.valor_total || 0),
        0,
      );

      const lucroMaoDeObra = maoDeObraBruta - comissaoPaga;

      const vendasEstoque = vendasEstoquePorMecanico.get(f.id_funcionario) || 0;

      return {
        id: f.id_funcionario,
        nome: fixEncoding(f.pessoa_fisica?.pessoa?.nome),
        maoDeObraBruta,
        comissaoPaga,
        lucroMaoDeObra,
        vendasEstoque,
      };
    });

    return report.sort((a, b) => b.maoDeObraBruta - a.maoDeObraBruta);
  }

  /**
   * Evolução das Despesas por Subcategoria (comparativo período atual vs anterior)
   */
  async getEvolucaoDespesas(startDate: Date, endDate: Date) {
    const currentStart = startOfDay(startDate);
    const currentEnd = endOfDay(endDate);

    const duration = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    const fetchExpenses = async (start: Date, end: Date) => {
      const despesas = await prisma.contasPagar.findMany({
        where: {
          status: "PAGO",
          dt_pagamento: { gte: start, lte: end },
        },
        include: { categoria_financeira: true },
      });

      const map = new Map<string, number>();
      despesas.forEach((d) => {
        const cat = fixEncoding(
          d.categoria || d.categoria_financeira?.nome || "Outros",
        );
        map.set(cat, (map.get(cat) || 0) + Number(d.valor));
      });
      return map;
    };

    const [currentExpenses, prevExpenses] = await Promise.all([
      fetchExpenses(currentStart, currentEnd),
      fetchExpenses(prevStart, prevEnd),
    ]);

    const allCategories = new Set([
      ...Array.from(currentExpenses.keys()),
      ...Array.from(prevExpenses.keys()),
    ]);

    const comparativo = Array.from(allCategories).map((categoria) => {
      const valorAtual = currentExpenses.get(categoria) || 0;
      const valorAnterior = prevExpenses.get(categoria) || 0;

      let variacaoPercentual = 0;
      if (valorAnterior > 0) {
        variacaoPercentual =
          ((valorAtual - valorAnterior) / valorAnterior) * 100;
      } else if (valorAtual > 0) {
        variacaoPercentual = 100;
      }

      return {
        categoria,
        valorAtual,
        valorAnterior,
        variacaoPercentual,
      };
    });

    return comparativo.sort((a, b) => b.valorAtual - a.valorAtual);
  }

  /**
   * Operadoras de Cartão
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
   * Evolução Temporal — respeita as datas do frontend
   * groupBy: 'month' | 'quarter' | 'semester' | 'year'
   */
  async getEvolucaoMensal(
    startDate: Date,
    endDate: Date,
    groupBy: "month" | "quarter" | "semester" | "year" = "month",
  ) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const allOs = await prisma.ordemDeServico.findMany({
      where: {
        status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
        updated_at: { gte: start, lte: end },
      },
      select: { updated_at: true, valor_total_cliente: true },
    });

    const despesas = await prisma.contasPagar.findMany({
      where: {
        status: "PAGO",
        dt_pagamento: { gte: start, lte: end },
      },
      select: { dt_pagamento: true, valor: true },
    });

    const equipe = await prisma.pagamentoEquipe.findMany({
      where: { dt_pagamento: { gte: start, lte: end } },
      select: { dt_pagamento: true, valor_total: true },
    });

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

    // ── Inicializa buckets de acordo com o agrupamento ──────────────────────
    if (groupBy === "month") {
      // Itera mês a mês no intervalo
      let cursor = startOfMonth(start);
      while (cursor <= end) {
        const key = format(cursor, "yyyy-MM");
        map.set(key, {
          label: format(cursor, "MMM/yy", { locale: ptBR }),
          receita: 0,
          despesa: 0,
          lucro: 0,
          sortKey: key,
        });
        cursor = addMonths(cursor, 1);
      }
    } else if (groupBy === "quarter") {
      let cursor = startOfQuarter(start);
      while (cursor <= end) {
        const q = getQuarter(cursor);
        const y = cursor.getFullYear();
        const key = `${y}-Q${q}`;
        if (!map.has(key)) {
          map.set(key, {
            label: `${q}º Tri/${y}`,
            receita: 0,
            despesa: 0,
            lucro: 0,
            sortKey: key,
          });
        }
        cursor = addMonths(cursor, 3);
      }
    } else if (groupBy === "semester") {
      // Semestre: S1 = Jan-Jun, S2 = Jul-Dez
      let cursor = startOfMonth(start);
      while (cursor <= end) {
        const m = cursor.getMonth(); // 0-indexed
        const s = m < 6 ? 1 : 2;
        const y = cursor.getFullYear();
        const key = `${y}-S${s}`;
        if (!map.has(key)) {
          map.set(key, {
            label: `${s}º Sem/${y}`,
            receita: 0,
            despesa: 0,
            lucro: 0,
            sortKey: key,
          });
        }
        cursor = addMonths(cursor, 1);
      }
    } else {
      // year
      let cursor = startOfMonth(start);
      while (cursor <= end) {
        const y = cursor.getFullYear();
        const key = `${y}`;
        if (!map.has(key)) {
          map.set(key, {
            label: `${y}`,
            receita: 0,
            despesa: 0,
            lucro: 0,
            sortKey: key,
          });
        }
        cursor = addMonths(cursor, 1);
      }
    }

    // ── Função de chave por data ─────────────────────────────────────────────
    const getKey = (date: Date): string | null => {
      if (!date) return null;
      if (groupBy === "month") return format(date, "yyyy-MM");
      if (groupBy === "quarter") {
        return `${date.getFullYear()}-Q${getQuarter(date)}`;
      }
      if (groupBy === "semester") {
        const s = date.getMonth() < 6 ? 1 : 2;
        return `${date.getFullYear()}-S${s}`;
      }
      // year
      return `${date.getFullYear()}`;
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
      }
    };

    allOs.forEach((i) =>
      processItem(i, "updated_at", "receita", "valor_total_cliente"),
    );
    despesas.forEach((i) => processItem(i, "dt_pagamento", "despesa", "valor"));
    equipe.forEach((i) =>
      processItem(i, "dt_pagamento", "despesa", "valor_total"),
    );

    Array.from(map.values()).forEach((val) => {
      val.lucro = val.receita - val.despesa;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey),
    );
  }
}

export const relatoriosService = new RelatoriosService();
