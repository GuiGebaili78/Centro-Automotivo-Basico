import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { api } from "../../services/api"; // Keep for categories/banks for now or move to service
import { FinanceiroService } from "../../services/financeiro.service";
import { Modal } from "../ui/Modal";
import { ActionButton } from "../ui/ActionButton";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CategoryManager } from "../shared/financeiro/CategoryManager";
import { CategorySelector } from "../shared/financeiro/CategorySelector";
import { Card } from "../ui/Card";
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
  Settings,
  Square,
  CheckSquare,
} from "lucide-react";
import type { IContaPagar } from "../../types/financeiro.types";
import type { IRecurrenceInfo } from "../../types/backend";

interface ContasGeraisTabProps {
  onUpdate: () => void;
  // If we want to lift state up we can, but for now filtering is local to this tab
}

export const ContasGeraisTab = ({ onUpdate }: ContasGeraisTabProps) => {
  const [contas, setContas] = useState<IContaPagar[]>([]);
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
    id_categoria: undefined as number | undefined,
    valor: "",
    dt_emissao: "",
    dt_vencimento: "",
    num_documento: "",
    status: "PENDENTE",
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
  const [deleteAllRecurrences, setDeleteAllRecurrences] = useState(false);

  // Recurrence Management
  const [recurrenceInfo, setRecurrenceInfo] = useState<IRecurrenceInfo | null>(
    null,
  );
  const [applyToAllRecurrences, setApplyToAllRecurrences] = useState(false);

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
      const data = await FinanceiroService.getContasPagar();
      setContas(data);
    } catch (error) {
      toast.error("Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
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
        await FinanceiroService.updateContaPagar(editingId, payload);
        toast.success(
          applyToAllRecurrences
            ? "Série de contas atualizada com sucesso!"
            : "Conta atualizada com sucesso!",
        );
      } else {
        await FinanceiroService.createContaPagar(payload);
        toast.success("Conta lançada com sucesso!");
      }
      setModalOpen(false);
      resetForm();
      loadContas();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar conta.");
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
        // id_conta_bancaria: selectedBank || null, // Ensure backend supports this field if added to interface
        // Note: IContaPagar interface might strictly not have id_conta_bancaria unless added,
        // but backend likely accepts it. We'll cast to any if needed or update interface.
      } as any);

      toast.success("Conta marcada como PAGA.");
      loadContas();
      onUpdate();
      setPayModalOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
    }
  };

  const handleEdit = async (conta: IContaPagar) => {
    setEditingId(conta.id_conta_pagar);

    // Load recurrence information
    try {
      const info = await FinanceiroService.getRecurrenceInfo(
        conta.id_conta_pagar,
      );
      setRecurrenceInfo(info);
    } catch (error) {
      setRecurrenceInfo(null);
    }

    setFormData({
      descricao: conta.descricao,
      credor: conta.credor || "",
      categoria: conta.categoria || "OUTROS",
      id_categoria: conta.id_categoria || undefined,
      valor: Number(conta.valor).toFixed(2),
      dt_emissao: conta.dt_emissao
        ? new Date(conta.dt_emissao).toISOString().split("T")[0]
        : "",
      dt_vencimento: new Date(conta.dt_vencimento).toISOString().split("T")[0],
      num_documento: conta.num_documento || "",
      status: conta.status,
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
      id_categoria: undefined,
      valor: "",
      dt_emissao: new Date().toISOString().split("T")[0],
      dt_vencimento: new Date().toISOString().split("T")[0], // Default today
      num_documento: "",
      status: "PENDENTE",
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CategoryManager
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdate={() => {
          loadCategories();
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:flex-1 relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Descrição, Credor..."
            icon={Search}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {/* Quick Filters Group */}
          <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
            {["TODAY", "WEEK", "MONTH", "ALL"].map((type) => (
              <button
                key={type}
                onClick={() => applyQuickFilter(type as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeFilter === type
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {type === "TODAY"
                  ? "Hoje"
                  : type === "WEEK"
                    ? "Semana"
                    : type === "MONTH"
                      ? "Mês"
                      : "Todos"}
              </button>
            ))}
          </div>

          {/* Manual Date Inputs */}
          <div className="hidden md:flex gap-2 items-center">
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
          <div className="flex bg-neutral-100 p-1.5 rounded-xl h-[42px] items-center ml-2 border border-neutral-200">
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
                      : "text-neutral-400 hover:text-neutral-700"
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
                      {conta.id_recorrencia && (
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
              <input
                type="checkbox"
                id="delSeries"
                checked={deleteAllRecurrences}
                onChange={(e) => setDeleteAllRecurrences(e.target.checked)}
                className="rounded text-red-600 border-neutral-300"
              />
              <label
                htmlFor="delSeries"
                className="text-sm text-neutral-600 font-bold"
              >
                Excluir toda a série (Recorrência)?
              </label>
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
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                Conta Bancária (Opcional)
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-sm"
              >
                <option value="">Selecione...</option>
                {bankAccounts.map((b: any) => (
                  <option key={b.id_conta_bancaria} value={b.id_conta_bancaria}>
                    {b.nome_banco} - {b.agencia}/{b.conta}
                  </option>
                ))}
              </select>
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

      {/* EDIT/NEW MODAL */}
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
                <CategorySelector
                  categories={categories}
                  value={formData.id_categoria}
                  onChange={(id, nome) => {
                    // Find the category object to check for parent
                    const cat = categories.find((c) => c.id_categoria === id);
                    let fullCategoryName = nome;

                    if (cat && cat.parentId) {
                      const parent = categories.find(
                        (c) => c.id_categoria === cat.parentId,
                      );
                      if (parent) {
                        fullCategoryName = `${parent.nome} - ${nome}`;
                      }
                    }

                    setFormData({
                      ...formData,
                      id_categoria: id,
                      categoria: fullCategoryName,
                    });
                  }}
                  type="AMBOS"
                  required
                />
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

            {/* 5. Anexos Only */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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

            {/* 6. Recurrence Update Option */}
            {editingId && recurrenceInfo && (
              <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editSeries"
                  checked={applyToAllRecurrences}
                  onChange={(e) => setApplyToAllRecurrences(e.target.checked)}
                  className="rounded border-blue-400 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="editSeries"
                  className="text-sm font-bold text-blue-800"
                >
                  Aplicar alterações para toda a série (Recorrência)?
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar Conta
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
