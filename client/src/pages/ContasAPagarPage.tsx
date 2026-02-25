import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { FinanceiroService } from "../services/financeiro.service";
import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { CategoryManager } from "../components/shared/financeiro/CategoryManager";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { ModalPagamentoUnificado } from "../components/shared/financeiro/ModalPagamentoUnificado";
import { toast } from "react-toastify";
import {
  Plus,
  Calendar,
  CheckCircle,
  Search,
  Trash2,
  Edit,
  FileText,
  User,
  Link,
  Settings,
} from "lucide-react";
import type { IContasPagar } from "../types/backend";
import { ContaPagarModal } from "../components/financeiro/ContaPagarModal";

export const ContasAPagarPage = () => {
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
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

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
      setConfirmDeleteId(null);
      setDeleteAllRecurrences(false);
    } catch (error) {
      toast.error("Erro ao excluir conta.");
    }
  };

  const handleQuickPay = (conta: any) => {
    setSelectedConta(conta);
    setPayModalOpen(true);
  };

  const executePay = async (data: {
    accountId: number;
    date: string;
    discountValue: number;
  }) => {
    if (!selectedConta) return;
    try {
      // O valor final pago é o valor da conta menos o desconto
      const valorFinal = Number(selectedConta.valor) - data.discountValue;

      await FinanceiroService.updateContaPagar(selectedConta.id_conta_pagar, {
        status: "PAGO",
        valor: valorFinal,
        dt_pagamento: new Date(data.date).toISOString(),
        id_conta_bancaria: data.accountId || null,
      });
      toast.success("Conta marcada como PAGA.");
      loadContas();
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
    <PageLayout
      title="Contas a Pagar"
      subtitle="Gerencie despesas operacionais da oficina."
      actions={
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
      }
    >
      <CategoryManager
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdate={() => {
          loadContas();
        }}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
            Total Pendente (Filtro)
          </p>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            Total Pago (Filtro)
          </p>
          <p className="text-3xl font-bold text-emerald-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="w-full md:flex-1 relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Descrição, Credor..."
            icon={Search}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {/* Quick Filters Group */}
          <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => applyQuickFilter("TODAY")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "TODAY"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => applyQuickFilter("WEEK")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "WEEK"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => applyQuickFilter("MONTH")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "MONTH"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => applyQuickFilter("ALL")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "ALL"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Todos
            </button>
          </div>

          {/* Manual Date Inputs */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={filterStart}
              onChange={(e) => {
                setFilterStart(e.target.value);
                setActiveFilter("CUSTOM");
              }}
              className={`h-10 px-3 rounded-lg border text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors ${
                activeFilter === "CUSTOM"
                  ? "border-primary-300 text-primary-700"
                  : "border-neutral-200 text-neutral-600"
              }`}
            />
            <span className="text-neutral-400 self-center">-</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => {
                setFilterEnd(e.target.value);
                setActiveFilter("CUSTOM");
              }}
              className={`h-10 px-3 rounded-lg border text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors ${
                activeFilter === "CUSTOM"
                  ? "border-primary-300 text-primary-700"
                  : "border-neutral-200 text-neutral-600"
              }`}
            />
          </div>

          {/* Status Type */}
          <div className="flex bg-neutral-100 p-1.5 rounded-xl h-[42px] items-center ml-2">
            {["TODOS", "PENDENTE", "PAGO"].map((s) => {
              let activeClass = "bg-white text-primary-600 shadow-sm";
              if (filterStatus === s) {
                if (s === "PENDENTE")
                  activeClass = "bg-white text-orange-600 shadow-sm";
                if (s === "PAGO")
                  activeClass = "bg-white text-emerald-600 shadow-sm";
              }

              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${
                    filterStatus === s
                      ? activeClass
                      : "text-neutral-400 hover:text-neutral-700 hover:bg-black/5"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
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
                      {/* Fix Timezone Display: Use UTC to calculate date */}
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
                    {conta.dt_vencimento && conta.dt_cadastro && (
                      <div className="text-[10px] text-neutral-400 mt-0.5 ml-6">
                        {new Date(conta.dt_cadastro).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    )}
                    {conta.dt_pagamento && conta.status === "PAGO" && (
                      <div className="text-[10px] text-emerald-600 font-bold mt-1 ml-6">
                        Pago em:{" "}
                        {new Date(conta.dt_pagamento)
                          .getUTCDate()
                          .toString()
                          .padStart(2, "0")}
                        /
                        {(new Date(conta.dt_pagamento).getUTCMonth() + 1)
                          .toString()
                          .padStart(2, "0")}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-neutral-900">
                      {conta.descricao}
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
                    {conta.url_anexo && (
                      <a
                        href={conta.url_anexo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold hover:underline mt-1"
                      >
                        <Link size={12} /> Ver Anexo
                      </a>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-neutral-600">
                    {formatCurrency(Number(conta.valor))}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        conta.status === "PAGO"
                          ? "bg-emerald-100 text-emerald-700"
                          : // Check overdue
                            new Date(conta.dt_vencimento) < new Date() &&
                              conta.status !== "PAGO"
                            ? "bg-red-100 text-red-600"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {conta.status === "PAGO"
                        ? "PAGO"
                        : new Date(conta.dt_vencimento) < new Date() &&
                            conta.status !== "PAGO"
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
                          label="Marcar como Pago"
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

      <ContaPagarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadContas}
        editingId={editingId}
      />

      {/* Modal de Pagamento Unificado */}
      <ModalPagamentoUnificado
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onConfirm={executePay}
        totalAmount={Number(selectedConta?.valor || 0)}
        bankAccounts={bankAccounts}
        title="Baixa de Conta a Pagar"
        showDiscount={true}
        isLoading={loading}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => {
          setConfirmDeleteId(null);
          setDeleteAllRecurrences(false);
        }}
        onConfirm={handleDelete}
        title="Excluir Conta"
        description={
          <div className="space-y-3">
            <p>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser
              desfeita.
            </p>

            {/* Check if recurring */}
            {confirmDeleteId &&
              contas.find(
                (c) =>
                  c.id_conta_pagar === confirmDeleteId &&
                  (c.id_grupo_recorrencia ||
                    c.obs?.match(/\(Recorrência \d+\/\d+\)/)),
              ) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-900 mb-2">
                    Esta conta faz parte de uma série recorrente.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deleteAllRecurrences}
                      onChange={(e) =>
                        setDeleteAllRecurrences(e.target.checked)
                      }
                      className="w-4 h-4 rounded border-yellow-300 text-yellow-600 focus:ring-2 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-yellow-900">
                      Excluir todas as parcelas desta série
                    </span>
                  </label>
                </div>
              )}
          </div>
        }
        confirmText={deleteAllRecurrences ? "Excluir Série" : "Excluir"}
        variant="danger"
      />
    </PageLayout>
  );
};
