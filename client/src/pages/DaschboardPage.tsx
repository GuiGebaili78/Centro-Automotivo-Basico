import { useEffect, useState } from "react";
import {
  Plus,
  Wrench,
  CreditCard,
  Wallet,
  Package,
  CheckCircle,
  Clock,
} from "lucide-react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
// import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";

// Enhanced StatCard to support complex displays (e.g. Red/Yellow counts)
interface StatCardProps {
  title: string;
  icon: any;
  onClick: () => void;
  color: {
    bg: string;
    text: string;
  };
  // Option 1: Simple Value
  value?: string | number;
  subtext?: string;
  // Option 2: Complex Content (e.g. Broken down stats)
  children?: React.ReactNode;
}

const StatCard = ({
  title,
  icon: Icon,
  onClick,
  color,
  value,
  subtext,
  children,
}: StatCardProps) => (
  <div
    onClick={onClick}
    className="bg-white p-2 rounded-xl shadow-sm border border-neutral-200 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 group h-20 w-56 flex flex-col justify-center items-center"
  >
    <div className="flex items-center gap-1.5 mb-0.5">
      <div className={`p-1.5 rounded-lg ${color.bg} ${color.text}`}>
        <Icon size={16} />
      </div>
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest truncate">
        {title}
      </p>
    </div>

    <div className="mt-0 flex flex-col items-center text-center">
      {children ? (
        children
      ) : (
        <>
          <h3 className={`text-lg font-black text-neutral-800 leading-none`}>
            {value}
          </h3>
          {subtext && (
            <p className="text-xs text-neutral-400 font-bold uppercase mt-1">
              {subtext}
            </p>
          )}
        </>
      )}
    </div>
  </div>
);

import { UnifiedSearch } from "../components/dashboard/UnifiedSearch";
import { ServiceDecisionModal } from "../components/modals/ServiceDecisionModal";
import { DashboardCalendar } from "../components/dashboard/DashboardCalendar";

// ... existing imports ...

export function DaschboardPage() {
  const navigate = useNavigate();
  // ... existing state ...

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<any>(null);

  // ... fetch logic ...

  const handleSearchResultSelect = (result: any) => {
    setSelectedSearch(result);
    setDecisionModalOpen(true);
  };

  const handleNewRecord = () => {
    navigate("/novo-cadastro");
  };

  const handleDecisionOpenOS = async () => {
    // Create OS with status ABERTA
    // Actually we just navigate to OS creation page with pre-filled items or POST directly?
    // Since we don't have a direct "create blank OS" endpoint that returns ID without form usually,
    // check if we can navigate to URL that auto-creates or pre-fills.
    // Based on CadastroUnificado, we navigate to: /ordem-de-servico?clientId=...&vehicleId=...

    if (!selectedSearch) return;

    const url = `/ordem-de-servico?clientId=${selectedSearch.id_cliente}${selectedSearch.id_veiculo ? `&vehicleId=${selectedSearch.id_veiculo}` : ""}`;
    // Note: If OrdemDeServicoPage handles this query params to open a "New OS" modal or form, we use it.
    // Assuming it does based on previous context.
    navigate(url);
    setDecisionModalOpen(false);
  };

  const handleDecisionSchedule = async () => {
    // "Agendamento / Orçamento"
    // We need to create an OS with status 'ORCAMENTO' (or 'AGENDA' if preferred, plan said ORCAMENTO is status).
    // If the current OS creation flow defaults to ABERTA, we might need a specific param like `&status=ORCAMENTO`.

    if (!selectedSearch) return;

    const url = `/ordem-de-servico?clientId=${selectedSearch.id_cliente}${selectedSearch.id_veiculo ? `&vehicleId=${selectedSearch.id_veiculo}` : ""}&initialStatus=ORCAMENTO`;
    navigate(url);
    setDecisionModalOpen(false);
  };

  const [recentOss, setRecentOss] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<
    "HOJE" | "SEMANA" | "MES" | "STATUS"
  >("STATUS");

  const [stats, setStats] = useState({
    osAberta: 0,
    contasPagarPending: 0,
    contasPagarOverdue: 0,
    livroCaixaEntries: 0,
    livroCaixaExits: 0,
    autoPecasPendentes: 0,
    consolidacao: 0,
  });

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    fetchData();

    // Atualizar data/hora a cada segundo
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
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
      // Note: We assume only Client Payments generate 'AUTOMATICA' Inflows (category 'VENDA').
      // So filtering manualInflows by 'MANUAL' avoids double counting.
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
          o.status === "PRONTO PARA FINANCEIRO" && !o.fechamento_financeiro,
      ).length;

      setStats({
        osAberta,
        contasPagarPending,
        contasPagarOverdue,
        livroCaixaEntries: todayEntries,
        livroCaixaExits: todayExits,
        autoPecasPendentes,
        consolidacao,
      });

      setRecentOss(oss);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    }
  };

  const getFilteredRecentServices = () => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    let filtered = recentOss;

    if (filterPeriod !== "STATUS") {
      filtered = recentOss.filter((os) => {
        const dateRef = os.updated_at
          ? new Date(os.updated_at)
          : new Date(os.dt_abertura);
        if (filterPeriod === "HOJE") {
          if (os.status === "ABERTA") return true;
          return dateRef >= startOfToday;
        } else if (filterPeriod === "SEMANA") {
          const weekAgo = new Date(startOfToday);
          weekAgo.setDate(startOfToday.getDate() - 7);
          if (os.status === "ABERTA") return true;
          return dateRef >= weekAgo;
        } else {
          // MES
          const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (os.status === "ABERTA") return true;
          return dateRef >= firstDayMonth;
        }
      });
    }

    return filtered.sort((a, b) => {
      if (filterPeriod === "STATUS") {
        const priority: Record<string, number> = {
          ABERTA: 1,
          EM_ANDAMENTO: 1,
          "PRONTO PARA FINANCEIRO": 2,
          finalizada: 3,
          FINALIZADA: 3,
          PAGA_CLIENTE: 4,
        };
        const pA = priority[a.status] || 99;
        const pB = priority[b.status] || 99;
        if (pA !== pB) return pA - pB;
      }
      const dateA = a.updated_at
        ? new Date(a.updated_at).getTime()
        : new Date(a.dt_abertura).getTime();
      const dateB = b.updated_at
        ? new Date(b.updated_at).getTime()
        : new Date(b.dt_abertura).getTime();
      return dateB - dateA;
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "FINALIZADA":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
      case "PAGA_CLIENTE":
        return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
      case "PRONTO PARA FINANCEIRO":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
      case "ABERTA":
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
      case "EM_ANDAMENTO":
        return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
      default:
        return "bg-gray-50 text-gray-500 ring-1 ring-gray-200";
    }
  };

  const filteredServices = getFilteredRecentServices();

  const getFilterButtonClass = (isActive: boolean) =>
    `px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
      isActive
        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
        : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          {/* Title / Welcome */}
          <div className="shrink-0">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Monitor
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {currentDateTime.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              •{" "}
              {currentDateTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>

          {/* Search & Actions - MOVED TO MIDDLE */}
          <div className="flex-1 w-full xl:max-w-xl mx-auto flex items-center gap-3 order-2">
            <div className="flex-1">
              <UnifiedSearch
                onSelect={handleSearchResultSelect}
                onNewRecord={handleNewRecord}
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              icon={Plus}
              className="h-[42px] px-4 shadow-lg shadow-primary-500/20 whitespace-nowrap"
              onClick={() => {
                const input = document.querySelector(
                  "input[placeholder*='Buscar por Placa']",
                );
                if (input) (input as HTMLElement).focus();
              }}
            >
              Nova OS
            </Button>
          </div>

          {/* Stats 2x2 Grid - MOVED TO RIGHT */}
          <div className="grid grid-cols-2 gap-2 shrink-0 order-3">
            <StatCard
              title="Contas a Pagar"
              color={{
                bg: "bg-red-50",
                text: "text-red-600",
              }}
              icon={CreditCard}
              onClick={() => navigate("/financeiro/contas-pagar")}
            >
              <div className="flex justify-between items-center w-full px-1 gap-2">
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-black text-blue-600">
                    {stats.contasPagarPending}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                    Pend
                  </p>
                </div>
                <div className="h-5 w-px bg-neutral-200"></div>
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-black text-red-600">
                    {stats.contasPagarOverdue}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                    Atras
                  </p>
                </div>
              </div>
            </StatCard>
            <StatCard
              title="Mov. de Caixa"
              value={stats.livroCaixaEntries + stats.livroCaixaExits}
              color={{
                bg: "bg-neutral-100",
                text: "text-neutral-600",
              }}
              icon={Wallet}
              onClick={() => navigate("/financeiro/livro-caixa")}
              subtext={`E:${stats.livroCaixaEntries} | S:${stats.livroCaixaExits}`}
            />
            <StatCard
              title="Auto Peças"
              value={stats.autoPecasPendentes}
              color={{
                bg: "bg-orange-50",
                text: "text-orange-600",
              }}
              icon={Package}
              onClick={() => navigate("/financeiro/pagamento-pecas")}
              subtext="Pendentes"
            />
            <StatCard
              title="Consolidação"
              value={stats.consolidacao}
              color={{
                bg: "bg-emerald-50",
                text: "text-emerald-600",
              }}
              icon={CheckCircle}
              onClick={() => navigate("/fechamento-financeiro")}
              subtext="Aguardando"
            />
          </div>
        </div>

        <main className="animate-in fade-in duration-500 space-y-4">
          {/* Stats Grid Removed from Body - Moved to Header */}

          <DashboardCalendar
            items={recentOss
              .filter(
                (o: any) => o.status === "ORCAMENTO" || o.status === "AGENDA",
              )
              .map((o: any) => ({
                id_os: o.id_os,
                date: o.dt_abertura
                  ? new Date(o.dt_abertura)
                  : o.created_at
                    ? new Date(o.created_at)
                    : new Date(),
                clientName:
                  o.cliente?.pessoa_fisica?.pessoa?.nome ||
                  o.cliente?.pessoa_juridica?.nome_fantasia ||
                  "Cliente",
                vehicleModel: `${o.veiculo?.modelo || "N/I"} ${o.veiculo?.cor ? `- ${o.veiculo.cor}` : ""}`,
                status: o.status,
              }))}
          />

          {/* Recent Services - FULL WIDTH */}
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
              <h2 className="text-sm font-bold text-neutral-700 tracking-tight flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Atividade Recente (OS)
              </h2>

              {/* Date Tabs */}
              <div className="flex bg-neutral-100 p-1 rounded-lg">
                {["HOJE", "SEMANA", "MES", "STATUS"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPeriod(p as any)}
                    className={getFilterButtonClass(filterPeriod === p)}
                  >
                    {p === "MES" ? "Mês" : p}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="tabela-limpa w-full">
                <thead>
                  <tr>
                    <th className="w-[15%]">Data / OS</th>
                    <th className="w-[20%]">Veículo</th>
                    <th className="w-[25%]">Diagnóstico / Defeito</th>
                    <th className="w-[15%]">Colaborador</th>
                    <th className="w-[15%]">Cliente</th>
                    <th className="w-[10%] text-center">Status</th>
                    <th className="w-[10%] text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-12 text-center text-neutral-400 font-medium italic"
                      >
                        Nenhuma atualização neste período.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((os: any) => (
                      <tr
                        key={os.id_os}
                        onClick={() =>
                          navigate(
                            os.status === "PRONTO PARA FINANCEIRO"
                              ? `/fechamento-financeiro?id_os=${os.id_os}`
                              : `/ordem-de-servico?id=${os.id_os}`,
                          )
                        }
                        className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-neutral-700 bg-neutral-100 px-1.5 rounded w-fit mb-1">
                              #{os.id_os}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-600">
                                {new Date(os.dt_abertura).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-medium">
                                {new Date(os.dt_abertura).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-800 text-xs uppercase">
                              {os.veiculo?.modelo || "Modelo N/I"}
                            </span>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase mt-0.5">
                              {os.veiculo?.placa || "---"}
                            </span>
                            {os.veiculo?.cor && (
                              <span className="text-[9px] text-neutral-400">
                                {os.veiculo.cor}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-medium text-neutral-600 line-clamp-2 leading-relaxed">
                            {os.diagnostico || os.defeito_relatado || (
                              <span className="text-neutral-300 italic">
                                ---
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const mechanics = os.servicos_mao_de_obra
                                ?.map(
                                  (s: any) =>
                                    s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(
                                      " ",
                                    )[0],
                                )
                                .filter(Boolean);
                              const uniqueMechanics = [
                                ...new Set(mechanics || []),
                              ];
                              if (uniqueMechanics.length > 0)
                                return uniqueMechanics.map(
                                  (mech: any, i: number) => (
                                    <span
                                      key={i}
                                      className="text-[9px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded uppercase"
                                    >
                                      {mech}
                                    </span>
                                  ),
                                );
                              return (
                                <span className="text-neutral-300 text-xs">
                                  ---
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-700 text-xs truncate max-w-[120px]">
                              {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                                os.cliente?.pessoa_juridica?.razao_social ||
                                "Desconhecido"}
                            </span>
                            {os.cliente?.telefone_1 && (
                              <span className="text-[10px] text-neutral-400">
                                {os.cliente.telefone_1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap ring-1 ${getStatusStyle(
                              os.status,
                            )}`}
                          >
                            {os.status === "PRONTO PARA FINANCEIRO"
                              ? "FINANCEIRO"
                              : os.status === "ORCAMENTO"
                                ? "AGENDAMENTO"
                                : os.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                os.status === "PRONTO PARA FINANCEIRO"
                                  ? `/fechamento-financeiro?id_os=${os.id_os}`
                                  : `/ordem-de-servico?id=${os.id_os}`,
                              );
                            }}
                            variant="secondary"
                            size="sm"
                            icon={Wrench}
                          >
                            Gerenciar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      <ServiceDecisionModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onOpenOS={handleDecisionOpenOS}
        onSchedule={handleDecisionSchedule}
        clientName={selectedSearch?.display}
        vehicleName={selectedSearch?.subtext}
      />
    </div>
  );
}
