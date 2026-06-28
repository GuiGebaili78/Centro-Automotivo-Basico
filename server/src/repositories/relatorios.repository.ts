import { prisma } from "../prisma.js";
import {
  startOfDay,
  endOfDay,
  differenceInMonths,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { dayjs, TIMEZONE } from "../utils/date.js";

const CATEGORIAS_FORNECEDOR = [
  "Fornecedor / Pg. Fornecedor",
  "Fornecedor / Estoque",
];

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
    .replace(/├╣/g, "ú")
    .replace(/├┤/g, "ô")
    .replace(/├«/g, "î")
    .replace(/├»/g, "ï")
    .replace(/├╕/g, "û")
    .replace(/├▒/g, "ñ")
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
    .replace(/├úo/g, "ão")
    .replace(/├╡es/g, "ões");
};

export class RelatoriosRepository {
  async getResumoFinanceiro(startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const diffMeses = Math.max(1, differenceInMonths(end, start));

    // ─── 1. RECEITAS (Faturamento da OS finalizadas) ───
    const osAgg = await prisma.ordemDeServico.aggregate({
      where: {
        status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
        updated_at: { gte: start, lte: end },
        deleted_at: null,
      },
      _sum: {
        valor_mao_de_obra: true,
      },
    });

    const receitaMaoDeObra = Number(osAgg._sum?.valor_mao_de_obra || 0);

    // Receita de Peças de Terceiros (Auto Peças) - is_interno = false, id_produto = null
    const itensExternos = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_produto: null,
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
    });
    const receitaAutoPecas = itensExternos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);

    // Receita de Peças de Estoque - is_interno = false, id_produto != null
    const itensEstoque = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_produto: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
    });
    const receitaEstoque = itensEstoque.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
    const fluxoCaixaBruto = receitaMaoDeObra + receitaAutoPecas + receitaEstoque;

    // ─── 2. CUSTOS DE PRODUTOS VENDIDOS (CPV) ───
    // Custo de compra das Peças Externas (Auto Peças)
    const custoAutoPecasAgg = await prisma.pagamentoPeca.aggregate({
      where: {
        deleted_at: null,
        item_os: {
          is_interno: false,
          id_produto: null,
          ordem_de_servico: {
            status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
            updated_at: { gte: start, lte: end },
          },
        },
      },
      _sum: { custo_real: true },
    });
    const custoAutoPecas = Number(custoAutoPecasAgg._sum?.custo_real || 0);

    // Custo de compra das Peças de Estoque
    const itensEstoqueComDetalhe = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_produto: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
      include: { produto: true },
    });
    const custoEstoque = itensEstoqueComDetalhe.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.produto?.preco_custo_atual || (item as any).pecas_estoque?.valor_custo || 0),
      0
    );

    // ─── 3. PREJUÍZOS (Consumo Interno de Peças / Custo Oficina) ───
    // Custo de Peças de Estoque para Uso Interno
    const itensInternosEstoque = await prisma.itensOs.findMany({
      where: {
        is_interno: true,
        id_produto: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
      include: { produto: true },
    });
    const prejuizoEstoque = itensInternosEstoque.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.produto?.preco_custo_atual || (item as any).pecas_estoque?.valor_custo || 0),
      0
    );

    // Custo de Peças Externas para Uso Interno
    const custoInternoExternoAgg = await prisma.pagamentoPeca.aggregate({
      where: {
        deleted_at: null,
        item_os: {
          is_interno: true,
          id_produto: null,
          ordem_de_servico: {
            status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
            updated_at: { gte: start, lte: end },
          },
        },
      },
      _sum: { custo_real: true },
    });
    const prejuizoAutoPecas = Number(custoInternoExternoAgg._sum?.custo_real || 0);
    const totalPrejuizos = prejuizoEstoque + prejuizoAutoPecas;

    // ─── 4. DESPESAS E CUSTOS OPERACIONAIS ───
    const pagamentosEquipe = await prisma.pagamentoEquipe.findMany({
      where: { dt_pagamento: { gte: start, lte: end } },
    });
    const despesasMaoDeObra = pagamentosEquipe.reduce(
      (acc, pg) => acc + Number(pg.valor_total || 0),
      0
    );

    const pagamentosPecasPagas = await prisma.pagamentoPeca.findMany({
      where: {
        pago_ao_fornecedor: true,
        data_pagamento_fornecedor: { gte: start, lte: end },
        deleted_at: null,
      }
    });
    const despesasAutoPecas = pagamentosPecasPagas.reduce((acc, p) => acc + Number(p.custo_real || 0), 0);

    const despesasContas = await prisma.contasPagar.findMany({
      where: {
        status: "PAGO",
        dt_pagamento: { gte: start, lte: end },
        deleted_at: null,
      },
      include: { categoria_financeira: true },
    });

    const totalContasPagar = despesasContas.reduce((acc, c) => acc + Number(c.valor || 0), 0);

    let despesasOficinaContas = 0;
    const despesasMap = new Map<string, number>();

    despesasContas.forEach((c) => {
      const val = Number(c.valor || 0);
      const catName = fixEncoding(
        c.categoria || c.categoria_financeira?.nome || "Sem Categoria",
      );
      despesasMap.set(catName, (despesasMap.get(catName) || 0) + val);

      const nameLower = catName.toLowerCase();
      const isFornecedor = 
        nameLower.startsWith("auto pecas") ||
        nameLower.startsWith("auto peças") ||
        CATEGORIAS_FORNECEDOR.includes(catName);

      if (!isFornecedor) {
        despesasOficinaContas += val;
      }
    });

    const despesasOficina = despesasOficinaContas + despesasMaoDeObra;
    const totalDespesas = despesasAutoPecas + despesasOficina;

    // ─── 5. RESULTADOS (Lucro Líquido / Margens) ───
    const lucroMaoDeObra = receitaMaoDeObra - despesasMaoDeObra;
    // Lucro de Peças de Terceiros (Auto Peças) - APENAS OS FINALIZADA
    const itensExternosFinalizadas = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_produto: null,
        deleted_at: null,
        ordem_de_servico: {
          status: "FINALIZADA",
          updated_at: { gte: start, lte: end },
        },
      },
      include: { pagamentos_peca: true },
    });
    const lucroAutoPecas = itensExternosFinalizadas.reduce((acc, item) => {
      const valorVenda = Number(item.valor_total || 0);
      const custoReal = item.pagamentos_peca.reduce((sum, p) => sum + Number(p.custo_real || 0), 0);
      return acc + (valorVenda - custoReal);
    }, 0);

    // Lucro de Peças de Estoque - APENAS OS FINALIZADA
    const itensEstoqueFinalizadas = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_produto: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: "FINALIZADA",
          updated_at: { gte: start, lte: end },
        },
      },
      include: { produto: true },
    });
    const lucroEstoque = itensEstoqueFinalizadas.reduce((acc, item) => {
      const valorVenda = Number(item.valor_total || 0);
      const custoReal = Number(item.quantidade) * Number(item.produto?.preco_custo_atual || (item as any).pecas_estoque?.valor_custo || 0);
      return acc + (valorVenda - custoReal);
    }, 0);

    // Lucro Líquido Total = Lucros operacionais de segmentos - despesas oficina comuns - prejuízos internos
    const lucroLiquidoTotal = lucroMaoDeObra + lucroAutoPecas + lucroEstoque - despesasOficinaContas - totalPrejuizos;

    const receitaOperacional = receitaMaoDeObra + (lucroAutoPecas > 0 ? lucroAutoPecas : 0) + (lucroEstoque > 0 ? lucroEstoque : 0);

    const medias = {
      receitaBruta: fluxoCaixaBruto / diffMeses,
      lucroLiquido: lucroLiquidoTotal / diffMeses,
      despesasTotais: totalDespesas / diffMeses,
    };

    // ─── 6. ESTOQUE ABSOLUTO E COMPRAS (DASHBOARD) ───
    interface SumResult { sum: number }
    const resultEstoqueImobilizado = await prisma.$queryRaw<SumResult[]>`
      SELECT SUM(saldo_atual * preco_custo_atual) as sum
      FROM produto
      WHERE saldo_atual > 0
    `;
    const estoqueImobilizado = Number(resultEstoqueImobilizado[0]?.sum || 0);

    const resultComprasEstoque = await prisma.$queryRaw<SumResult[]>`
      SELECT SUM(quantidade * custo_unitario) as sum
      FROM movimentacao_estoque
      WHERE tipo = 'ENTRADA' AND data_movimentacao >= ${start} AND data_movimentacao <= ${end}
    `;
    const comprasPeriodoEstoque = Number(resultComprasEstoque[0]?.sum || 0);

    const dashboard = {
      receitaBruta: fluxoCaixaBruto,
      despesaBruta: totalDespesas,
      lucroLiquido: lucroLiquidoTotal,
      prejuizos: totalPrejuizos,
      estoque: {
        comprasPeriodo: comprasPeriodoEstoque,
        vendasPeriodo: receitaEstoque,
        lucroPeriodo: lucroEstoque,
        imobilizadoAbsoluto: estoqueImobilizado,
      }
    };

    return {
      dashboard,
      periodo: { start, end },
      bruta: {
        maoDeObra: receitaMaoDeObra,
        autoPecas: receitaAutoPecas,
        estoque: receitaEstoque,
        receitaPecas: receitaAutoPecas + receitaEstoque,
        receitaServicos: receitaMaoDeObra,
        total: receitaOperacional,
        fluxoCaixaBruto: fluxoCaixaBruto,
      },
      despesas: {
        maoDeObra: despesasMaoDeObra,
        autoPecas: despesasAutoPecas,
        oficina: despesasOficina,
        total: totalDespesas,
      },
      liquida: {
        maoDeObra: lucroMaoDeObra,
        autoPecas: lucroAutoPecas,
        estoque: lucroEstoque,
        total: lucroLiquidoTotal,
      },
      prejuizos: {
        estoque: prejuizoEstoque,
        autoPecas: prejuizoAutoPecas,
        total: totalPrejuizos,
      },
      custos: {
        pecasEstoque: custoEstoque,
        pecasTerceiros: custoAutoPecas,
        equipe: despesasMaoDeObra,
        contas: totalContasPagar,
        total: custoEstoque + custoAutoPecas + totalDespesas,
      },
      medias,
      despesasPorCategoria: Array.from(despesasMap.entries())
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor),
      indicadores: {
        lucroLiquido: lucroLiquidoTotal,
        margemLiquida: receitaOperacional > 0 ? (lucroLiquidoTotal / receitaOperacional) * 100 : 0,
        pontoEquilibrio: totalDespesas,
      },
    };
  }

  async getEvolucaoMensal(
    startDate: Date,
    endDate: Date,
    groupBy: "day" | "week" | "month" | "quarter" | "semester" | "year" = "month"
  ) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // 1. Busca Ordens de Serviço finalizadas no período
    const ordens = await prisma.ordemDeServico.findMany({
      where: {
        status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
        updated_at: { gte: start, lte: end },
        deleted_at: null,
      },
      include: {
        itens_os: {
          where: { deleted_at: null },
          include: { produto: true },
        },
      },
    });
    // 2. Busca pagamentos de equipe no período
    const equipe = await prisma.pagamentoEquipe.findMany({
      where: {
        dt_pagamento: { gte: start, lte: end },
      },
    });
    // 3. Busca contas pagas no período
    const contas = await prisma.contasPagar.findMany({
      where: {
        status: "PAGO",
        dt_pagamento: { gte: start, lte: end },
        deleted_at: null,
      },
      include: { categoria_financeira: true },
    });

    // 4. Busca pagamentos de peças externos no período (competência)
    const pagamentosPecas = await prisma.pagamentoPeca.findMany({
      where: {
        deleted_at: null,
        item_os: {
          ordem_de_servico: {
            status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
            updated_at: { gte: start, lte: end },
          },
        },
      },
      include: {
        item_os: true,
      },
    });

    // 4b. Busca pagamentos de peças (caixa)
    const pagamentosPecasCaixa = await prisma.pagamentoPeca.findMany({
      where: {
        pago_ao_fornecedor: true,
        data_pagamento_fornecedor: { gte: start, lte: end },
        deleted_at: null,
      }
    });

    // 5. Gera buckets baseados no groupBy
    const buckets: { start: Date; end: Date; label: string }[] = [];
    let current = new Date(start);

    if (groupBy === "day") {
      current = startOfDay(start);
      const limit = endOfDay(end);
      while (current <= limit) {
        buckets.push({
          start: startOfDay(current),
          end: endOfDay(current),
          label: format(current, "dd/MM", { locale: ptBR }),
        });
        current = addDays(current, 1);
      }
    } else if (groupBy === "week") {
      current = startOfWeek(start, { weekStartsOn: 1 });
      const limit = endOfWeek(end, { weekStartsOn: 1 });
      while (current <= limit) {
        buckets.push({
          start: startOfWeek(current, { weekStartsOn: 1 }),
          end: endOfWeek(current, { weekStartsOn: 1 }),
          label: `Sem ${format(current, "dd/MM", { locale: ptBR })}`,
        });
        current = addWeeks(current, 1);
      }
    } else if (groupBy === "month") {
      current = startOfMonth(start);
      const limit = endOfMonth(end);
      while (current <= limit) {
        buckets.push({
          start: startOfMonth(current),
          end: endOfMonth(current),
          label: format(current, "MMM/yy", { locale: ptBR }),
        });
        current = addMonths(current, 1);
      }
    } else if (groupBy === "quarter") {
      current = startOfQuarter(start);
      const limit = endOfQuarter(end);
      while (current <= limit) {
        const q = Math.floor(current.getMonth() / 3) + 1;
        buckets.push({
          start: startOfQuarter(current),
          end: endOfQuarter(current),
          label: `${q}º Tri/${current.getFullYear()}`,
        });
        current = addMonths(current, 3);
      }
    } else if (groupBy === "semester") {
      const semStartMonth = start.getMonth() < 6 ? 0 : 6;
      current = new Date(start.getFullYear(), semStartMonth, 1);
      const limit = end;
      while (current <= limit) {
        const sem = current.getMonth() < 6 ? 1 : 2;
        const bStart = new Date(current.getFullYear(), sem === 1 ? 0 : 6, 1);
        const bEnd = new Date(current.getFullYear(), sem === 1 ? 5 : 11, 31, 23, 59, 59);
        buckets.push({
          start: bStart,
          end: bEnd,
          label: `${sem}º Sem/${current.getFullYear()}`,
        });
        current = addMonths(current, 6);
      }
    } else if (groupBy === "year") {
      current = startOfYear(start);
      const limit = endOfYear(end);
      while (current <= limit) {
        buckets.push({
          start: startOfYear(current),
          end: endOfYear(current),
          label: `${current.getFullYear()}`,
        });
        current = addMonths(current, 12);
      }
    }

    // 6. Processa os cálculos de cada bucket em memória
    return buckets.map((bucket) => {
      const bStart = bucket.start;
      const bEnd = bucket.end;

      const osInBucket = ordens.filter(
        (o) => o.updated_at >= bStart && o.updated_at <= bEnd
      );
      const equipeInBucket = equipe.filter(
        (e) => e.dt_pagamento && e.dt_pagamento >= bStart && e.dt_pagamento <= bEnd
      );
      const contasInBucket = contas.filter(
        (c) => c.dt_pagamento && c.dt_pagamento >= bStart && c.dt_pagamento <= bEnd
      );
      const pgsPecasInBucket = pagamentosPecas.filter(
        (p) =>
          p.item_os?.id_os &&
          osInBucket.some((o) => o.id_os === p.item_os.id_os)
      );

      // Receitas
      const receitaMaoDeObra = osInBucket.reduce(
        (acc, o) => acc + Number(o.valor_mao_de_obra || 0),
        0
      );
      const receitaAutoPecas = osInBucket.reduce(
        (acc, o) =>
          acc +
          o.itens_os
            .filter((i) => !i.is_interno && !i.id_produto && !(i as any).id_pecas_estoque)
            .reduce((sum, i) => sum + Number(i.valor_total || 0), 0),
        0
      );
      const receitaEstoque = osInBucket.reduce(
        (acc, o) =>
          acc +
          o.itens_os
            .filter((i) => !i.is_interno && (i.id_produto || (i as any).id_pecas_estoque))
            .reduce((sum, i) => sum + Number(i.valor_total || 0), 0),
        0
      );
      const receitaTotal = receitaMaoDeObra + receitaAutoPecas + receitaEstoque;

      // Custos
      const custoAutoPecas = pgsPecasInBucket
        .filter((p) => !p.item_os.is_interno)
        .reduce((acc, p) => acc + Number(p.custo_real || 0), 0);
      const custoEstoque = osInBucket.reduce(
        (acc, o) =>
          acc +
          o.itens_os
            .filter((i) => !i.is_interno && (i.id_produto || (i as any).id_pecas_estoque))
            .reduce(
              (sum, i) =>
                sum +
                Number(i.quantidade || 0) *
                  Number(i.produto?.preco_custo_atual || (i as any).pecas_estoque?.valor_custo || 0),
              0
            ),
        0
      );

      // Prejuízos (uso interno)
      const prejuizoEstoque = osInBucket.reduce(
        (acc, o) =>
          acc +
          o.itens_os
            .filter((i) => i.is_interno && (i.id_produto || (i as any).id_pecas_estoque))
            .reduce(
              (sum, i) =>
                sum +
                Number(i.quantidade || 0) *
                  Number(i.produto?.preco_custo_atual || (i as any).pecas_estoque?.valor_custo || 0),
              0
            ),
        0
      );
      const prejuizoAutoPecas = pgsPecasInBucket
        .filter((p) => p.item_os.is_interno)
        .reduce((acc, p) => acc + Number(p.custo_real || 0), 0);
      const totalPrejuizos = prejuizoEstoque + prejuizoAutoPecas;

      // Despesas operacionais
      const despesasMaoDeObra = equipeInBucket.reduce(
        (acc, e) => acc + Number(e.valor_total || 0),
        0
      );

      let despesasOficinaContas = 0;

      contasInBucket.forEach((c) => {
        const val = Number(c.valor || 0);
        const catName = fixEncoding(
          c.categoria || c.categoria_financeira?.nome || "Sem Categoria"
        );
        const nameLower = catName.toLowerCase();
        const isFornecedor = 
          nameLower.startsWith("auto pecas") ||
          nameLower.startsWith("auto peças") ||
          CATEGORIAS_FORNECEDOR.includes(catName);

        if (!isFornecedor) {
          despesasOficinaContas += val;
        }
      });

      const despesaAutoPecas = pagamentosPecasCaixa.filter(
        (p) => p.data_pagamento_fornecedor && p.data_pagamento_fornecedor >= bStart && p.data_pagamento_fornecedor <= bEnd
      ).reduce((acc, p) => acc + Number(p.custo_real || 0), 0);

      const despesasOficina = despesasMaoDeObra + despesasOficinaContas;
      const totalDespesas = despesaAutoPecas + despesasOficina;

      // Lucro segmentado
      const lucroMaoDeObra = receitaMaoDeObra - despesasMaoDeObra;
      const lucroAutoPecas = receitaAutoPecas - custoAutoPecas;
      const lucroEstoque = receitaEstoque - custoEstoque;
      const lucroLiquidoTotal =
        lucroMaoDeObra +
        lucroAutoPecas +
        lucroEstoque -
        despesasOficinaContas -
        totalPrejuizos;

      const fluxoCaixaBruto = receitaTotal;
      const receitaOperacional = receitaMaoDeObra + (lucroAutoPecas > 0 ? lucroAutoPecas : 0) + (lucroEstoque > 0 ? lucroEstoque : 0);

      return {
        label: bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1),
        receita: receitaOperacional,
        fluxoCaixaBruto: fluxoCaixaBruto,
        despesa: totalDespesas,
        despesaOficina: despesasOficina,
        despesaAutoPecas: despesaAutoPecas,
        lucro: lucroLiquidoTotal,
        lucroMaoDeObra,
        lucroEstoque,
        lucroAutoPecas,
      };
    });
  }

  async getEvolucaoDespesasTemporal(
    startDate: Date,
    endDate: Date,
    type: "categoria" | "subcategoria",
    categoriaId?: number,
    subcategoriaId?: number
  ) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Monta filtro condicional de categoria para o Prisma
    let categoriaWhere: any = {};
    if (subcategoriaId !== undefined) {
      // Filtro exato: apenas esta subcategoria
      categoriaWhere = { id_categoria_financeira: subcategoriaId };
    } else if (categoriaId !== undefined) {
      // Filtro em árvore: categoria raiz OU qualquer filho direto
      categoriaWhere = {
        categoria_financeira: {
          OR: [
            { id_categoria_financeira: categoriaId },
            { id_parent: categoriaId },
          ],
        },
      };
    }

    // Busca contas a pagar no período com filtro de categoria
    const contas = await prisma.contasPagar.findMany({
      where: {
        OR: [
          {
            status: "PAGO",
            dt_pagamento: { gte: start, lte: end },
          },
          {
            status: "PENDENTE",
            dt_vencimento: { gte: start, lte: end },
          },
        ],
        deleted_at: null,
        ...categoriaWhere,
      },
      include: { categoria_financeira: { include: { parent: true } } },
    });

    // Exclui contas referentes a auto peças (apenas quando sem filtro de categoria específico)
    const contasFiltradas =
      categoriaId !== undefined || subcategoriaId !== undefined
        ? contas
        : contas.filter((c) => {
            const catName = fixEncoding(
              c.categoria || c.categoria_financeira?.nome || "Sem Categoria"
            );
            const nameLower = catName.toLowerCase();
            const isFornecedorOrAutoPecas =
              nameLower.startsWith("auto pecas") ||
              nameLower.startsWith("auto peças") ||
              CATEGORIAS_FORNECEDOR.includes(catName);
            return !isFornecedorOrAutoPecas;
          });

    // Gera buckets mensais dentro do período
    const buckets: { start: Date; end: Date; label: string }[] = [];
    let current = startOfMonth(start);
    const limit = endOfMonth(end);
    while (current <= limit) {
      buckets.push({
        start: startOfMonth(current),
        end: endOfMonth(current),
        label: format(current, "MMM/yy", { locale: ptBR }),
      });
      current = addMonths(current, 1);
    }

    const distinctKeys = new Set<string>();

    const data = buckets.map((bucket) => {
      const bStart = bucket.start;
      const bEnd = bucket.end;

      const contasInBucket = contasFiltradas.filter((c) => {
        const dateToCheck =
          c.status === "PAGO" ? c.dt_pagamento : c.dt_vencimento;
        return dateToCheck && dateToCheck >= bStart && dateToCheck <= bEnd;
      });

      const categoriesMap: Record<string, number> = {};

      contasInBucket.forEach((c) => {
        const val = Number(c.valor || 0);
        let catName = "";

        if (type === "categoria") {
          catName = fixEncoding(
            c.categoria_financeira?.parent?.nome ||
              c.categoria_financeira?.nome ||
              c.categoria ||
              "Outros"
          );
        } else {
          catName = fixEncoding(
            c.categoria_financeira?.nome || c.categoria || "Outros"
          );
        }

        if (catName && catName !== "Outros") {
          catName = catName.charAt(0).toUpperCase() + catName.slice(1);
        }

        categoriesMap[catName] = (categoriesMap[catName] || 0) + val;
        distinctKeys.add(catName);
      });

      return {
        mes: bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1),
        ...categoriesMap,
      };
    });

    return {
      data,
      keys: Array.from(distinctKeys),
    };
  }

  async checkPendingConsolidations(): Promise<{ hasPending: boolean; count: number }> {
    const pendentesCount = await prisma.ordemDeServico.count({
      where: {
        status: { in: ["ABERTA", "EM_ANDAMENTO", "PRONTO PARA FINANCEIRO", "FINANCEIRO", "FINALIZADA"] },
        deleted_at: null,
        fechamento_financeiro: {
          none: {} // OS que não possuem fechamento
        }
      }
    });

    return {
      hasPending: pendentesCount > 0,
      count: pendentesCount
    };
  }

  async getDashboardFinanceiro(startDate: Date, endDate: Date) {
    const receitasCaixa = await prisma.livroCaixa.aggregate({
      where: {
        tipo_movimentacao: "ENTRADA",
        dt_movimentacao: { gte: startDate, lte: endDate },
        deleted_at: null,
        NOT: {
          categoria: {
            in: ["CONCILIACAO_CARTAO", "TRANSFERENCIA", "AJUSTE_SALDO"],
          },
        },
      },
      _sum: { valor: true },
    });

    const despesasCaixa = await prisma.livroCaixa.aggregate({
      where: {
        tipo_movimentacao: "SAIDA",
        dt_movimentacao: { gte: startDate, lte: endDate },
      },
      _sum: { valor: true },
    });

    const receitaTotal = Number(receitasCaixa._sum.valor) || 0;
    const despesaTotal = Number(despesasCaixa._sum.valor) || 0;
    const lucroLiquido = receitaTotal - despesaTotal;
    const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

    const totalOS = await prisma.ordemDeServico.count({
      where: {
        dt_entrega: { gte: startDate, lte: endDate },
        status: "FINALIZADO",
      },
    });
    const ticketMedio = totalOS > 0 ? receitaTotal / totalOS : 0;

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

    if (categorias.length === 0) {
      categorias = [
        { name: "Peças", value: 0 },
        { name: "Pessoal", value: 0 },
        { name: "Infraestrutura", value: 0 },
      ];
    }

    return {
      kpis: {
        receita: receitaTotal,
        despesa: despesaTotal,
        lucro: lucroLiquido,
        margem: margemLucro,
        ticket: ticketMedio,
      },
      fluxo_caixa,
      categorias,
    };
  }

  async getRelatorioCompleto(start: Date, end: Date) {
    const osFinalizadas = await prisma.ordemDeServico.findMany({
      where: {
        status: "FINALIZADA",
        updated_at: { gte: start, lte: end },
      },
      include: {
        itens_os: {
          include: {
            produto: true,
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
    const evolucaoDiaria: Record<string, number> = {};

    for (const os of osFinalizadas) {
      const valorOs = Number(os.valor_final || 0);
      receitaBruta += valorOs;

      let custoPecasOs = 0;
      let lucroEstoqueOs = 0;
      let lucroPecasExternasOs = 0;

      for (const item of os.itens_os) {
        const valorVenda = Number(item.valor_venda) * item.quantidade;

        if (item.produto || (item as any).pecas_estoque) {
          const custo =
            Number(item.produto?.preco_custo_atual || (item as any).pecas_estoque?.valor_custo || 0) * item.quantidade;
          custoPecasOs += custo;
          lucroEstoqueOs += valorVenda - custo;
        } else {
          const pagPeca = item.pagamentos_peca[0];
          if (pagPeca) {
            const custoReal = Number(pagPeca.custo_real);
            custoPecasOs += custoReal;
            lucroPecasExternasOs += valorVenda - custoReal;
          } else {
            custoPecasOs += valorVenda;
          }
        }
      }

      custoPecasTotal += custoPecasOs;
      lucroEstoque += lucroEstoqueOs;
      lucroPecasExternas += lucroPecasExternasOs;

      for (const servico of os.servicos_mao_de_obra) {
        const valorServ = Number(servico.valor);
        maoDeObraTotal += valorServ;
        const cat = servico.categoria || "OUTROS";
        porCategoria[cat] = (porCategoria[cat] || 0) + valorServ;
      }

      const localDate = dayjs(os.updated_at).tz(TIMEZONE);
      const mesKey = localDate.format('YYYY-MM');
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

      const diaKey = localDate.format('YYYY-MM-DD');
      evolucaoDiaria[diaKey] =
        (evolucaoDiaria[diaKey] || 0) + Number(os.valor_final || 0);
    }

    const idsOs = osFinalizadas.map((o) => o.id_os);
    const recebiveis = await prisma.recebivelCartao.findMany({
      where: { id_os: { in: idsOs } },
    });
    const taxasCartaoTotal = recebiveis.reduce(
      (acc, curr) => acc + Number(curr.taxa_aplicada || 0),
      0,
    );

    const receitaLiquida = receitaBruta - custoPecasTotal - taxasCartaoTotal;
    const margem = receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0;
    const ticketMedio = osFinalizadas.length > 0 ? receitaBruta / osFinalizadas.length : 0;

    const osOrcamentos = await prisma.ordemDeServico.count({
      where: {
        status: "ORCAMENTO",
        dt_abertura: { gte: start, lte: end },
      },
    });
    const taxaConversao = osOrcamentos > 0 ? (osFinalizadas.length / osOrcamentos) * 100 : 0;

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

    const rankingEquipe = await Promise.all(
      servicosPorFuncionario.map(async (servico) => {
        const func = funcionarios.find(
          (f) => f.id_funcionario === servico.id_funcionario,
        );

        const osDoFuncionario = await prisma.ordemDeServico.findMany({
          where: {
            id_funcionario: servico.id_funcionario,
            status: "FINALIZADA",
            updated_at: { gte: start, lte: end },
          },
          include: {
            itens_os: {
              include: {
                produto: true,
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

            if (item.produto || (item as any).pecas_estoque) {
              const custo =
                Number(item.produto?.preco_custo_atual || (item as any).pecas_estoque?.valor_custo || 0) * item.quantidade;
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

    interface FornecedorResult {
      id_pessoa: number | null;
      sum: number;
      cnt: number;
    }
    const entradasPorFornecedor = await prisma.$queryRaw<FornecedorResult[]>`
      SELECT id_pessoa, SUM(quantidade * custo_unitario) as sum, COUNT(id_movimentacao) as cnt
      FROM movimentacao_estoque
      WHERE tipo = 'ENTRADA' AND data_movimentacao >= ${start} AND data_movimentacao <= ${end} AND id_pessoa IS NOT NULL
      GROUP BY id_pessoa
    `;

    const fornecedores = await prisma.pessoa.findMany({
      where: {
        is_fornecedor: true,
        id_pessoa: {
          in: entradasPorFornecedor.map((e: any) => Number(e.id_pessoa)).filter((id: number) => !isNaN(id)),
        },
      },
    });

    const rankingFornecedores = entradasPorFornecedor
      .map((entrada: any) => {
        const forn = fornecedores.find(
          (f: any) => f.id_pessoa === Number(entrada.id_pessoa),
        );
        return {
          nome: forn?.nome || "Desconhecido",
          totalCompras: Number(entrada.sum || 0),
          quantidadeCompras: Number(entrada.cnt || 0),
        };
      })
      .sort((a: any, b: any) => b.totalCompras - a.totalCompras)
      .slice(0, 10);

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
          in: recebiveisPorOperadora.map((r) => r.id_operadora).filter((id): id is number => id !== null),
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

    const livroCaixa = await prisma.livroCaixa.findMany({
      where: {
        dt_movimentacao: { gte: start, lte: end },
        deleted_at: null,
      },
      orderBy: { dt_movimentacao: "desc" },
      take: 100,
    });

    return {
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
        evolucaoDiaria: Object.entries(evolucaoDiaria)
          .map(([dia, valor]) => ({
            dia,
            valor,
          }))
          .sort((a, b) => a.dia.localeCompare(b.dia)),
      },
      ranking: {
        equipe: rankingEquipe,
        fornecedores: rankingFornecedores,
      },
      operadoras: analiseOperadoras,
      livroCaixa,
    };
  }

  async getDashboardData(start: Date, end: Date) {
    const osFinalizadas = await prisma.ordemDeServico.findMany({
      where: {
        status: "FINALIZADA",
        updated_at: { gte: start, lte: end },
      },
      include: {
        itens_os: {
          include: {
            produto: true,
            pagamentos_peca: true,
          },
        },
        servicos_mao_de_obra: {
          include: {
            funcionario: {
              include: {
                pessoa_fisica: {
                  include: { pessoa: true },
                },
              },
            },
          },
        },
      },
    });

    const despesas = await prisma.livroCaixa.findMany({
      where: {
        tipo_movimentacao: "SAIDA",
        dt_movimentacao: { gte: start, lte: end },
      },
    });

    let receitaBruta = 0;
    let receitaMaoDeObra = 0;
    let receitaPecas = 0;
    let custoPecas = 0;

    const performanceMecanicos: Record<string, number> = {};
    const servicosMaisVendidos: Record<string, number> = {};
    const categoriasDespesa: Record<string, number> = {};

    for (const os of osFinalizadas) {
      receitaBruta += Number(os.valor_final || 0);

      for (const item of os.itens_os) {
        const vlrVenda = Number(item.valor_venda) * item.quantidade;
        receitaPecas += vlrVenda;

        if (item.produto || (item as any).pecas_estoque) {
          custoPecas +=
            Number(item.produto?.preco_custo_atual || (item as any).pecas_estoque?.valor_custo || 0) * item.quantidade;
        } else if (item.pagamentos_peca?.[0]) {
          custoPecas += Number(item.pagamentos_peca[0].custo_real);
        } else {
          custoPecas += vlrVenda * 0.7;
        }
      }

      for (const serv of os.servicos_mao_de_obra) {
        const vlrServ = Number(serv.valor);
        receitaMaoDeObra += vlrServ;

        let mecName = "Outros";
        if (serv.funcionario) {
          if (serv.funcionario.nome_fantasia)
            mecName = serv.funcionario.nome_fantasia;
          else if (serv.funcionario.pessoa_fisica?.pessoa?.nome)
            mecName = serv.funcionario.pessoa_fisica.pessoa.nome;
        }

        performanceMecanicos[mecName] =
          (performanceMecanicos[mecName] || 0) + vlrServ;

        const servName = serv.descricao || "Serviço Geral";
        servicosMaisVendidos[servName] =
          (servicosMaisVendidos[servName] || 0) + 1;
      }
    }

    let totalDespesas = 0;
    for (const d of despesas) {
      const val = Number(d.valor);
      totalDespesas += val;
      const cat = d.categoria || "Outros";
      categoriasDespesa[cat] = (categoriasDespesa[cat] || 0) + val;
    }

    const lucroReal = receitaBruta - custoPecas - totalDespesas;
    const pontoEquilibrio = totalDespesas;

    const rankingMecanicos = Object.entries(performanceMecanicos)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const rankingServicos = Object.entries(servicosMaisVendidos)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const categoriasChart = Object.entries(categoriasDespesa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      kpis: {
        faturamentoBruto: receitaBruta,
        faturamentoMaoDeObra: receitaMaoDeObra,
        faturamentoPecas: receitaPecas,
        lucroReal,
        pontoEquilibrio,
        totalDespesas,
        custoPecas,
      },
      charts: {
        performanceMecanicos: rankingMecanicos,
        servicosMaisVendidos: rankingServicos,
        categoriasDespesa: categoriasChart,
      },
    };
  }
}
