import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { getStatusStyle } from "../utils/osUtils";
import { FinanceiroService } from "../services/financeiro.service";
import { ColaboradorService } from "../services/colaborador.service";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Plus, Search, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { toast } from "react-toastify";

export const PagamentoEquipePage = () => {
  const navigate = useNavigate();
  // --- STATE ---
  const [selectedFuncId, setSelectedFuncId] = useState("");
  const [activeTab, setActiveTab] = useState<"PENDENTE" | "PAGO">("PENDENTE");

  // Data States
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [valesPendentes, setValesPendentes] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);

  // Filters (History Tab)
  // Default to "WEEK" logic if desired, or keep generic dates. User asked for "hj, semana e mes" filters.
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM"
  >("WEEK");
  const [filterHistStart, setFilterHistStart] = useState("");
  const [filterHistEnd, setFilterHistEnd] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");

  // --- EFFECTS ---
  useEffect(() => {
    loadFuncionarios();
    // Initialize Week Filter
    applyQuickFilter("WEEK");
  }, []);

  useEffect(() => {
    if (!selectedFuncId) {
      setPendentes([]);
      setValesPendentes([]);
      setHistorico([]);
      return;
    }

    if (activeTab === "PENDENTE") {
      loadPendentes(selectedFuncId);
      loadVales(selectedFuncId);
    } else {
      loadHistorico(selectedFuncId);
    }
  }, [selectedFuncId, activeTab]);

  // --- LOADERS ---
  const loadFuncionarios = async () => {
    try {
      const data = await ColaboradorService.getAll();
      setFuncionarios(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar colaboradores.");
    }
  };

  const loadPendentes = async (id: string) => {
    try {
      const data = await FinanceiroService.getPendenciasColaborador(id);
      setPendentes(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar pendências.");
    }
  };

  const loadVales = async (id: string) => {
    try {
      const data = await FinanceiroService.getValesPendentes(id);
      setValesPendentes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistorico = async (id: string) => {
    try {
      const data = await FinanceiroService.getPagamentosColaborador({
        id_funcionario: id,
      });
      setHistorico(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar histórico.");
    }
  };

  // --- HELPERS ---
  const getComissaoInfo = (funcId: any, valorTotal: number) => {
    const func = funcionarios.find(
      (f) => String(f.id_funcionario) === String(funcId),
    );
    const porcentagem = func?.comissao || 0;
    const valorComissao = (valorTotal * porcentagem) / 100;
    return { porcentagem, valorComissao };
  };

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    setActiveFilter(type);
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    if (type === "TODAY") {
      setFilterHistStart(todayStr);
      setFilterHistEnd(todayStr);
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setFilterHistStart(weekAgo.toLocaleDateString("en-CA"));
      setFilterHistEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterHistStart(firstDay.toLocaleDateString("en-CA"));
      setFilterHistEnd(todayStr);
    }
  };

  // --- FILTERS & FLATTENING ---
  const flattenedHistorico = useMemo(() => {
    const flatList: any[] = [];

    historico.forEach((h) => {
      const dtPagamento = h.dt_pagamento ? h.dt_pagamento.split("T")[0] : "";

      // Check Date Range Filter
      if (filterHistStart && dtPagamento < filterHistStart) return;
      if (filterHistEnd && dtPagamento > filterHistEnd) return;

      // 1. Add Commission Items (OSs)
      if (h.servicos_pagos && h.servicos_pagos.length > 0) {
        h.servicos_pagos.forEach((s: any) => {
          flatList.push({
            type: "COMISSAO",
            id: s.id_servico_mao_de_obra,
            date: h.dt_pagamento,
            os: s.ordem_de_servico,
            value: s.valor, // Base labor value
            commissionValue: getComissaoInfo(selectedFuncId, Number(s.valor))
              .valorComissao,
            percentage: getComissaoInfo(selectedFuncId, Number(s.valor))
              .porcentagem,
            paymentId: h.id_pagamento_equipe,
            paymentMethod: h.forma_pagamento,
          });
        });
      }

      // 2. Add Bonus (Prêmio) if exists
      if (Number(h.premio_valor) > 0) {
        flatList.push({
          type: "PREMIO",
          id: `premio-${h.id_pagamento_equipe}`,
          date: h.dt_pagamento,
          description: h.premio_descricao || "Prêmio / Bônus",
          value: Number(h.premio_valor),
          paymentId: h.id_pagamento_equipe,
          paymentMethod: h.forma_pagamento,
        });
      }

      // 3. Add Vales (Adiantamentos) paid
      if (h.tipo_lancamento === "VALE") {
        flatList.push({
          type: "VALE",
          id: `vale-${h.id_pagamento_equipe}`,
          date: h.dt_pagamento,
          description: `Adiantamento (Vale)${h.obs ? " - " + h.obs : ""}`,
          value: Number(h.valor_total),
          paymentId: h.id_pagamento_equipe,
          paymentMethod: h.forma_pagamento,
        });
      }

      // 4. Add Salary/Other Check (Residual Value)
      // If the payment total is greater than the sum of commissions + bonuses, the remainder is Salário/Contrato
      const commissionTotal = h.servicos_pagos
        ? h.servicos_pagos.reduce(
            (acc: number, s: any) => acc + Number(s.valor),
            0,
          )
        : 0;
      const premioVal = Number(h.premio_valor) || 0;

      // If it is NOT a Vale record, we check for residuals
      if (h.tipo_lancamento !== "VALE") {
        const totalExplained = commissionTotal + premioVal;
        const residual = Number(h.valor_total) - totalExplained;

        if (residual > 0.05) {
          // Tolerance for float math
          flatList.push({
            type: "SALARIO",
            id: `salario-${h.id_pagamento_equipe}`,
            date: h.dt_pagamento,
            description: h.obs || "Pagamento / Salário",
            value: residual,
            paymentId: h.id_pagamento_equipe,
            paymentMethod: h.forma_pagamento,
          });
        }
      }
    });

    // Search Filter
    if (!historySearchTerm) return flatList;

    const lowSearch = historySearchTerm.toLowerCase();

    return flatList.filter((item) => {
      // Common fields
      if (item.date && item.date.includes(lowSearch)) return true;
      if (String(item.value).includes(lowSearch)) return true;
      if (
        item.paymentMethod &&
        item.paymentMethod.toLowerCase().includes(lowSearch)
      )
        return true;

      // OS Specific
      if (item.type === "COMISSAO" && item.os) {
        if (String(item.os.id_os).includes(lowSearch)) return true;
        if (item.os.veiculo?.placa?.toLowerCase().includes(lowSearch))
          return true;
        if (item.os.veiculo?.modelo?.toLowerCase().includes(lowSearch))
          return true;
        if (item.os.veiculo?.cor?.toLowerCase().includes(lowSearch))
          return true;
        if (
          item.os.cliente?.pessoa_fisica?.pessoa?.nome
            ?.toLowerCase()
            .includes(lowSearch)
        )
          return true;
        if (
          item.os.cliente?.pessoa_juridica?.razao_social
            ?.toLowerCase()
            .includes(lowSearch)
        )
          return true;
      }

      // Description Specific (Vale/Premio)
      if (
        item.description &&
        item.description.toLowerCase().includes(lowSearch)
      )
        return true;

      return false;
    });
  }, [
    historico,
    filterHistStart,
    filterHistEnd,
    historySearchTerm,
    selectedFuncId,
    funcionarios,
  ]);

  // Recalculate total based on filtered view
  const totalHistorico = useMemo(() => {
    return flattenedHistorico.reduce((acc, item) => {
      if (item.type === "COMISSAO") return acc + (item.commissionValue || 0);
      return acc + (item.value || 0);
    }, 0);
  }, [flattenedHistorico]);

  return (
    <PageLayout
      title="Pagamentos de Equipe"
      subtitle="Gestão individual de comissões e pagamentos."
      actions={
        <Button
          onClick={() =>
            navigate("/pagamento-equipe/novo", {
              state: { funcionarioId: selectedFuncId },
            })
          }
          variant="primary"
          icon={Plus}
          disabled={!selectedFuncId}
          title={!selectedFuncId ? "Selecione um colaborador primeiro" : ""}
        >
          Novo Pagamento
        </Button>
      }
    >
      <div className="space-y-6">
        {/* SELEÇÃO COLABORADOR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block mb-2">
            Selecione o Colaborador
          </label>
          <div className="relative max-w-md">
            <select
              value={selectedFuncId}
              onChange={(e) => setSelectedFuncId(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-white border border-neutral-200 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-colors text-neutral-600"
            >
              <option value="">Selecione um colaborador...</option>
              {funcionarios.map((f: any) => (
                <option key={f.id_funcionario} value={f.id_funcionario}>
                  {f.pessoa_fisica?.pessoa?.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedFuncId ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* ACTION & TABS */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
              <div className="flex bg-neutral-50 p-1 rounded-lg w-fit border border-neutral-200">
                <button
                  onClick={() => setActiveTab("PENDENTE")}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "PENDENTE"
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-neutral-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Visão Geral / Pendências
                </button>
                <button
                  onClick={() => setActiveTab("PAGO")}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "PAGO"
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-neutral-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Histórico (Pagos)
                </button>
              </div>
            </div>

            {/* TAB: PENDENTE */}
            {activeTab === "PENDENTE" && (
              <Card className="p-0 overflow-hidden">
                {/* ADIANTAMENTOS EM ABERTO */}
                {valesPendentes.length > 0 && (
                  <div className="border-b border-neutral-100">
                    <div className="px-6 py-4 bg-amber-50/50 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-500" />
                      <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                        Adiantamentos (Vales) em Aberto
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="tabela-limpa w-full">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th className="text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valesPendentes.map((vale, idx) => (
                            <tr
                              key={`vale-${idx}`}
                              className="group hover:bg-neutral-50 transition-colors"
                            >
                              <td className="font-bold text-neutral-600">
                                {new Date(
                                  vale.dt_pagamento,
                                ).toLocaleDateString()}
                                <div className="text-[10px] font-normal text-neutral-400">
                                  {new Date(
                                    vale.dt_pagamento,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>
                              <td className="text-neutral-600">
                                {vale.obs || "Adiantamento (Sem descrição)"}
                              </td>
                              <td className="text-right font-bold text-orange-600">
                                {formatCurrency(Number(vale.valor_total))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                    Comissões Pendentes
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="tabela-limpa w-full">
                    <thead>
                      <tr>
                        <th>OS / Data</th>
                        <th>Veículo / Cliente</th>
                        <th className="text-right">Valor Serviço</th>
                        <th className="text-center">%</th>
                        <th className="text-right">Valor A Receber</th>
                        <th className="text-center">Status OS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendentes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-12 text-center text-neutral-400 font-bold"
                          >
                            Nenhuma comissão pendente encontrada.
                          </td>
                        </tr>
                      ) : (
                        pendentes.map((item, idx) => {
                          const { porcentagem, valorComissao } =
                            getComissaoInfo(selectedFuncId, Number(item.valor));
                          return (
                            <tr
                              key={`${item.id_os}-${idx}`}
                              className="group hover:bg-neutral-50 transition-colors"
                            >
                              <td>
                                <div className="font-bold text-neutral-600">
                                  #{item.id_os}
                                </div>
                                <div className="text-[10px] text-neutral-400">
                                  {new Date(
                                    item.ordem_de_servico?.dt_abertura,
                                  ).toLocaleDateString()}
                                </div>
                              </td>
                              <td>
                                <div className="text-xs font-bold text-neutral-600">
                                  {item.ordem_de_servico?.veiculo?.modelo}
                                  {item.ordem_de_servico?.veiculo?.cor && (
                                    <span className="text-neutral-500 font-normal ml-1">
                                      • {item.ordem_de_servico?.veiculo?.cor}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
                                  {item.ordem_de_servico?.veiculo?.placa}
                                </div>
                                <div className="text-[10px] text-neutral-400 mt-0.5">
                                  {item.ordem_de_servico?.cliente?.pessoa_fisica
                                    ?.pessoa?.nome ||
                                    item.ordem_de_servico?.cliente
                                      ?.pessoa_juridica?.razao_social}
                                </div>
                              </td>
                              <td className="text-right">
                                <span className="text-xs font-bold text-neutral-400">
                                  {formatCurrency(Number(item.valor))}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                                  {porcentagem ? porcentagem : "0"}%
                                </span>
                              </td>
                              <td className="text-right">
                                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                  {formatCurrency(valorComissao)}
                                </span>
                              </td>
                              <td className="text-center">
                                <span
                                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${getStatusStyle(item.ordem_de_servico?.status || "")}`}
                                >
                                  {item.ordem_de_servico?.status
                                    ? item.ordem_de_servico.status ===
                                        "PRONTO_PARA_FINANCEIRO" ||
                                      item.ordem_de_servico.status ===
                                        "PRONTO PARA FINANCEIRO"
                                      ? "FINANCEIRO"
                                      : item.ordem_de_servico.status.replace(
                                          /_/g,
                                          " ",
                                        )
                                    : "N/A"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB: PAGO (HISTORICO) */}
            {activeTab === "PAGO" && (
              <>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                  <div className="flex-1 w-full relative">
                    <Input
                      placeholder="Buscar por OS, Placa, Cliente..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      icon={Search}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <div className="flex bg-neutral-50 p-1 rounded-lg border border-neutral-100 gap-1 shrink-0">
                      {["TODAY", "WEEK", "MONTH"].map((f) => (
                        <button
                          key={f}
                          onClick={() => applyQuickFilter(f as any)}
                          className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            activeFilter === f
                              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
                              : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          {f === "TODAY"
                            ? "Hoje"
                            : f === "WEEK"
                              ? "Semana"
                              : "Mês"}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 items-center px-4 border-l border-neutral-200 ml-2">
                      {/* Custom Dates - Keep simple for now or componentize later */}
                      <input
                        type="date"
                        value={filterHistStart}
                        onChange={(e) => {
                          setFilterHistStart(e.target.value);
                          setActiveFilter("CUSTOM");
                        }}
                        className={`h-9 px-2 rounded border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${
                          activeFilter === "CUSTOM"
                            ? "border-blue-300 text-blue-700"
                            : "border-neutral-200 text-neutral-600"
                        }`}
                      />
                      <input
                        type="date"
                        value={filterHistEnd}
                        onChange={(e) => {
                          setFilterHistEnd(e.target.value);
                          setActiveFilter("CUSTOM");
                        }}
                        className={`h-9 px-2 rounded border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${
                          activeFilter === "CUSTOM"
                            ? "border-blue-300 text-blue-700"
                            : "border-neutral-200 text-neutral-600"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <Card className="p-0 overflow-hidden">
                  <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Histórico de Pagamentos
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        Total Pago no Período:
                      </span>
                      <span className="text-lg font-bold text-neutral-800 bg-white px-3 py-1 rounded border border-neutral-200 shadow-sm">
                        {formatCurrency(totalHistorico)}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="tabela-limpa w-full">
                      <thead>
                        <tr>
                          <th>Data Pagto</th>
                          <th>Tipo</th>
                          <th>OS / Detalhe</th>
                          <th>Veículo</th>
                          <th>Cliente</th>
                          <th className="text-right">Valor Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flattenedHistorico.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-12 text-center text-neutral-400 font-bold"
                            >
                              Nenhum histórico encontrado.
                            </td>
                          </tr>
                        ) : (
                          flattenedHistorico.map((item, idx) => (
                            <tr
                              key={`${item.id}-${idx}`}
                              className="group hover:bg-neutral-50 transition-colors"
                            >
                              <td className="text-xs font-bold text-neutral-600">
                                {new Date(item.date).toLocaleDateString()}
                                <div className="text-[10px] font-normal text-neutral-400">
                                  {new Date(item.date).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    item.type === "COMISSAO"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : item.type === "VALE"
                                        ? "bg-amber-50 text-amber-600"
                                        : "bg-blue-50 text-blue-600"
                                  }`}
                                >
                                  {item.type}
                                </span>
                              </td>
                              <td>
                                {item.type === "COMISSAO" ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-neutral-600">
                                      OS Nº {item.os.id_os}
                                    </span>
                                    {(item.os.defeito_relatado ||
                                      item.os.diagnostico) && (
                                      <div className="text-[10px] text-neutral-500 leading-tight bg-neutral-100/50 p-1.5 rounded-md border border-neutral-100 max-w-[200px]">
                                        {item.os.defeito_relatado && (
                                          <div className="mb-0.5">
                                            <span className="font-bold text-neutral-600">
                                              Def:
                                            </span>{" "}
                                            {item.os.defeito_relatado}
                                          </div>
                                        )}
                                        {item.os.diagnostico && (
                                          <div>
                                            <span className="font-bold text-neutral-600">
                                              Diag:
                                            </span>{" "}
                                            {item.os.diagnostico}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium text-neutral-600">
                                    {item.description}
                                  </span>
                                )}
                              </td>
                              <td>
                                {item.type === "COMISSAO" ? (
                                  <div className="text-xs">
                                    <div className="font-bold text-neutral-600">
                                      {item.os.veiculo?.modelo}
                                    </div>
                                    <div className="text-[10px] text-neutral-500">
                                      {item.os.veiculo?.placa} •{" "}
                                      {item.os.veiculo?.cor}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-neutral-300 transform scale-150 block w-4 h-px bg-neutral-200 is-dash"></span>
                                )}
                              </td>
                              <td>
                                {item.type === "COMISSAO" ? (
                                  <div className="text-xs font-medium text-neutral-600">
                                    {item.os.cliente?.pessoa_fisica?.pessoa
                                      ?.nome ||
                                      item.os.cliente?.pessoa_juridica
                                        ?.razao_social}
                                  </div>
                                ) : (
                                  <span className="text-neutral-300 transform scale-150 block w-4 h-px bg-neutral-200 is-dash"></span>
                                )}
                              </td>
                              <td className="text-right">
                                <div className="font-bold text-neutral-600 text-xs">
                                  {formatCurrency(
                                    item.type === "COMISSAO"
                                      ? item.commissionValue
                                      : item.value,
                                  )}
                                </div>
                                {item.type === "COMISSAO" && (
                                  <div className="text-[9px] text-neutral-400">
                                    ({item.percentage}%)
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        ) : (
          // EMPTY STATE
          <div className="bg-surface rounded-xl border border-dashed border-neutral-200 p-12 flex flex-col items-center justify-center text-center mt-6">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-500 mb-4">
              <Plus size={32} />
            </div>
            <h3 className="font-bold text-lg text-neutral-600">
              Nenhum Colaborador Selecionado
            </h3>
            <p className="text-neutral-500 max-w-sm mt-2">
              Selecione um colaborador na lista acima para visualizar suas
              comissões, histórico e realizar pagamentos.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
