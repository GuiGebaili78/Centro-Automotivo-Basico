import { api } from "./api";
import { OsStatus } from "../types/os.types";
import type { IDashboardData, IDashboardStats } from "../types/dashboard.types";

export const DashboardService = {
  getDashboardData: async (): Promise<IDashboardData> => {
    const [osRes, contasRes, pagPecaRes, pagCliRes, livroRes] =
      await Promise.all([
        api.get("/ordem-de-servico"),
        api.get("/contas-pagar"),
        api.get("/pagamento-peca"),
        api.get("/pagamento-cliente"),
        api.get("/livro-caixa"),
      ]);

    const oss = osRes.data;
    const contas = contasRes.data;
    // BREAKING CHANGE: API now returns { data: [...], pagination: {...} }
    const pagPecas = pagPecaRes.data?.data || pagPecaRes.data || [];
    const pagClients = pagCliRes.data;
    const manualEntries = livroRes.data;

    // 1. Serviços em Aberto
    const osAberta = oss.filter(
      (o: any) => o.status === "ABERTA" || o.status === "EM_ANDAMENTO",
    ).length;

    // 2. Contas a Pagar (Split Logic)
    const now = new Date();
    /* 
         Fix: Ensure we compare just the DATE part ignoring time.
         'dt_vencimento' often comes as ISO string. 
         We'll use local comparison or simpler string calc.
      */
    const todayStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD

    const contasPagarPending = contas.filter((c: any) => {
      if (c.status !== "PENDENTE") return false;
      // Check if NOT overdue (vencimento >= today)
      // Note: dt_vencimento string often is YYYY-MM-DDT...
      const venc = c.dt_vencimento.split("T")[0];
      return venc >= todayStr;
    }).length;

    const contasPagarOverdue = contas.filter((c: any) => {
      if (c.status !== "PENDENTE") return false;
      const venc = c.dt_vencimento.split("T")[0];
      return venc < todayStr;
    }).length;

    const isToday = (dateStr: string) => {
      if (!dateStr) return false;
      const todayLocal = new Date().toLocaleDateString("en-CA");

      // 1. Try standard local conversion
      if (new Date(dateStr).toLocaleDateString("en-CA") === todayLocal)
        return true;

      // 2. Try raw string match (fixes UTC Midnight issue where local conversion shifts to yesterday)
      // e.g. "2024-01-21T00:00..." starts with "2024-01-21"
      if (dateStr.startsWith(todayLocal)) return true;

      return false;
    };

    // Auto Inflows (Clients) + Manual Inflows.
    const autoInflows = pagClients.filter(
      (p: any) => isToday(p.data_pagamento) && !p.deleted_at,
    ).length;

    const manualInflows = manualEntries.filter(
      (m: any) =>
        isToday(m.dt_movimentacao) &&
        m.tipo_movimentacao === "ENTRADA" &&
        !m.deleted_at &&
        m.origem === "MANUAL" && // Only count strictly manual inflows here
        m.categoria !== "CONCILIACAO_CARTAO",
    ).length;

    const todayEntries = autoInflows + manualInflows;

    // Auto Outflows (Parts) + Other Outflows (Bills/Manual).
    const autoOutflows = pagPecas.filter((p: any) => {
      if (!p.pago_ao_fornecedor) return false;
      if (!p.data_pagamento_fornecedor) return false;
      return isToday(p.data_pagamento_fornecedor) && !p.deleted_at;
    }).length;

    const manualOutflows = manualEntries.filter(
      (m: any) =>
        isToday(m.dt_movimentacao) &&
        m.tipo_movimentacao === "SAIDA" &&
        !m.deleted_at &&
        m.categoria !== "CONCILIACAO_CARTAO" &&
        // Exclude "Auto Peças" because they are counted in 'autoOutflows'
        // But KEEP other AUTOMATICA (e.g. Bills) and MANUAL
        !(m.origem === "AUTOMATICA" && m.categoria === "Auto Peças"),
    ).length;

    const todayExits = autoOutflows + manualOutflows;

    const autoPecasPendentes = pagPecas.filter(
      (p: any) => !p.pago_ao_fornecedor && !p.deleted_at,
    ).length;

    const consolidacao = oss.filter(
      (o: any) =>
        (o.status === OsStatus.FINANCEIRO ||
          o.status === "PRONTO PARA FINANCEIRO") &&
        !o.fechamento_financeiro,
    ).length;

    const stats: IDashboardStats = {
      osAberta,
      contasPagarPending,
      contasPagarOverdue,
      livroCaixaEntries: todayEntries,
      livroCaixaExits: todayExits,
      autoPecasPendentes,
      consolidacao,
    };

    return {
      stats,
      recentOss: oss,
    };
  },
};
