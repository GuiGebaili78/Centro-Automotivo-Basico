import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { Modal } from "../components/ui/Modal";
import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { CategoryManager } from "../components/financeiro/CategoryManager";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import {
  Plus,
  Calendar,
  CheckCircle,
  Search,
  Trash2,
  Edit,
  FileText,
  Upload,
  User,
  Link,
  Settings,
} from "lucide-react";
import type { IContasPagar, IRecurrenceInfo } from "../types/backend";

export const ContasAPagarPage = () => {
  const [contas, setContas] = useState<IContasPagar[]>([]);
  const [loading, setLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
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
  const [formData, setFormData] = useState({
    descricao: "",
    credor: "",
    categoria: "OUTROS",
    valor: "",
    dt_emissao: "",
    dt_vencimento: "",
    num_documento: "",
    status: "PENDENTE",
    forma_pagamento: "",
    dt_pagamento: "",
    url_anexo: "",
    obs: "",
    repetir_parcelas: 0,
  });

  // Payment Confirmation Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [paymentValue, setPaymentValue] = useState("");

  // Confirm Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Recurrence Management
  const [recurrenceInfo, setRecurrenceInfo] = useState<IRecurrenceInfo | null>(
    null,
  );
  const [applyToAllRecurrences, setApplyToAllRecurrences] = useState(false);
  const [deleteAllRecurrences, setDeleteAllRecurrences] = useState(false);

  useEffect(() => {
    loadContas();
    loadAccounts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get("/categoria-financeira");
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.get("/conta-bancaria");
      setBankAccounts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadContas = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contas-pagar");
      setContas(res.data);
    } catch (error) {
      toast.error("Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        valor: Number(formData.valor),
        applyToAllRecurrences, // Add flag for series update
        // Enforce NULL payment date if status is not PAGO
        dt_pagamento:
          formData.status === "PAGO"
            ? formData.dt_pagamento
              ? new Date(formData.dt_pagamento).toISOString()
              : new Date().toISOString()
            : null,
        dt_vencimento: new Date(formData.dt_vencimento).toISOString(),
        dt_emissao: formData.dt_emissao
          ? new Date(formData.dt_emissao).toISOString()
          : null,
      };

      if (editingId) {
        await api.put(`/contas-pagar/${editingId}`, payload);
        toast.success(
          applyToAllRecurrences
            ? "Série de contas atualizada com sucesso!"
            : "Conta atualizada com sucesso!",
        );
      } else {
        await api.post("/contas-pagar", payload);
        toast.success("Conta lançada com sucesso!");
      }
      setModalOpen(false);
      resetForm();
      loadContas();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar conta.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(
        `/contas-pagar/${confirmDeleteId}${deleteAllRecurrences ? "?deleteAllRecurrences=true" : ""}`,
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
    setPaymentDate(new Date().toISOString().split("T")[0]); // Default to today
    setPaymentValue(Number(conta.valor).toFixed(2));
    setSelectedBank(""); // Reset bank selection
    setPayModalOpen(true);
  };

  const executePay = async () => {
    if (!selectedConta) return;
    try {
      await api.put(`/contas-pagar/${selectedConta.id_conta_pagar}`, {
        status: "PAGO",
        valor: Number(paymentValue),
        dt_pagamento: new Date(paymentDate).toISOString(),
        id_conta_bancaria: selectedBank || null,
      });
      toast.success("Conta marcada como PAGA.");
      loadContas();
      setPayModalOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
    }
  };

  const handleEdit = async (conta: IContasPagar) => {
    setEditingId(conta.id_conta_pagar);

    // Load recurrence information
    try {
      const res = await api.get(
        `/contas-pagar/${conta.id_conta_pagar}/recurrence-info`,
      );
      setRecurrenceInfo(res.data);
    } catch (error) {
      setRecurrenceInfo(null);
    }

    setFormData({
      descricao: conta.descricao,
      credor: conta.credor || "",
      categoria: conta.categoria || "OUTROS",
      valor: Number(conta.valor).toFixed(2),
      dt_emissao: conta.dt_emissao
        ? new Date(conta.dt_emissao).toISOString().split("T")[0]
        : "",
      dt_vencimento: new Date(conta.dt_vencimento).toISOString().split("T")[0],
      num_documento: conta.num_documento || "",
      status: conta.status,
      forma_pagamento: conta.forma_pagamento || "",
      dt_pagamento: conta.dt_pagamento
        ? new Date(conta.dt_pagamento).toISOString().split("T")[0]
        : "",
      url_anexo: conta.url_anexo || "",
      obs: conta.obs || "",
      repetir_parcelas: 0,
    });
    setApplyToAllRecurrences(false);
    setModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      descricao: "",
      credor: "",
      categoria: "OUTROS",
      valor: "",
      dt_emissao: new Date().toISOString().split("T")[0],
      dt_vencimento: new Date().toISOString().split("T")[0], // Default today
      num_documento: "",
      status: "PENDENTE",
      forma_pagamento: "",
      dt_pagamento: "",
      url_anexo: "",
      obs: "",
      repetir_parcelas: 0,
    });
  };

  const openNewModal = () => {
    resetForm();
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
          loadCategories();
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
                activeFilter === ("ALL" as any)
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

      {/* MODAL */}
      {modalOpen && (
        <Modal
          title={editingId ? "Editar Conta" : "Nova Conta a Pagar"}
          onClose={() => setModalOpen(false)}
          className="max-w-2xl"
        >
          <form onSubmit={handleSave} className="space-y-6 pt-4">
            {/* 1. Descrição & Credor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Descrição / Título"
                required
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Ex: Compra Material Limpeza"
              />
              <Input
                label="Credor"
                value={formData.credor}
                onChange={(e) =>
                  setFormData({ ...formData, credor: e.target.value })
                }
                placeholder="Ex: Fornecedor X"
              />
            </div>

            {/* 2. Categoria & Valor & Repetição */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12 lg:col-span-5">
                <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
                  Categoria
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm h-[42px] outline-none bg-white transition-all"
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                >
                  {categories.map((c) => (
                    <option key={c.id_categoria} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-6 lg:col-span-3">
                <Input
                  label="Repetir (Meses)"
                  type="number"
                  min={0}
                  max={60}
                  value={formData.repetir_parcelas}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      repetir_parcelas: Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  title="Cria cópias desta conta para os próximos meses"
                />
              </div>

              <div className="md:col-span-6 lg:col-span-4">
                <Input
                  label="Valor do Título (R$)"
                  type="number"
                  step="0.01"
                  required
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 3. Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Data de Emissão"
                type="date"
                value={formData.dt_emissao}
                onChange={(e) =>
                  setFormData({ ...formData, dt_emissao: e.target.value })
                }
              />
              <Input
                label="Data de Vencimento"
                type="date"
                required
                value={formData.dt_vencimento}
                onChange={(e) =>
                  setFormData({ ...formData, dt_vencimento: e.target.value })
                }
              />
            </div>

            {/* 4. Documento & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Número do Documento"
                value={formData.num_documento}
                onChange={(e) =>
                  setFormData({ ...formData, num_documento: e.target.value })
                }
                placeholder="Nota Fiscal / Boleto"
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm h-[42px] outline-none bg-white transition-all"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                </select>
              </div>
            </div>

            {/* 5. Forma Pagto & Anexos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
                  Forma de Pagamento Prevista
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm h-[42px] outline-none bg-white transition-all"
                  value={formData.forma_pagamento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      forma_pagamento: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione...</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>
              <Input
                label="Arquivos / Anexos (URL)"
                icon={Upload}
                value={formData.url_anexo}
                onChange={(e) =>
                  setFormData({ ...formData, url_anexo: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            {/* 6. Obs */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
                Observações
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm outline-none bg-white h-24 resize-none transition-all"
                value={formData.obs}
                onChange={(e) =>
                  setFormData({ ...formData, obs: e.target.value })
                }
                placeholder="Detalhes adicionais..."
              />
            </div>

            {/* Recurrence Info */}
            {editingId && recurrenceInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Calendar className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 text-sm mb-1">
                      Conta Recorrente
                    </h4>
                    <p className="text-xs text-blue-700 mb-3">
                      Esta conta faz parte de uma série de{" "}
                      {recurrenceInfo.total_parcelas} parcelas (parcela{" "}
                      {recurrenceInfo.numero_parcela} de{" "}
                      {recurrenceInfo.total_parcelas})
                    </p>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyToAllRecurrences}
                        onChange={(e) =>
                          setApplyToAllRecurrences(e.target.checked)
                        }
                        className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-900">
                        Aplicar alterações a todas as parcelas
                      </span>
                    </label>

                    {applyToAllRecurrences && (
                      <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                        ⚠️ As datas de vencimento serão mantidas conforme a
                        série original, mas valor, categoria e status serão
                        atualizados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex justify-end gap-2 border-t pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL PAGAMENTO */}
      {payModalOpen && (
        <Modal
          title="Baixa de Pagamento"
          onClose={() => setPayModalOpen(false)}
          className="max-w-md"
        >
          <div className="space-y-6 pt-2">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">
                Referência
              </p>
              <p className="text-lg font-bold text-neutral-700">
                {selectedConta?.descricao}
              </p>
              <p className="text-sm text-neutral-500">
                {selectedConta?.credor}
              </p>
            </div>

            <div>
              <label className="text-[0.75rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                Valor do Pagamento
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xl">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-emerald-300/50"
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                />
              </div>
            </div>

            <Input
              label="Data do Pagamento"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
                Conta Bancária de Saída
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm h-[42px] outline-none bg-white transition-all"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
              >
                <option value="">Selecione a conta...</option>
                {bankAccounts.map((b) => (
                  <option key={b.id_conta} value={b.id_conta}>
                    {b.nome} ({b.banco}) - Saldo:{" "}
                    {formatCurrency(Number(b.saldo_atual))}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={executePay} variant="primary">
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
