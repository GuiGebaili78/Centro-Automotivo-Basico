import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { StatusBanner } from "../components/ui/StatusBanner";
import { Modal } from "../components/ui/Modal";
import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import { CategoryManager } from "../components/financeiro/CategoryManager";
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
  ArrowDownCircle,
} from "lucide-react";
import type { IContasPagar } from "../types/backend";

export const ContasAPagarPage = () => {
  const [contas, setContas] = useState<IContasPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("TODOS"); // TODOS, PENDENTE, PAGO
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM"
  >("MONTH");

  // Date Filters - Default to Current Month
  const [filterStart, setFilterStart] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toLocaleDateString("en-CA");
  });

  const [filterEnd, setFilterEnd] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toLocaleDateString("en-CA");
  });

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
      setStatusMsg({ type: "error", text: "Erro ao carregar contas." });
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
        setStatusMsg({
          type: "success",
          text: "Conta atualizada com sucesso!",
        });
      } else {
        await api.post("/contas-pagar", payload);
        setStatusMsg({ type: "success", text: "Conta lançada com sucesso!" });
      }
      setModalOpen(false);
      resetForm();
      loadContas();
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao salvar conta." });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    try {
      await api.delete(`/contas-pagar/${id}`);
      setStatusMsg({ type: "success", text: "Conta excluída." });
      loadContas();
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao excluir conta." });
    }
  };

  const handleQuickPay = (conta: any) => {
    setSelectedConta(conta);
    setPaymentDate(new Date().toISOString().split("T")[0]); // Default to today
    setSelectedBank(""); // Reset bank selection
    setPayModalOpen(true);
  };

  const executePay = async () => {
    if (!selectedConta) return;
    try {
      await api.put(`/contas-pagar/${selectedConta.id_conta_pagar}`, {
        status: "PAGO",
        dt_pagamento: new Date(paymentDate).toISOString(),
        id_conta_bancaria: selectedBank || null,
      });
      setStatusMsg({ type: "success", text: "Conta marcada como PAGA." });
      loadContas();
      setPayModalOpen(false);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao atualizar pagamento." });
    }
  };

  const handleEdit = (conta: IContasPagar) => {
    setEditingId(conta.id_conta_pagar);
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
      dt_vencimento: new Date().toISOString().split("T")[0],
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

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    setActiveFilter(type);
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
    }
  };

  // Calculations
  const filteredContas = contas.filter((c) => {
    // Date Filter (Vencimento)
    if (filterStart) {
      if (c.dt_vencimento < filterStart) return false;
    }
    if (filterEnd) {
      const vencC = c.dt_vencimento.split("T")[0];
      if (vencC > filterEnd) return false;
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

  const totalPending = contas
    .filter((c) => c.status === "PENDENTE")
    .reduce((acc, c) => acc + Number(c.valor), 0);
  const totalPaidMonth = contas
    .filter((c) => {
      if (c.status !== "PAGO" || !c.dt_pagamento) return false;
      const d = new Date(c.dt_pagamento);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((acc, c) => acc + Number(c.valor), 0);

  return (
    <div className="w-full mx-auto px-4 md:px-8 py-6 space-y-6">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

      <CategoryManager
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdate={() => {
          loadCategories();
        }}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-600 tracking-tight">
            Contas a Pagar (Geral)
          </h1>
          <p className="text-neutral-500">
            Gerência de despesas operacionais da oficina.
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
          <Button
            onClick={openNewModal}
            variant="primary"
            icon={Plus}
            className="text-neutral-200"
          >
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
            Total Pendente
          </p>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="bg-primary-50 border border-success-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-success-400 uppercase tracking-widest mb-1">
            Pago este Mês
          </p>
          <p className="text-3xl font-bold text-success-600">
            {formatCurrency(totalPaidMonth)}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      {/* FILTERS & SEARCH */}
      <div className="bg-surface p-4 rounded-xl shadow-sm border border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Descrição, Credor..."
            icon={Search}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {/* Quick Filters Group */}
          <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => applyQuickFilter("TODAY")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "TODAY"
                  ? "bg-primary-200 text-primary-500 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => applyQuickFilter("WEEK")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "WEEK"
                  ? "bg-primary-200 text-primary-500 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => applyQuickFilter("MONTH")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "MONTH"
                  ? "bg-primary-200 text-primary-500 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
              }`}
            >
              Mês
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
              let activeClass = "bg-primary-200 text-primary-600 shadow-sm"; // Default/Todos (Blue like Date Filters)
              if (filterStatus === s) {
                if (s === "PENDENTE")
                  activeClass = "bg-orange-100 text-orange-600 shadow-sm";
                if (s === "PAGO")
                  activeClass = "bg-success-100 text-success-600 shadow-sm";
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
      <div className="bg-surface border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="p-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Vencimento
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Descrição
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Credor / Docs
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-right">
                Valor
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center">
                Status
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
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
                  className="hover:bg-neutral-25 group"
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
                    {conta.dt_pagamento && conta.status === "PAGO" && (
                      <div className="text-[10px] text-success-600 font-bold mt-1">
                        Pago em{" "}
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
                      <div className="text-[10px] text-neutral-500 mt-1 italic max-w-[200px] truncate">
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
                          ? "bg-success-100 text-success-700"
                          : // Check overdue
                            new Date(conta.dt_vencimento) < new Date() &&
                              conta.status !== "PAGO"
                            ? "bg-red-600 text-red-100"
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
                    <div className="flex justify-end gap-2 transition-opacity">
                      {conta.status !== "PAGO" && (
                        <ActionButton
                          onClick={() => handleQuickPay(conta)}
                          icon={CheckCircle}
                          label="Marcar como Pago"
                          variant="primary" // Changed from bg-success-50 text-success-600 to component variant
                        />
                      )}
                      <ActionButton
                        onClick={() => handleEdit(conta)}
                        icon={Edit}
                        label="Editar"
                        variant="accent"
                      />
                      <ActionButton
                        onClick={() => handleDelete(conta.id_conta_pagar)}
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
      </div>

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
                className="font-bold text-neutral-600"
              />
              <Input
                label="Credor"
                value={formData.credor}
                onChange={(e) =>
                  setFormData({ ...formData, credor: e.target.value })
                }
                placeholder="Ex: Fornecedor X"
                className="font-bold text-neutral-600"
              />
            </div>

            {/* 2. Categoria & Valor & Repetição */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12 lg:col-span-5">
                <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                  Categoria
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-bold text-sm h-[42px] outline-none bg-white transition-all"
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
                  className="font-bold text-neutral-600"
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
                  className="font-bold text-neutral-600"
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
                className="font-bold text-neutral-600"
              />
              <Input
                label="Data de Vencimento"
                type="date"
                required
                value={formData.dt_vencimento}
                onChange={(e) =>
                  setFormData({ ...formData, dt_vencimento: e.target.value })
                }
                className="font-bold text-neutral-600"
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
                className="font-bold text-neutral-600"
              />
              <div>
                <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-bold text-sm h-[42px] outline-none bg-white transition-all"
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
                <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                  Forma de Pagamento Prevista
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-bold text-sm h-[42px] outline-none bg-white transition-all"
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
                placeholder="http://..."
                className="font-bold text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Observações
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm h-20 resize-none outline-none bg-white transition-all"
                value={formData.obs}
                onChange={(e) =>
                  setFormData({ ...formData, obs: e.target.value })
                }
                placeholder="Observações adicionais..."
              />
            </div>

            <Button
              variant="primary"
              size="blocks"
              icon={CheckCircle}
              className="text-neutral-200"
            >
              Salvar Conta
            </Button>
          </form>
        </Modal>
      )}

      {/* PAYMENT DATE MODAL */}
      {payModalOpen && selectedConta && (
        <Modal
          title="Confirmar Pagamento"
          onClose={() => setPayModalOpen(false)}
          className="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-neutral-600 mb-4">
                Confirmar pagamento de{" "}
                <span className="font-bold">{selectedConta.descricao}</span>?
              </p>
              <Input
                label="Data do Pagamento"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="font-bold text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Conta Bancária (Opcional)
              </label>

              {/* Only show select if there are active bank accounts */}
              {bankAccounts.filter((a) => a.ativo).length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer text-neutral-600"
                  >
                    <option value="">Sem vínculo (Apenas Caixa)</option>
                    {bankAccounts
                      .filter((acc: any) => acc.ativo) // Only showing active accounts
                      .map((acc: any) => (
                        <option key={acc.id_conta} value={acc.id_conta}>
                          {acc.nome} ({acc.banco})
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <ArrowDownCircle size={14} />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-700 flex items-center gap-2">
                  <span className="font-semibold">Apenas Caixa</span>
                  <span className="text-xs opacity-75">
                    (Nenhum banco ativo disponível)
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={executePay}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
