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
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

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

    // Receita de Peças de Terceiros (Auto Peças) - is_interno = false, id_pecas_estoque = null
    const itensExternos = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_pecas_estoque: null,
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
    });
    const receitaAutoPecas = itensExternos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);

    // Receita de Peças de Estoque - is_interno = false, id_pecas_estoque != null
    const itensEstoque = await prisma.itensOs.findMany({
      where: {
        is_interno: false,
        id_pecas_estoque: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
    });
    const receitaEstoque = itensEstoque.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
    const receitaTotal = receitaMaoDeObra + receitaAutoPecas + receitaEstoque;

    // ─── 2. CUSTOS DE PRODUTOS VENDIDOS (CPV) ───
    // Custo de compra das Peças Externas (Auto Peças)
    const custoAutoPecasAgg = await prisma.pagamentoPeca.aggregate({
      where: {
        deleted_at: null,
        item_os: {
          is_interno: false,
          id_pecas_estoque: null,
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
        id_pecas_estoque: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
      include: { pecas_estoque: true },
    });
    const custoEstoque = itensEstoqueComDetalhe.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.pecas_estoque?.valor_custo || 0),
      0
    );

    // ─── 3. PREJUÍZOS (Consumo Interno de Peças / Custo Oficina) ───
    // Custo de Peças de Estoque para Uso Interno
    const itensInternosEstoque = await prisma.itensOs.findMany({
      where: {
        is_interno: true,
        id_pecas_estoque: { not: null },
        deleted_at: null,
        ordem_de_servico: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          updated_at: { gte: start, lte: end },
        },
      },
      include: { pecas_estoque: true },
    });
    const prejuizoEstoque = itensInternosEstoque.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.pecas_estoque?.valor_custo || 0),
      0
    );

    // Custo de Peças Externas para Uso Interno
    const custoInternoExternoAgg = await prisma.pagamentoPeca.aggregate({
      where: {
        deleted_at: null,
        item_os: {
          is_interno: true,
          id_pecas_estoque: null,
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
    const lucroAutoPecas = receitaAutoPecas - custoAutoPecas;
    const lucroEstoque = receitaEstoque - custoEstoque;

    // Lucro Líquido Total = Lucros operacionais de segmentos - despesas oficina comuns - prejuízos internos
    const lucroLiquidoTotal = lucroMaoDeObra + lucroAutoPecas + lucroEstoque - despesasOficinaContas - totalPrejuizos;

    const medias = {
      receitaBruta: receitaTotal / diffMeses,
      lucroLiquido: lucroLiquidoTotal / diffMeses,
      despesasTotais: totalDespesas / diffMeses,
    };

    return {
      periodo: { start, end },
      bruta: {
        maoDeObra: receitaMaoDeObra,
        autoPecas: receitaAutoPecas,
        estoque: receitaEstoque,
        receitaPecas: receitaAutoPecas + receitaEstoque,
        receitaServicos: receitaMaoDeObra,
        total: receitaTotal,
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
        margemLiquida: receitaTotal > 0 ? (lucroLiquidoTotal / receitaTotal) * 100 : 0,
        pontoEquilibrio: totalDespesas,
      },
    };
  }

  async getEvolucaoMensal(
    startDate: Date,
    endDate: Date,
    groupBy: "month" | "quarter" | "semester" | "year" = "month"
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
          include: { pecas_estoque: true },
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

    if (groupBy === "month") {
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
            .filter((i) => !i.is_interno && !i.id_pecas_estoque)
            .reduce((sum, i) => sum + Number(i.valor_total || 0), 0),
        0
      );
      const receitaEstoque = osInBucket.reduce(
        (acc, o) =>
          acc +
          o.itens_os
            .filter((i) => !i.is_interno && i.id_pecas_estoque)
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
            .filter((i) => !i.is_interno && i.id_pecas_estoque)
            .reduce(
              (sum, i) =>
                sum +
                Number(i.quantidade || 0) *
                  Number(i.pecas_estoque?.valor_custo || 0),
              0
            ),
        0
      );

      // Prejuízos (uso interno)
      const prejuizoEstoque = osInBucket.reduce(
        (acc, o) =>
          acc +
          o.itens_os
            .filter((i) => i.is_interno && i.id_pecas_estoque)
            .reduce(
              (sum, i) =>
                sum +
                Number(i.quantidade || 0) *
                  Number(i.pecas_estoque?.valor_custo || 0),
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

      return {
        label: bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1),
        receita: receitaTotal,
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
}
