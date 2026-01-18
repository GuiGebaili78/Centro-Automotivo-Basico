import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { StatusBanner } from "../components/ui/StatusBanner";
import { Modal } from "../components/ui/Modal";
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
} from "lucide-react";
import type { IContasPagar } from "../types/backend";

export const ContasAPagarPage = () => {
  const [contas, setContas] = useState<IContasPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // Filters
  const [filterStatus, setFilterStatus] = useState("TODOS"); // TODOS, PENDENTE, PAGO
  const [searchTerm, setSearchTerm] = useState("");

  // Date Filters - Default to Current Month
  const date = new Date();
  const firstDayCurrent = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  ).toLocaleDateString("en-CA");
  const lastDayCurrent = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).toLocaleDateString("en-CA");

  const [filterStart, setFilterStart] = useState(firstDayCurrent);
  const [filterEnd, setFilterEnd] = useState(lastDayCurrent);

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
  });

  useEffect(() => {
    loadContas();
  }, []);

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

  const handleQuickPay = async (conta: any) => {
    try {
      await api.put(`/contas-pagar/${conta.id_conta_pagar}`, {
        status: "PAGO",
        dt_pagamento: new Date().toISOString(),
      });
      setStatusMsg({ type: "success", text: "Conta marcada como PAGA." });
      loadContas();
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
    });
  };

  const openNewModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA"); // Local YYYY-MM-DD

    if (type === "TODAY") {
      setFilterStart(todayStr);
      setFilterEnd(todayStr);
    } else if (type === "WEEK") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(now);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week
      setFilterStart(weekStart.toLocaleDateString("en-CA"));
      setFilterEnd(weekEnd.toLocaleDateString("en-CA"));
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

  const categories = [
    "AGUA",
    "LUZ",
    "ALUGUEL",
    "INTERNET",
    "CONTADOR",
    "SALARIO",
    "MANUTENCAO",
    "OUTROS",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Contas a Pagar (Geral)
          </h1>
          <p className="text-neutral-500">
            Gerência de despesas operacionais da oficina.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <Plus size={20} /> Nova Conta
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">
            Total Pendente
          </p>
          <p className="text-3xl font-black text-red-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="bg-success-50 border border-success-100 p-6 rounded-2xl">
          <p className="text-xs font-black text-success-400 uppercase tracking-widest mb-1">
            Pago este Mês
          </p>
          <p className="text-3xl font-black text-success-600">
            {formatCurrency(totalPaidMonth)}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                Buscar
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={16}
                />
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm focus:border-primary-500 outline-none"
                  placeholder="Descrição, Credor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Date Inputs */}
            <div className="flex gap-2">
              <div>
                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                  Venc. De
                </label>
                <input
                  type="date"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600 focus:bg-white outline-none focus:border-primary-500 uppercase h-[42px]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                  Até
                </label>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600 focus:bg-white outline-none focus:border-primary-500 uppercase h-[42px]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto items-end">
            {/* Quick Filters */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block lg:hidden">
                Período
              </label>
              <div className="flex bg-neutral-100 p-1.5 rounded-xl h-[42px] items-center">
                <button
                  onClick={() => applyQuickFilter("TODAY")}
                  className="px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm text-neutral-500 hover:text-neutral-900 transition-all"
                >
                  Hoje
                </button>
                <button
                  onClick={() => applyQuickFilter("WEEK")}
                  className="px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm text-neutral-500 hover:text-neutral-900 transition-all"
                >
                  Semana
                </button>
                <button
                  onClick={() => applyQuickFilter("MONTH")}
                  className="px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm text-neutral-500 hover:text-neutral-900 transition-all"
                >
                  Mês
                </button>
              </div>
            </div>

            {/* Status Type */}
            <div>
              <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block lg:hidden">
                Status
              </label>
              <div className="flex bg-neutral-100 p-1.5 rounded-xl h-[42px] items-center">
                {["TODOS", "PENDENTE", "PAGO"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-colors ${filterStatus === s ? "bg-white shadow-sm text-neutral-900" : "text-neutral-400 hover:text-neutral-700"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                Vencimento
              </th>
              <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                Descrição
              </th>
              <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                Credor / Docs
              </th>
              <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">
                Valor
              </th>
              <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">
                Status
              </th>
              <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">
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
                  <td className="p-4 text-right font-black text-neutral-800">
                    {formatCurrency(Number(conta.valor))}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        conta.status === "PAGO"
                          ? "bg-success-100 text-success-700"
                          : // Check overdue
                            new Date(conta.dt_vencimento) < new Date() &&
                              conta.status !== "PAGO"
                            ? "bg-red-100 text-red-600"
                            : "bg-warning-100 text-warning-700"
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
                        <button
                          onClick={() => handleQuickPay(conta)}
                          className="p-2 bg-success-50 text-success-600 rounded-lg hover:bg-success-100"
                          title="Marcar como Pago"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(conta)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(conta.id_conta_pagar)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
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
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Descrição / Título
                </label>
                <input
                  required
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Ex: Compra Material Limpeza"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Credor
                </label>
                <input
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                  value={formData.credor}
                  onChange={(e) =>
                    setFormData({ ...formData, credor: e.target.value })
                  }
                  placeholder="Ex: Fornecedor X"
                />
              </div>
            </div>

            {/* 2. Categoria & Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Categoria
                </label>
                <select
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm h-[50px]"
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Valor do Título (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-black text-neutral-800"
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
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                  value={formData.dt_emissao}
                  onChange={(e) =>
                    setFormData({ ...formData, dt_emissao: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                  value={formData.dt_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, dt_vencimento: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 4. Documento & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Número do Documento
                </label>
                <input
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                  value={formData.num_documento}
                  onChange={(e) =>
                    setFormData({ ...formData, num_documento: e.target.value })
                  }
                  placeholder="Nota Fiscal / Boleto"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Status
                </label>
                <select
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm h-[50px]"
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
                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                  Forma de Pagamento Prevista
                </label>
                <select
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm h-[50px]"
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
              <div>
                <label className="text-xs font-bold text-neutral-500 mb-1 uppercase flex gap-2">
                  Arquivos / Anexos{" "}
                  <span className="text-neutral-300 font-normal">
                    (Link URL por enquanto)
                  </span>
                </label>
                <div className="relative">
                  <Upload
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    size={16}
                  />
                  <input
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                    value={formData.url_anexo}
                    onChange={(e) =>
                      setFormData({ ...formData, url_anexo: e.target.value })
                    }
                    placeholder="http://..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">
                Observações
              </label>
              <textarea
                className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-medium text-sm h-20 resize-none"
                value={formData.obs}
                onChange={(e) =>
                  setFormData({ ...formData, obs: e.target.value })
                }
                placeholder="Observações adicionais..."
              />
            </div>

            <button className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2">
              <CheckCircle size={20} /> Salvar Conta
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
