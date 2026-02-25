import { useState, useMemo, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { getStatusStyle } from "../../utils/osUtils";
import { FinanceiroService } from "../../services/financeiro.service";
import { ColaboradorService } from "../../services/colaborador.service";
import {
  Button,
  Input,
  Card,
  Modal,
  Select,
  Checkbox,
  FilterButton,
} from "../ui";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  AlertCircle,
  Calculator,
  CheckCircle2,
  Circle,
  User,
  CheckSquare,
  Square,
  Save,
  X,
} from "lucide-react";
import type {
  IPagamentoColaborador,
  IPendenciaColaborador,
  IFinanceiroStatusMsg,
} from "../../types/financeiro.types";

interface PagamentoColaboradoresTabProps {
  onUpdate: () => void;
  setStatusMsg: (msg: IFinanceiroStatusMsg) => void;
  setLoading: (loading: boolean) => void;
}

export const PagamentoColaboradoresTab = ({
  onUpdate,
  setStatusMsg,
  setLoading,
}: PagamentoColaboradoresTabProps) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<"PENDENTE" | "PAGO">("PENDENTE");
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState("");

  // Data
  const [pendentes, setPendentes] = useState<IPendenciaColaborador[]>([]);
  const [valesPendentes, setValesPendentes] = useState<any[]>([]);
  const [historico, setHistorico] = useState<IPagamentoColaborador[]>([]);

  // Novo Pagamento Modal State
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);

  // Filters (History)
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM"
  >("WEEK");
  const [filterHistStart, setFilterHistStart] = useState("");
  const [filterHistEnd, setFilterHistEnd] = useState("");

  // --- NEW PAYMENT STATE ---
  const [paymentMode, setPaymentMode] = useState<"PAGAMENTO" | "ADIANTAMENTO">(
    "PAGAMENTO",
  );
  const [paySelectedItems, setPaySelectedItems] = useState<any[]>([]); // IDs Comissões
  const [paySelectedVales, setPaySelectedVales] = useState<any[]>([]); // IDs Vales
  const [payIncludeSalary, setPayIncludeSalary] = useState(false);
  const [payValorSalario, setPayValorSalario] = useState("");
  const [payValorPremio, setPayValorPremio] = useState("");
  const [payObsExtra, setPayObsExtra] = useState("");
  const [payObsPagamento, setPayObsPagamento] = useState("");
  const [payMethod, setPayMethod] = useState("DINHEIRO");
  const [payValorAdiantamento, setPayValorAdiantamento] = useState("");
  const [payDataAdiantamento, setPayDataAdiantamento] = useState(
    new Date().toISOString().split("T")[0],
  );
  // Date Filters for Commission Selection inside Modal
  // const [payMsg, setPayMsg] = useState("");

  // --- EFFECTS ---
  useEffect(() => {
    loadFuncionarios();
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
      // Fetch all and filter client-side for simplicity as per original page
      // Ideally API should support filtering
      const all = await FinanceiroService.getPagamentosColaborador();
      const filtered = all.filter(
        (h) => String(h.id_funcionario) === String(id),
      );
      setHistorico(filtered);
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

  // --- FLATTENING HISTORIC (Same logic as PagamentoEquipePage) ---
  const flattenedHistorico = useMemo(() => {
    const flatList: any[] = [];
    historico.forEach((h) => {
      const dtPagamento = h.dt_pagamento ? h.dt_pagamento.split("T")[0] : "";
      if (filterHistStart && dtPagamento < filterHistStart) return;
      if (filterHistEnd && dtPagamento > filterHistEnd) return;

      // 1. Commissions
      if (h.servicos_pagos && h.servicos_pagos.length > 0) {
        h.servicos_pagos.forEach((s: any) => {
          flatList.push({
            type: "COMISSAO",
            id: s.id_servico_mao_de_obra,
            date: h.dt_pagamento,
            os: s.ordem_de_servico,
            value: s.valor,
            commissionValue: getComissaoInfo(selectedFuncId, Number(s.valor))
              .valorComissao,
            percentage: getComissaoInfo(selectedFuncId, Number(s.valor))
              .porcentagem,
            paymentId: h.id_pagamento_equipe,
            paymentMethod: h.forma_pagamento,
          });
        });
      }
      // 2. Bonus
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
      // 3. Vales
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
      // 4. Salary/Residual
      const commissionTotal = h.servicos_pagos
        ? h.servicos_pagos.reduce(
            (acc: number, s: any) => acc + Number(s.valor),
            0,
          )
        : 0;
      const premioVal = Number(h.premio_valor) || 0;
      if (h.tipo_lancamento !== "VALE") {
        const totalExplained = commissionTotal + premioVal;
        const residual = Number(h.valor_total) - totalExplained;
        if (residual > 0.05) {
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

    if (!historySearchTerm) return flatList;
    const low = historySearchTerm.toLowerCase();
    return flatList.filter((item) => {
      if (item.date && item.date.includes(low)) return true;
      if (String(item.value).includes(low)) return true;
      // ... simple search
      return false;
    });
  }, [
    historico,
    filterHistStart,
    filterHistEnd,
    historySearchTerm,
    selectedFuncId,
  ]);

  const totalHistorico = useMemo(() => {
    return flattenedHistorico.reduce((acc, item) => {
      if (item.type === "COMISSAO") return acc + (item.commissionValue || 0);
      return acc + (item.value || 0);
    }, 0);
  }, [flattenedHistorico]);

  // --- NEW PAYMENT LOGIC ---
  const handleOpenNewPayment = async () => {
    if (!selectedFuncId) return;
    setPaymentMode("PAGAMENTO");

    // Reset Data
    setPaySelectedItems([]);
    setPaySelectedVales([]);
    setPayValorSalario("");
    setPayValorPremio("");
    setPayObsExtra("");
    setPayObsPagamento("");
    setPayValorAdiantamento("");
    setPayIncludeSalary(false);

    // Load fresh data for modal
    try {
      setLoading(true);
      const func = funcionarios.find(
        (f) => String(f.id_funcionario) === String(selectedFuncId),
      );
      if (func) {
        setPayValorSalario(
          func.valor_pagamento ? String(func.valor_pagamento) : "",
        );
      }
      // Re-fetch pendentes specifically for the modal to be sure
      const pend =
        await FinanceiroService.getPendenciasColaborador(selectedFuncId);
      setPendentes(pend);
      // Auto select finalized
      const payableItems = pend
        .filter((i: any) => i.ordem_de_servico?.status === "FINALIZADA")
        .map((i: any) => i.id_servico_mao_de_obra);
      setPaySelectedItems(payableItems);

      const vales = await FinanceiroService.getValesPendentes(selectedFuncId);
      setValesPendentes(vales);
      // Auto select all vales
      setPaySelectedVales(vales.map((v: any) => v.id_pagamento_equipe));

      setShowNewPaymentModal(true);
    } catch (e) {
      toast.error("Erro ao preparar novo pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPayment = () => {
    const salario = payIncludeSalary ? Number(payValorSalario) || 0 : 0;
    const premios = Number(payValorPremio) || 0;

    // Calculate Commission Total
    const totalComissoes = pendentes
      .filter((i: any) => paySelectedItems.includes(i.id_servico_mao_de_obra))
      .reduce((acc, curr: any) => {
        const { valorComissao } = getComissaoInfo(
          selectedFuncId,
          Number(curr.valor),
        );
        return acc + valorComissao;
      }, 0);

    // Calculate Vales Deduction
    const totalDescontos = valesPendentes
      .filter((v: any) => paySelectedVales.includes(v.id_pagamento_equipe))
      .reduce((acc, v: any) => acc + Number(v.valor_total), 0);

    return salario + totalComissoes + premios - totalDescontos;
  };

  const handleExecutePayment = async () => {
    try {
      setLoading(true);
      if (paymentMode === "ADIANTAMENTO") {
        await FinanceiroService.createPagamentoColaborador({
          id_funcionario: selectedFuncId,
          servicos_ids: [],
          vales_ids: [],
          valor_total: payValorAdiantamento,
          obs: payObsPagamento,
          forma_pagamento: payMethod,
          premio_valor: null,
          tipo_lancamento: "VALE",
          referencia_inicio: payDataAdiantamento
            ? new Date(payDataAdiantamento)
            : null,
        });
      } else {
        const total = calculateTotalPayment();
        await FinanceiroService.createPagamentoColaborador({
          id_funcionario: selectedFuncId,
          servicos_ids: paySelectedItems,
          vales_ids: paySelectedVales,
          valor_total: total,
          obs: payObsPagamento,
          forma_pagamento: payMethod,
          premio_valor: payValorPremio || null,
          premio_descricao: payObsExtra || null,
          tipo_lancamento: "COMISSAO",
          referencia_inicio: null,
          include_salary: payIncludeSalary,
        });
      }
      setStatusMsg({
        type: "success",
        text: "Lançamento realizado com sucesso!",
      });
      setShowNewPaymentModal(false);
      // Reload
      if (activeTab === "PENDENTE") {
        loadPendentes(selectedFuncId);
        loadVales(selectedFuncId);
      } else {
        loadHistorico(selectedFuncId);
      }
      onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* SELECTION CARD */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col md:flex-row gap-6 items-end justify-between">
        <div className="w-full md:max-w-md">
          <Select
            label="Selecione o Colaborador"
            value={selectedFuncId}
            onChange={(e) => setSelectedFuncId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {funcionarios.map((f: any) => (
              <option key={f.id_funcionario} value={f.id_funcionario}>
                {f.pessoa_fisica?.pessoa?.nome}
              </option>
            ))}
          </Select>
        </div>

        {selectedFuncId && (
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">
                Visualização
              </label>
              <div className="flex bg-neutral-100 p-1 rounded-xl gap-1">
                <FilterButton
                  active={activeTab === "PENDENTE"}
                  onClick={() => setActiveTab("PENDENTE")}
                >
                  Visão Geral
                </FilterButton>
                <FilterButton
                  active={activeTab === "PAGO"}
                  onClick={() => setActiveTab("PAGO")}
                >
                  Histórico
                </FilterButton>
              </div>
            </div>
            <Button
              onClick={handleOpenNewPayment}
              variant="primary"
              icon={Plus}
            >
              Novo Pagamento
            </Button>
          </div>
        )}
      </div>

      {selectedFuncId ? (
        <>
          {activeTab === "PENDENTE" && (
            <Card className="p-0 overflow-hidden">
              {/* VALES PENDENTES */}
              {valesPendentes.length > 0 && (
                <div className="border-b border-neutral-100">
                  <div className="px-6 py-4 bg-amber-50 flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-600" />
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                      Adiantamentos (Vales) em Aberto
                    </h3>
                  </div>
                  <table className="tabela-limpa w-full">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th className="text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valesPendentes.map((v, i) => (
                        <tr key={i} className="hover:bg-amber-50/30">
                          <td className="font-bold text-neutral-600">
                            {new Date(v.dt_pagamento).toLocaleDateString()}
                          </td>
                          <td className="text-neutral-600">
                            {v.obs || "Vale"}
                          </td>
                          <td className="text-right font-bold text-red-500">
                            - {formatCurrency(Number(v.valor_total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* COMISSOES TITLE */}
              <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Comissões Pendentes
                </h3>
              </div>

              {/* COMISSOES TABLE */}
              <div className="overflow-x-auto">
                <table className="tabela-limpa w-full">
                  <thead>
                    <tr>
                      <th>OS / Data</th>
                      <th>Veículo / Cliente</th>
                      <th className="text-right">Valor Serviço</th>
                      <th className="text-center">%</th>
                      <th className="text-right">A Receber</th>
                      <th className="text-center">Status OS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-10 text-center text-neutral-400 italic"
                        >
                          Nenhuma pendência.
                        </td>
                      </tr>
                    ) : (
                      pendentes.map((item: any, idx) => {
                        const { porcentagem, valorComissao } = getComissaoInfo(
                          selectedFuncId,
                          Number(item.valor),
                        );
                        return (
                          <tr key={idx} className="group hover:bg-neutral-50">
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
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                {item.ordem_de_servico?.cliente?.pessoa_fisica
                                  ?.pessoa?.nome || "Cliente"}
                              </div>
                            </td>
                            <td className="text-right text-xs font-bold text-neutral-400">
                              {formatCurrency(Number(item.valor))}
                            </td>
                            <td className="text-center">
                              <span className="text-xs font-bold bg-neutral-100 px-2 py-1 rounded text-neutral-500">
                                {porcentagem}%
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                {formatCurrency(valorComissao)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${getStatusStyle(item.ordem_de_servico?.status || "")}`}
                              >
                                {item.ordem_de_servico?.status?.replace(
                                  /_/g,
                                  " ",
                                ) || "N/A"}
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

          {activeTab === "PAGO" && (
            <div className="space-y-4">
              {/* FILTERS */}
              <div className="flex flex-col md:flex-row gap-4 items-end justify-between border-b border-neutral-100 pb-4 mb-4">
                <div className="w-full md:max-w-md">
                  <Input
                    label="Buscar"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Buscar no histórico..."
                    icon={Search}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">
                      Período
                    </label>
                    <div className="flex bg-neutral-100 p-1 rounded-xl gap-1">
                      <FilterButton
                        active={activeFilter === "TODAY"}
                        onClick={() => applyQuickFilter("TODAY")}
                      >
                        Hoje
                      </FilterButton>
                      <FilterButton
                        active={activeFilter === "WEEK"}
                        onClick={() => applyQuickFilter("WEEK")}
                      >
                        Semana
                      </FilterButton>
                      <FilterButton
                        active={activeFilter === "MONTH"}
                        onClick={() => applyQuickFilter("MONTH")}
                      >
                        Mês
                      </FilterButton>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setHistorySearchTerm("");
                      setFilterHistStart("");
                      setFilterHistEnd("");
                      setActiveFilter("WEEK");
                      applyQuickFilter("WEEK");
                    }}
                    variant="outline"
                    size="sm"
                    icon={X}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Histórico de Pagamentos
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      Total Pago:
                    </span>
                    <span className="text-lg font-black text-neutral-800 bg-white px-3 py-1 rounded border border-neutral-200 shadow-sm">
                      {formatCurrency(totalHistorico)}
                    </span>
                  </div>
                </div>
                <table className="tabela-limpa w-full">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>OS / Detalhe</th>
                      <th>Cliente/Veículo</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flattenedHistorico.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-10 text-center text-neutral-400 italic"
                        >
                          Histórico vazio para o período.
                        </td>
                      </tr>
                    ) : (
                      flattenedHistorico.map((h, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="text-xs font-bold text-neutral-600">
                            {new Date(h.date).toLocaleDateString()}
                            <div className="text-[10px] font-normal text-neutral-400">
                              {new Date(h.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${h.type === "COMISSAO" ? "bg-emerald-50 text-emerald-600" : h.type === "VALE" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}
                            >
                              {h.type}
                            </span>
                          </td>
                          <td className="text-xs">
                            {h.type === "COMISSAO" ? (
                              <>
                                <span className="font-bold text-neutral-700">
                                  OS #{h.os?.id_os}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-neutral-600">
                                {h.description}
                              </span>
                            )}
                          </td>
                          <td className="text-xs text-neutral-500">
                            {h.type === "COMISSAO" ? (
                              <>
                                <div>
                                  {h.os?.veiculo?.modelo} (
                                  {h.os?.veiculo?.placa})
                                </div>
                                <div className="text-[9px]">
                                  {h.os?.cliente?.pessoa_fisica?.pessoa?.nome ||
                                    h.os?.cliente?.pessoa_juridica
                                      ?.razao_social}
                                </div>
                              </>
                            ) : (
                              <span className="text-neutral-300">---</span>
                            )}
                          </td>
                          <td className="text-right font-bold text-neutral-600">
                            {formatCurrency(
                              h.type === "COMISSAO"
                                ? h.commissionValue
                                : h.value,
                            )}
                            {h.type === "COMISSAO" && (
                              <div className="text-[9px] text-neutral-400">
                                ({h.percentage}%)
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="p-12 border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-4">
            <User size={32} />
          </div>
          <h3 className="font-bold text-neutral-600 text-lg">
            Nenhum Colaborador Selecionado
          </h3>
          <p className="text-neutral-400 max-w-sm">
            Selecione um colaborador acima para gerenciar pagamentos, comissões
            e adiantamentos.
          </p>
        </div>
      )}

      {/* MODAL NOVO PAGAMENTO */}
      {showNewPaymentModal && (
        <Modal
          title="Novo Pagamento / Adiantamento"
          onClose={() => setShowNewPaymentModal(false)}
          className="max-w-4xl"
        >
          <div className="space-y-6 pt-2">
            {/* HEADER: MODE & SUMMARY */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">
                Tipo de Lançamento
              </label>
              <div className="flex font-bold bg-neutral-100 p-1 rounded-xl w-fit gap-1">
                <FilterButton
                  active={paymentMode === "PAGAMENTO"}
                  onClick={() => setPaymentMode("PAGAMENTO")}
                >
                  Pagamento (Comissões/Salário)
                </FilterButton>
                <FilterButton
                  active={paymentMode === "ADIANTAMENTO"}
                  onClick={() => setPaymentMode("ADIANTAMENTO")}
                >
                  Adiantamento (Novo Vale)
                </FilterButton>
              </div>
            </div>

            {/* BODY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Items Selection (Only for Pagamento) or Simple Form (Adiantamento) */}
              <div className="lg:col-span-2 space-y-4">
                {paymentMode === "PAGAMENTO" ? (
                  <>
                    <Card className="p-0 overflow-hidden border-neutral-200 shadow-none">
                      <div className="bg-neutral-50 p-3 border-b border-neutral-200 flex justify-between items-center">
                        <h4 className="font-bold text-neutral-600 text-sm flex items-center gap-2">
                          <Calculator size={16} className="text-primary-500" />
                          Comissões Pendentes
                        </h4>
                        {pendentes.filter(
                          (i: any) =>
                            i.ordem_de_servico?.status === "FINALIZADA",
                        ).length > 0 && (
                          <button
                            onClick={() => {
                              const payables = pendentes.filter(
                                (i: any) =>
                                  i.ordem_de_servico?.status === "FINALIZADA",
                              );
                              if (paySelectedItems.length === payables.length)
                                setPaySelectedItems([]);
                              else
                                setPaySelectedItems(
                                  payables.map(
                                    (i: any) => i.id_servico_mao_de_obra,
                                  ),
                                );
                            }}
                            className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline"
                          >
                            Alternar Todos
                          </button>
                        )}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2 space-y-2 bg-neutral-50/50">
                        {pendentes.length === 0 ? (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            Sem comissões.
                          </div>
                        ) : (
                          pendentes.map((item: any) => {
                            const isFinalized =
                              item.ordem_de_servico?.status === "FINALIZADA";
                            const isSelected = paySelectedItems.includes(
                              item.id_servico_mao_de_obra,
                            );
                            const { valorComissao } = getComissaoInfo(
                              selectedFuncId,
                              Number(item.valor),
                            );

                            return (
                              <div
                                key={item.id_servico_mao_de_obra}
                                onClick={() => {
                                  if (!isFinalized) return;
                                  if (isSelected)
                                    setPaySelectedItems((prev) =>
                                      prev.filter(
                                        (id) =>
                                          id !== item.id_servico_mao_de_obra,
                                      ),
                                    );
                                  else
                                    setPaySelectedItems((prev) => [
                                      ...prev,
                                      item.id_servico_mao_de_obra,
                                    ]);
                                }}
                                className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-all ${!isFinalized ? "opacity-50 grayscale cursor-not-allowed bg-neutral-100" : isSelected ? "bg-primary-50 border-primary-200" : "bg-white border-neutral-200 hover:border-primary-200"}`}
                              >
                                <div
                                  className={`mt-1 ${isSelected ? "text-primary-600" : "text-neutral-300"}`}
                                >
                                  {isSelected ? (
                                    <CheckCircle2 size={18} />
                                  ) : (
                                    <Circle size={18} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div className="text-xs font-bold text-neutral-700">
                                      OS #{item.id_os}
                                    </div>
                                    <div className="font-bold text-emerald-600 text-sm">
                                      {formatCurrency(valorComissao)}
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-neutral-500 mt-0.5">
                                    {item.ordem_de_servico?.veiculo?.modelo} -{" "}
                                    {item.ordem_de_servico?.status?.replace(
                                      /_/g,
                                      " ",
                                    )}
                                    {!isFinalized && (
                                      <span className="text-red-500 ml-1 font-bold">
                                        (Em Aberto)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Card>

                    <Card className="p-0 overflow-hidden border-neutral-200 shadow-none">
                      <div className="bg-amber-50 p-3 border-b border-amber-100 flex justify-between items-center">
                        <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2">
                          <AlertCircle size={16} />
                          Descontar Vales
                        </h4>
                        {valesPendentes.length > 0 && (
                          <button
                            onClick={() => {
                              if (
                                paySelectedVales.length ===
                                valesPendentes.length
                              )
                                setPaySelectedVales([]);
                              else
                                setPaySelectedVales(
                                  valesPendentes.map(
                                    (v: any) => v.id_pagamento_equipe,
                                  ),
                                );
                            }}
                            className="text-[10px] font-bold text-amber-700 uppercase tracking-widest hover:underline"
                          >
                            Alternar Todos
                          </button>
                        )}
                      </div>
                      <div className="max-h-[150px] overflow-y-auto p-2 space-y-2">
                        {valesPendentes.length === 0 ? (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            Sem vales pendentes.
                          </div>
                        ) : (
                          valesPendentes.map((v: any) => {
                            const isSelected = paySelectedVales.includes(
                              v.id_pagamento_equipe,
                            );
                            return (
                              <div
                                key={v.id_pagamento_equipe}
                                onClick={() => {
                                  if (isSelected)
                                    setPaySelectedVales((prev) =>
                                      prev.filter(
                                        (id) => id !== v.id_pagamento_equipe,
                                      ),
                                    );
                                  else
                                    setPaySelectedVales((prev) => [
                                      ...prev,
                                      v.id_pagamento_equipe,
                                    ]);
                                }}
                                className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-all ${isSelected ? "bg-amber-50 border-amber-200" : "bg-white border-neutral-200 hover:border-amber-200"}`}
                              >
                                <div
                                  className={`mt-1 ${isSelected ? "text-amber-600" : "text-neutral-300"}`}
                                >
                                  {isSelected ? (
                                    <CheckSquare size={18} />
                                  ) : (
                                    <Square size={18} />
                                  )}
                                </div>
                                <div className="flex-1 flex justify-between">
                                  <div className="text-xs">
                                    <div className="font-bold text-neutral-700">
                                      {new Date(
                                        v.dt_pagamento,
                                      ).toLocaleDateString()}
                                    </div>
                                    <div className="text-neutral-500">
                                      {v.obs || "Vale"}
                                    </div>
                                  </div>
                                  <div className="font-bold text-red-500 text-sm">
                                    - {formatCurrency(Number(v.valor_total))}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Card>
                  </>
                ) : (
                  // ADIANTAMENTO MODE
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Valor do Adiantamento (R$)"
                        type="number"
                        value={payValorAdiantamento}
                        onChange={(e) =>
                          setPayValorAdiantamento(e.target.value)
                        }
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Input
                        label="Data Lançamento"
                        type="date"
                        value={payDataAdiantamento}
                        onChange={(e) => setPayDataAdiantamento(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Values & Summary */}
              <div className="space-y-4">
                <Card className="bg-neutral-50 border-neutral-200 shadow-none">
                  <h4 className="font-bold text-neutral-700 mb-4 block">
                    Valores Adicionais
                  </h4>
                  {paymentMode === "PAGAMENTO" && (
                    <>
                      <div className="mb-4">
                        <div className="mb-4">
                          <Checkbox
                            label="Incluir Salário?"
                            id="chkSal"
                            checked={payIncludeSalary}
                            onChange={(e) =>
                              setPayIncludeSalary((e.target as any).checked)
                            }
                          />
                          <div className="mt-2">
                            <Input
                              disabled={!payIncludeSalary}
                              value={payValorSalario}
                              onChange={(e) =>
                                setPayValorSalario(e.target.value)
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
                          Prêmio / Bônus
                        </label>
                        <Input
                          value={payValorPremio}
                          onChange={(e) => setPayValorPremio(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      {payValorPremio && (
                        <div className="mb-4">
                          <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
                            Motivo Prêmio
                          </label>
                          <Input
                            value={payObsExtra}
                            onChange={(e) => setPayObsExtra(e.target.value)}
                            placeholder="Ex: Meta Batida"
                          />
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <Select
                      label="Forma Pagamento"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="TRANSFERENCIA">Transferência</option>
                    </Select>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
                      Observações
                    </label>
                    <textarea
                      value={payObsPagamento}
                      onChange={(e) => setPayObsPagamento(e.target.value)}
                      className="w-full bg-white border border-neutral-200 p-2 rounded-lg text-sm font-medium outline-none focus:border-neutral-400 resize-none"
                      rows={2}
                    />
                  </div>
                </Card>

                {paymentMode === "PAGAMENTO" && (
                  <div className="bg-neutral-900 text-white rounded-2xl p-6 shadow-xl shadow-neutral-900/10">
                    <div className="space-y-2 mb-4 text-sm text-neutral-400">
                      <div className="flex justify-between">
                        <span>(+) Salário</span>
                        <span>
                          {formatCurrency(
                            payIncludeSalary ? Number(payValorSalario) || 0 : 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>(+) Comissões</span>
                        <span>
                          {formatCurrency(
                            pendentes
                              .filter((i: any) =>
                                paySelectedItems.includes(
                                  i.id_servico_mao_de_obra,
                                ),
                              )
                              .reduce(
                                (acc, curr: any) =>
                                  acc +
                                  getComissaoInfo(
                                    selectedFuncId,
                                    Number(curr.valor),
                                  ).valorComissao,
                                0,
                              ),
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>(+) Prêmios</span>
                        <span>
                          {formatCurrency(Number(payValorPremio) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span>(-) Vales</span>
                        <span>
                          -{" "}
                          {formatCurrency(
                            valesPendentes
                              .filter((v: any) =>
                                paySelectedVales.includes(
                                  v.id_pagamento_equipe,
                                ),
                              )
                              .reduce(
                                (acc, v: any) => acc + Number(v.valor_total),
                                0,
                              ),
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-neutral-800 flex justify-between items-end">
                      <div className="text-xs font-black uppercase tracking-widest text-neutral-500">
                        Total a Pagar
                      </div>
                      <div className="text-2xl font-black">
                        {formatCurrency(calculateTotalPayment())}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowNewPaymentModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon={Save}
                onClick={handleExecutePayment}
              >
                {paymentMode === "PAGAMENTO"
                  ? "Realizar Pagamento"
                  : "Lançar Adiantamento"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
