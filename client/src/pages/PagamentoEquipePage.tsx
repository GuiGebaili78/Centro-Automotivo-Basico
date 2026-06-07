import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { getStatusStyle } from "../utils/osUtils";
import { FinanceiroService } from "../services/financeiro.service";
import { ColaboradorService } from "../services/colaborador.service";
import { Button, Input, FilterButton, Select } from "../components/ui";
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
  const getComissaoInfo = (funcId: any, valorTotal: number, item?: any) => {
    const func = funcionarios.find(
      (f) => String(f.id_funcionario) === String(funcId),
    );
    const porcentagem = func?.comissao || 0;
    const valorComissao = (valorTotal * porcentagem) / 100;
    const comissaoPecas = item ? Number(item.valor_comissao_pecas || 0) : 0;
    return { 
      porcentagem, 
      valorComissao: valorComissao + comissaoPecas,
      comissaoPecas
    };
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
          const comissaoInfo = getComissaoInfo(selectedFuncId, Number(s.valor), s);
          flatList.push({
            type: "COMISSAO",
            id: s.id_servico_mao_de_obra,
            date: h.dt_pagamento,
            os: s.ordem_de_servico,
            value: s.valor, // Base labor value
            lucroPecas: Number(s.lucro_pecas_snapshot || 0),
            commissionValue: comissaoInfo.valorComissao,
            percentage: comissaoInfo.porcentagem,
            comissaoPecas: comissaoInfo.comissaoPecas,
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
            <Select
              value={selectedFuncId}
              onChange={(e) => setSelectedFuncId(e.target.value)}
            >
              <option value="">Selecione um colaborador...</option>
              {funcionarios.map((f: any) => (
                <option key={f.id_funcionario} value={f.id_funcionario}>
                  {f.pessoa_fisica?.pessoa?.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {selectedFuncId ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* RESUMO FINANCEIRO (RH) */}
            {(() => {
              const selectedFunc = funcionarios.find((f: any) => String(f.id_funcionario) === String(selectedFuncId));
              if (selectedFunc) {
                const salario = Number(selectedFunc.salario || 0);
                const comissao = Number(selectedFunc.comissao || 0);
                const hasNoConfig = salario === 0 && comissao === 0;

                return (
                  <div className={`bg-white p-4 rounded-xl shadow-sm border ${hasNoConfig ? "border-red-500 animate-pulse" : "border-neutral-200"}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${hasNoConfig ? "bg-red-50 text-red-500" : "bg-primary-50 text-primary-600"}`}>
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-800 text-sm uppercase tracking-wider">
                            Resumo Financeiro - {selectedFunc.pessoa_fisica?.pessoa?.nome}
                          </h3>
                          {hasNoConfig ? (
                            <p className="text-red-500 text-xs font-semibold mt-0.5">
                              Atenção: Modo de recebimento não configurado no cadastro!
                            </p>
                          ) : (
                            <p className="text-neutral-500 text-xs mt-0.5">
                              Informações de contrato do colaborador.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Salário Fixo</span>
                          <span className={`text-lg font-bold ${salario > 0 ? "text-neutral-800" : "text-neutral-400"}`}>
                            {formatCurrency(salario)}
                          </span>
                        </div>
                         <div className="flex flex-col border-l border-neutral-100 pl-6">
                           <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Comissão M.O.</span>
                           <span className={`text-lg font-bold ${comissao > 0 ? "text-blue-600" : "text-neutral-400"}`}>
                             {comissao}%
                           </span>
                         </div>
                         <div className="flex flex-col border-l border-neutral-100 pl-6">
                           <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Comissão Peças</span>
                           <span className={`text-lg font-bold ${Number(selectedFunc.comissao_pecas || 0) > 0 ? "text-amber-600" : "text-neutral-400"}`}>
                             {Number(selectedFunc.comissao_pecas || 0)}%
                           </span>
                         </div>
                       </div>
                     </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* ACTION & TABS */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
              <div className="flex bg-neutral-50 p-1 rounded-lg w-fit border border-neutral-200 gap-1">
                <FilterButton
                  active={activeTab === "PENDENTE"}
                  onClick={() => setActiveTab("PENDENTE")}
                >
                  Visão Geral / Pendências
                </FilterButton>
                <FilterButton
                  active={activeTab === "PAGO"}
                  onClick={() => setActiveTab("PAGO")}
                >
                  Histórico (Pagos)
                </FilterButton>
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
                                <div className="text-sm font-normal text-neutral-400">
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
                        <th className="text-left p-4">OS / Data</th>
                        <th className="text-left p-4">Veículo / Cliente / Diagnóstico</th>
                        <th className="text-left p-4">Valor Serviço</th>
                        <th className="text-left p-4">%</th>
                        <th className="text-left p-4">Valor A Receber</th>
                        <th className="text-left p-4">Status OS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
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
                           const { porcentagem, valorComissao, comissaoPecas } =
                             getComissaoInfo(selectedFuncId, Number(item.valor), item);
                          return (
                            <tr
                              key={`${item.id_os}-${idx}`}
                              className="group hover:bg-neutral-50 transition-colors"
                            >
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <div className="text-base text-neutral-900 font-normal">
                                    OS | {item.id_os}
                                  </div>
                                  <div className="text-base text-neutral-600 font-normal mt-1">
                                    {new Date(item.ordem_de_servico?.dt_abertura).toLocaleDateString("pt-BR")}
                                  </div>
                                  <div className="text-sm font-normal text-neutral-500 min-h-[1.25rem]">
                                    {item.ordem_de_servico?.dt_abertura ? new Date(item.ordem_de_servico.dt_abertura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : '\u00A0'}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-base text-neutral-900 font-normal uppercase">
                                    {item.ordem_de_servico?.veiculo?.modelo} {item.ordem_de_servico?.veiculo?.placa ? `- ${item.ordem_de_servico.veiculo.placa}` : ""}
                                  </div>
                                  <div className="text-base text-neutral-600 font-normal truncate max-w-[200px]">
                                    {item.ordem_de_servico?.cliente?.pessoa_fisica?.pessoa?.nome || item.ordem_de_servico?.cliente?.pessoa_juridica?.razao_social || "N/A"}
                                  </div>
                                  <div className="text-sm text-neutral-500 font-normal italic truncate max-w-[250px] min-h-[1.25rem]">
                                    Def: {item.ordem_de_servico?.defeito_relatado || item.ordem_de_servico?.diagnostico || "N/A"}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-left align-top pt-5">
                                <span className="text-base font-normal text-neutral-900">
                                  {formatCurrency(Number(item.valor))}
                                </span>
                              </td>
                              <td className="p-4 text-left align-top pt-5">
                                <span className="text-base font-normal text-neutral-900 bg-neutral-100 px-2 py-1 rounded">
                                  {porcentagem ? porcentagem : "0"}%
                                </span>
                              </td>
                               <td className="p-4 text-left align-top pt-5">
                                 <div className="flex flex-col items-start">
                                   <span className="text-base font-normal text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                     {formatCurrency(valorComissao)}
                                   </span>
                                   {comissaoPecas > 0 && (
                                     <span className="text-xs text-neutral-500 mt-1">
                                       (Inc. {formatCurrency(comissaoPecas)} de peças)
                                     </span>
                                   )}
                                 </div>
                              </td>
                              <td className="p-4 text-left align-top pt-5">
                                <span
                                  className={`px-3 py-1 rounded-md text-sm font-bold uppercase whitespace-nowrap ${getStatusStyle(item.ordem_de_servico?.status || "")}`}
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
                    <div className="flex bg-neutral-50 p-1 rounded-xl border border-neutral-100 gap-1 shrink-0">
                      {["TODAY", "WEEK", "MONTH"].map((f) => (
                        <FilterButton
                          key={f}
                          active={activeFilter === f}
                          onClick={() => applyQuickFilter(f as any)}
                        >
                          {f === "TODAY"
                            ? "Hoje"
                            : f === "WEEK"
                              ? "Semana"
                              : "Mês"}
                        </FilterButton>
                      ))}
                    </div>

                    <div className="flex gap-2 items-center px-4 border-l border-neutral-200 ml-2">
                      <Input
                        type="date"
                        value={filterHistStart}
                        onChange={(e) => {
                          setFilterHistStart(e.target.value);
                          setActiveFilter("CUSTOM");
                        }}
                        className={`h-9 text-xs ${
                          activeFilter === "CUSTOM"
                            ? "border-blue-300 text-blue-700"
                            : ""
                        }`}
                      />
                      <Input
                        type="date"
                        value={filterHistEnd}
                        onChange={(e) => {
                          setFilterHistEnd(e.target.value);
                          setActiveFilter("CUSTOM");
                        }}
                        className={`h-9 text-xs ${
                          activeFilter === "CUSTOM"
                            ? "border-blue-300 text-blue-700"
                            : ""
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
                      <span className="text-sm font-bold uppercase tracking-widest text-neutral-400">
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
                          <th className="text-left p-4">OS / Data</th>
                          <th className="text-left p-4">Tipo</th>
                          <th className="text-left p-4">Diagnóstico</th>
                          <th className="text-left p-4">Veículo</th>
                          <th className="text-left p-4">Cliente</th>
                          <th className="text-left p-4">Valor Pago</th>
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
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <div className="text-base text-neutral-900 font-normal">
                                    {item.type === "COMISSAO" ? `OS | ${item.os.id_os}` : "N/A"}
                                  </div>
                                  <div className="text-base text-neutral-600 font-normal mt-1">
                                    {new Date(item.date).toLocaleDateString("pt-BR")}
                                  </div>
                                  <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">
                                    {new Date(item.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 align-top pt-5">
                                <span
                                  className={`px-2 py-1 rounded text-sm font-bold uppercase tracking-wider ${
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
                              <td className="p-4 align-top pt-5">
                                {item.type === "COMISSAO" ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="text-base font-normal text-neutral-900 truncate max-w-[200px]" title={item.os?.defeito_relatado || item.os?.diagnostico || "N/A"}>
                                      {item.os?.defeito_relatado || item.os?.diagnostico || "Sem diagnóstico"}
                                    </div>
                                    <div className="text-base font-normal text-neutral-600 min-h-[1.5rem]">&nbsp;</div>
                                    <div className="text-sm font-normal text-neutral-500 min-h-[1.25rem]">&nbsp;</div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-base font-normal text-neutral-900">
                                      {item.description}
                                    </span>
                                    <div className="text-base font-normal text-neutral-600 min-h-[1.5rem]">&nbsp;</div>
                                    <div className="text-sm font-normal text-neutral-500 min-h-[1.25rem]">&nbsp;</div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 align-top pt-5">
                                {item.type === "COMISSAO" ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="text-base font-normal text-neutral-900 uppercase">
                                      {item.os.veiculo?.modelo || "N/A"}
                                    </div>
                                    <div className="text-base font-normal text-neutral-600 uppercase">
                                      {item.os.veiculo?.placa || "SEM PLACA"}
                                    </div>
                                    <div className="text-sm font-normal text-neutral-500 uppercase min-h-[1.25rem]">
                                      {item.os.veiculo?.cor || "\u00A0"}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-neutral-300 transform scale-150 block w-4 h-px bg-neutral-200 is-dash mt-3"></span>
                                )}
                              </td>
                              <td className="p-4 align-top pt-5">
                                {item.type === "COMISSAO" ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="text-base font-normal text-neutral-900 truncate max-w-[150px]">
                                      {item.os.cliente?.pessoa_fisica?.pessoa?.nome || item.os.cliente?.pessoa_juridica?.razao_social || "N/I"}
                                    </div>
                                    <div className="text-base font-normal text-neutral-600 min-h-[1.5rem]">&nbsp;</div>
                                    <div className="text-sm font-normal text-neutral-500 min-h-[1.25rem]">&nbsp;</div>
                                  </div>
                                ) : (
                                  <span className="text-neutral-300 transform scale-150 block w-4 h-px bg-neutral-200 is-dash mt-3"></span>
                                )}
                              </td>
                              <td className="p-4 align-top pt-5 text-left">
                                {item.type === "COMISSAO" ? (
                                  <div className="flex flex-col items-start gap-1">
                                    <div className="text-sm text-neutral-500 font-medium whitespace-nowrap">
                                      Valor Serviço: <span className="text-neutral-700">{formatCurrency(Number(item.value))}</span> ➔ Sua Comissão M.O: <span className="font-bold text-blue-600">{formatCurrency(Number(item.commissionValue) - Number(item.comissaoPecas))}</span>
                                    </div>
                                    {Number(item.comissaoPecas || 0) > 0 && (
                                      <div className="text-sm text-neutral-500 font-medium whitespace-nowrap">
                                        Lucro Peças: <span className="text-neutral-700">{formatCurrency(Number(item.lucroPecas || 0))}</span> ➔ Sua Comissão Peças: <span className="font-bold text-amber-600">{formatCurrency(Number(item.comissaoPecas))}</span>
                                      </div>
                                    )}
                                    <div className="mt-1 pt-1 border-t border-neutral-100 flex items-center gap-2 w-full max-w-[280px]">
                                      <span className="text-xs uppercase font-bold text-neutral-400">Total OS:</span>
                                      <span className="font-black text-emerald-600 text-lg">
                                        {formatCurrency(Number(item.commissionValue))}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-base font-normal text-neutral-900">
                                    {formatCurrency(item.value)}
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
