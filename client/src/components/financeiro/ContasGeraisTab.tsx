import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { FinanceiroService } from "../../services/financeiro.service";
import {
  Modal,
  ActionButton,
  Button,
  Input,
  Card,
  Select,
  Checkbox,
  FilterButton,
} from "../ui";
import { toast } from "react-toastify";
import { CategoryManager } from "../shared/financeiro/CategoryManager";
import {
  Plus,
  Calendar,
  CheckCircle,
  Search,
  Trash2,
  Edit,
  FileText,
  User,
  Settings,
  Square,
  CheckSquare,
  X,
} from "lucide-react";
import type { IContasPagar } from "../../types/backend";
import { ContaPagarModal } from "./ContaPagarModal";

interface ContasGeraisTabProps {
  onUpdate: () => void;
}

export const ContasGeraisTab = ({ onUpdate }: ContasGeraisTabProps) => {
  const [contas, setContas] = useState<IContasPagar[]>([]);
  const [loading, setLoading] = useState(false);

  // Categories
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("PENDENTE"); // TODOS, PENDENTE, PAGO
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "ALL" | "CUSTOM"
  >("ALL");

  // Date Filters - Start empty for ALL filter
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Payment Confirmation Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [paymentValue, setPaymentValue] = useState("");

  // Confirm Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteAllRecurrences, setDeleteAllRecurrences] = useState(false);

  useEffect(() => {
    loadContas();
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await FinanceiroService.getContasBancarias();
      setBankAccounts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadContas = async () => {
    try {
      setLoading(true);
      const data = await FinanceiroService.getContasPagar();
      setContas(data);
    } catch (error) {
      toast.error("Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await FinanceiroService.deleteContaPagar(
        confirmDeleteId,
        deleteAllRecurrences,
      );
      toast.success(
        deleteAllRecurrences ? "Série de contas excluída." : "Conta excluída.",
      );
      loadContas();
      onUpdate();
      setConfirmDeleteId(null);
      setDeleteAllRecurrences(false);
    } catch (error) {
      toast.error("Erro ao excluir conta.");
    }
  };

  const handleQuickPay = (conta: any) => {
    setSelectedConta(conta);
    setPaymentDate(new Date().toISOString().split("T")[0]); // Default to today
    setPaymentValue(Number(conta.valor).toFixed(2));
    setSelectedBank(""); // Reset bank selection
    setPayModalOpen(true);
  };

  const executePay = async () => {
    if (!selectedConta) return;
    try {
      await FinanceiroService.updateContaPagar(selectedConta.id_conta_pagar, {
        status: "PAGO",
        valor: Number(paymentValue),
        dt_pagamento: new Date(paymentDate).toISOString(),
      } as any);

      toast.success("Conta marcada como PAGA.");
      loadContas();
      onUpdate();
      setPayModalOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
    }
  };

  const handleEdit = (conta: IContasPagar) => {
    setEditingId(conta.id_conta_pagar);
    setModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH" | "ALL") => {
    setActiveFilter(type as any);
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA"); // Local YYYY-MM-DD

    if (type === "TODAY") {
      setFilterStart(todayStr);
      setFilterEnd(todayStr);
    } else if (type === "WEEK") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7); // Last 7 days
      setFilterStart(weekStart.toLocaleDateString("en-CA"));
      setFilterEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStart(firstDay.toLocaleDateString("en-CA"));
      setFilterEnd(lastDay.toLocaleDateString("en-CA"));
    } else if (type === "ALL") {
      setFilterStart("");
      setFilterEnd("");
    }
  };

  // Calculations
  const filteredContas = contas.filter((c) => {
    // Date Filter (Vencimento) - Only apply if not ALL
    if (activeFilter !== "ALL") {
      if (filterStart) {
        if (c.dt_vencimento < filterStart) return false;
      }
      if (filterEnd) {
        const vencC = c.dt_vencimento.split("T")[0];
        if (vencC > filterEnd) return false;
      }
    }

    if (filterStatus !== "TODOS" && c.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.descricao.toLowerCase().includes(term) ||
        c.categoria?.toLowerCase().includes(term) ||
        c.credor?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalPending = filteredContas
    .filter((c) => c.status === "PENDENTE")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalPaid = filteredContas
    .filter((c) => c.status === "PAGO")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CategoryManager
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdate={() => {
          onUpdate();
        }}
      />

      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-neutral-700">
            Contas e Despesas
          </h2>
          <p className="text-xs text-neutral-400">
            Gerencie contas a pagar e despesas gerais
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="secondary"
            icon={Settings}
          >
            Categorias
          </Button>
          <Button onClick={openNewModal} variant="primary" icon={Plus}>
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
            Total Pendente (Filtro)
          </p>
          <div className="flex items-center gap-2">
            <Square className="text-red-300" size={20} />
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            Total Pago (Filtro)
          </p>
          <div className="flex items-center gap-2">
            <CheckSquare className="text-emerald-300" size={20} />
            <p className="text-3xl font-bold text-emerald-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div className="w-full md:flex-1">
            <Input
              label="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Descrição, Credor..."
              icon={Search}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">
              Status da Conta
            </label>
            <div className="flex bg-neutral-50 p-1 rounded-xl items-center border border-neutral-200 gap-1">
              {["TODOS", "PENDENTE", "PAGO"].map((s) => (
                <FilterButton
                  key={s}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                >
                  {s}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end md:items-center gap-4 border-t border-neutral-100 pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest min-w-[90px]">
              Vencimento:
            </span>
            <div className="flex bg-neutral-50 p-1 rounded-xl shrink-0 gap-1">
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
              <FilterButton
                active={activeFilter === "ALL"}
                onClick={() => applyQuickFilter("ALL")}
              >
                Todos
              </FilterButton>
            </div>

            <div className="flex gap-2 items-center">
              <div className="w-32">
                <Input
                  type="date"
                  value={filterStart}
                  onChange={(e) => {
                    setFilterStart(e.target.value);
                    setActiveFilter("CUSTOM");
                  }}
                  className={`h-9 font-bold uppercase ${
                    activeFilter === "CUSTOM"
                      ? "border-primary-300 text-primary-700"
                      : ""
                  }`}
                />
              </div>
              <span className="text-neutral-400 self-center">-</span>
              <div className="w-32">
                <Input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => {
                    setFilterEnd(e.target.value);
                    setActiveFilter("CUSTOM");
                  }}
                  className={`h-9 font-bold uppercase ${
                    activeFilter === "CUSTOM"
                      ? "border-primary-300 text-primary-700"
                      : ""
                  }`}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setSearchTerm("");
              setFilterStatus("PENDENTE");
              applyQuickFilter("ALL");
            }}
            variant="outline"
            size="sm"
            icon={X}
            className="md:ml-auto"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <Card className="p-0 overflow-hidden">
        <table className="tabela-limpa w-full">
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Credor / Docs</th>
              <th className="text-right">Valor</th>
              <th className="text-center">Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-400">
                  Carregando...
                </td>
              </tr>
            ) : filteredContas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-neutral-400 italic"
                >
                  Nenhuma conta encontrada.
                </td>
              </tr>
            ) : (
              filteredContas.map((conta) => (
                <tr
                  key={conta.id_conta_pagar}
                  className="hover:bg-neutral-50 transition-colors group"
                >
                  <td className="p-4">
                    <div className="font-bold text-neutral-700 text-sm flex items-center gap-2">
                      <Calendar size={14} className="text-neutral-400" />
                      {new Date(conta.dt_vencimento)
                        .getUTCDate()
                        .toString()
                        .padStart(2, "0")}
                      /
                      {(new Date(conta.dt_vencimento).getUTCMonth() + 1)
                        .toString()
                        .padStart(2, "0")}
                      /{new Date(conta.dt_vencimento).getUTCFullYear()}
                    </div>
                    {conta.dt_cadastro && (
                      <div className="text-[10px] text-neutral-400 mt-0.5 ml-6">
                        Criado:{" "}
                        {new Date(conta.dt_cadastro).toLocaleDateString()}
                      </div>
                    )}
                    {conta.dt_pagamento && conta.status === "PAGO" && (
                      <div className="text-[10px] text-emerald-600 font-bold mt-1 ml-6">
                        Pago:{" "}
                        {new Date(conta.dt_pagamento).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-neutral-900">
                      {conta.descricao}
                      {conta.id_grupo_recorrencia && (
                        <span className="ml-2 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Recorrente
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase bg-neutral-100 px-2 py-0.5 rounded w-fit mt-1">
                      {conta.categoria}
                    </div>
                    {conta.obs && (
                      <div className="text-[14px] text-neutral-500 mt-1 italic max-w-[200px] truncate">
                        {conta.obs}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {conta.credor && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 mb-1">
                        <User size={12} className="text-neutral-400" />{" "}
                        {conta.credor}
                      </div>
                    )}
                    {conta.num_documento && (
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold">
                        <FileText size={12} className="text-neutral-400" /> Doc:{" "}
                        {conta.num_documento}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-neutral-600">
                    {formatCurrency(Number(conta.valor))}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        conta.status === "PAGO"
                          ? "bg-green-100 text-green-700"
                          : conta.status === "ATRASADO"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {conta.status === "PAGO"
                        ? "PAGO"
                        : new Date(conta.dt_vencimento) < new Date()
                          ? "ATRASADO"
                          : "PENDENTE"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {conta.status !== "PAGO" && (
                        <ActionButton
                          onClick={() => handleQuickPay(conta)}
                          icon={CheckCircle}
                          label="Pagar"
                          variant="primary"
                        />
                      )}
                      <ActionButton
                        onClick={() => handleEdit(conta)}
                        icon={Edit}
                        label="Editar"
                        variant="accent"
                      />
                      <ActionButton
                        onClick={() => setConfirmDeleteId(conta.id_conta_pagar)}
                        icon={Trash2}
                        label="Excluir"
                        variant="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* CONFIRM DELETE MODAL */}
      {!!confirmDeleteId && (
        <Modal
          title="Confirmar Exclusão"
          onClose={() => {
            setConfirmDeleteId(null);
            setDeleteAllRecurrences(false);
          }}
        >
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir esta conta?</p>
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                label="Excluir toda a série (Recorrência)?"
                id="delSeries"
                checked={deleteAllRecurrences}
                onChange={(e) =>
                  setDeleteAllRecurrences((e.target as any).checked)
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setDeleteAllRecurrences(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* PAY MODAL */}
      {payModalOpen && selectedConta && (
        <Modal
          title="Registrar Pagamento"
          onClose={() => setPayModalOpen(false)}
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                Valor Pago
              </label>
              <Input
                type="number"
                value={paymentValue}
                onChange={(e) => setPaymentValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                Data Pagamento
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Select
                label="Conta Bancária (Opcional)"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
              >
                <option value="">Selecione...</option>
                {bankAccounts.map((b: any) => (
                  <option key={b.id_conta_bancaria} value={b.id_conta_bancaria}>
                    {b.nome_banco} - {b.agencia}/{b.conta}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={executePay}>
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ContaPagarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          loadContas();
          onUpdate();
        }}
        editingId={editingId}
      />
    </div>
  );
};
