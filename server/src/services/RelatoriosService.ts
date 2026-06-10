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
import { RelatoriosRepository } from "../repositories/relatorios.repository.js";

const relatoriosRepository = new RelatoriosRepository();

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
    return await relatoriosRepository.getResumoFinanceiro(startDate, endDate);
  }

  /**
   * Evolução de Despesas Temporal baseada em Categoria/Subcategoria e filtro global de datas
   */
  async getEvolucaoDespesasTemporal(
    startDate: Date,
    endDate: Date,
    type: "categoria" | "subcategoria",
    categoriaId?: number,
    subcategoriaId?: number
  ) {
    return await relatoriosRepository.getEvolucaoDespesasTemporal(
      startDate,
      endDate,
      type,
      categoriaId,
      subcategoriaId
    );
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
    return await relatoriosRepository.getEvolucaoMensal(startDate, endDate, groupBy);
  }

  /**
   * Verifica se existem OSs finalizadas pendentes de consolidação
   */
  async checkPendingConsolidations() {
    return await relatoriosRepository.checkPendingConsolidations();
  }
}

export const relatoriosService = new RelatoriosService();
