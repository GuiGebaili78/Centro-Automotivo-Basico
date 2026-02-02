import { useEffect, useState } from "react";
import {
  Plus,
  Wrench,
  CreditCard,
  Wallet,
  Package,
  CheckCircle,
} from "lucide-react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

// Updated StatCard to match "Summary Card" style from MovimentacoesTab
const StatCard = ({
  title,
  value,
  color,
  icon: Icon,
  onClick,
  subtext,
}: any) => (
  <div
    onClick={onClick}
    className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
  >
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color.bg} ${color.text}`}>
          <Icon size={20} />
        </div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          {title}
        </p>
      </div>

      <div className="mt-2">
        <h3
          className={`text-3xl font-bold ${color.textValue || "text-neutral-900"}`}
        >
          {value}
        </h3>
        {subtext && (
          <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">
            {subtext}
          </p>
        )}
      </div>
    </div>
  </div>
);

export function DaschboardPage() {
  const navigate = useNavigate();
  const [recentOss, setRecentOss] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<
    "HOJE" | "SEMANA" | "MES" | "STATUS"
  >("HOJE");

  const [stats, setStats] = useState({
    osAberta: 0,
    contasPagar: 0,
    livroCaixaEntries: 0,
    livroCaixaExits: 0,
    autoPecasPendentes: 0,
    consolidacao: 0,
  });

  useEffect(() => {
    fetchData();
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
      const pagPecas = pagPecaRes.data;
      const pagClients = pagCliRes.data;
      const manualEntries = livroRes.data;

      // 1. Serviços em Aberto
      const osAberta = oss.filter(
        (o: any) => o.status === "ABERTA" || o.status === "EM_ANDAMENTO",
      ).length;

      // 2. Contas a Pagar (Geral) -> Status PENDENTE
      const contasPagar = contas.filter(
        (c: any) => c.status === "PENDENTE",
      ).length;

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
        contasPagar,
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
        ? "bg-primary-200 text-primary-500 shadow-sm"
        : "text-neutral-500 hover:text-neutral-700 hover:bg-white"
    }`;

  return (
    <div className="w-full mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-600 tracking-tight">
            Visão Geral
          </h1>
          <p className="text-neutral-500">Acompanhamento diário da oficina.</p>
        </div>
        <span className="text-sm font-bold text-neutral-400 bg-neutral-100 px-3 py-1 rounded-lg uppercase">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Serviços Abertos"
          value={stats.osAberta}
          color={{
            bg: "bg-blue-50",
            text: "text-blue-600",
            textValue: "text-blue-600",
          }}
          icon={Wrench}
          onClick={() => navigate("/ordem-de-servico")}
          subtext="Em produção"
        />
        <StatCard
          title="Contas a Pagar"
          value={stats.contasPagar}
          color={{
            bg: "bg-red-50",
            text: "text-red-600",
            textValue: "text-red-600",
          }}
          icon={CreditCard}
          onClick={() => navigate("/financeiro/contas-pagar")}
          subtext="Geral / Fixas"
        />
        <StatCard
          title="Mov. de Caixa"
          value={stats.livroCaixaEntries + stats.livroCaixaExits}
          color={{
            bg: "bg-neutral-100",
            text: "text-neutral-600",
            textValue: "text-neutral-800",
          }}
          icon={Wallet}
          onClick={() => navigate("/financeiro/livro-caixa")}
          subtext={`Ent: ${stats.livroCaixaEntries} | Sai: ${stats.livroCaixaExits}`}
        />
        <StatCard
          title="Auto Peças"
          value={stats.autoPecasPendentes}
          color={{
            bg: "bg-orange-50",
            text: "text-orange-600",
            textValue: "text-orange-600",
          }}
          icon={Package}
          onClick={() => navigate("/financeiro/pagamento-pecas")}
          subtext="Pendentes Pagto"
        />
        <StatCard
          title="Consolidação"
          value={stats.consolidacao}
          color={{
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            textValue: "text-emerald-600",
          }}
          icon={CheckCircle}
          onClick={() => navigate("/fechamento-financeiro")}
          subtext="Aguardando Financ."
        />
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate("/ordem-de-servico?new=true")}
          variant="primary"
          size="lg"
          icon={Plus}
          className="shadow-lg shadow-primary-500/20"
        >
          Nova Ordem de Serviço
        </Button>
      </div>

      {/* Recent Services - FULL WIDTH */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Ordens de Serviços Recentes
          </h2>

          {/* Date Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-xl">
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
          <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                  OS / Data
                </th>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                  Veículo
                </th>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                  Diagnóstico
                </th>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                  Colaborador
                </th>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                  Cliente
                </th>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest text-center">
                  Status
                </th>
                <th className="p-4 text-[10px] font-bold uppercase text-neutral-400 tracking-widest text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredServices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                      <div className="font-bold text-neutral-800">
                        #{os.id_os}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-bold">
                        {new Date(os.dt_abertura).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-700 uppercase text-xs">
                          {os.veiculo?.modelo || "Modelo N/I"}{" "}
                          {os.veiculo?.cor ? os.veiculo.cor : ""}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">
                          {os.veiculo?.placa || "---"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 max-w-[250px]">
                      <p className="text-xs font-medium text-neutral-600 line-clamp-1">
                        {os.diagnostico || os.defeito_relatado || (
                          <span className="text-neutral-300 italic">---</span>
                        )}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-[10px] font-bold text-neutral-600 uppercase">
                        {(() => {
                          const mechanics = os.servicos_mao_de_obra
                            ?.map(
                              (s: any) =>
                                s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(
                                  " ",
                                )[0],
                            )
                            .filter(Boolean);
                          const uniqueMechanics = [...new Set(mechanics || [])];
                          if (uniqueMechanics.length > 0)
                            return uniqueMechanics.join(", ");
                          return <span className="text-neutral-300">---</span>;
                        })()}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-neutral-700 text-xs truncate max-w-[150px]">
                        {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                          os.cliente?.pessoa_juridica?.razao_social}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-medium">
                        {os.cliente?.telefone_1 || ""}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${getStatusStyle(os.status)}`}
                      >
                        {os.status === "PRONTO PARA FINANCEIRO"
                          ? "FINANCEIRO"
                          : os.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          navigate(`/ordem-de-servico?id=${os.id_os}`);
                        }}
                        variant="secondary"
                        size="sm"
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
      </div>
    </div>
  );
}
