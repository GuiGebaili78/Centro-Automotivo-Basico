import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { StatusBanner } from "../components/ui/StatusBanner";
import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import {
  Search,
  Truck,
  Calendar,
  CheckSquare,
  Square,
  Edit,
  Trash2,
  Save,
  DollarSign,
  X,
} from "lucide-react";
import { Modal } from "../components/ui/Modal";

export const PagamentoPecaPage = () => {
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });
  const [loading, setLoading] = useState(false);

  // --- STATES FOR ACCOUNTS PAYABLE (PEÇAS) ---
  const [payments, setPayments] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]); // Bank Accounts

  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterPlate, setFilterPlate] = useState("");
  const [filterStatus, setFilterStatus] = useState<"PENDING" | "PAID" | "ALL">(
    "PENDING",
  );

  // NEW FILTERS & QUICK FILTER
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM"
  >("WEEK");

  const [filterOSStart, setFilterOSStart] = useState(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return weekAgo.toLocaleDateString("en-CA");
  });
  const [filterOSEnd, setFilterOSEnd] = useState(() => {
    return new Date().toLocaleDateString("en-CA");
  });

  const [filterPayStart, setFilterPayStart] = useState("");
  const [filterPayEnd, setFilterPayEnd] = useState("");

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Payment Confirmation Modal
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    accountId: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  // Clear selection when filters change (optional, but safer to avoid hidden selections)
  useEffect(() => {
    setSelectedIds([]);
  }, [
    filterStatus,
    filterSupplier,
    filterPlate,
    filterOSStart,
    filterOSEnd,
    filterPayStart,
    filterPayEnd,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, fornecedoresRes, accountsRes] = await Promise.all([
        api.get("/pagamento-peca"),
        api.get("/fornecedor"),
        api.get("/conta-bancaria"),
      ]);
      setPayments(paymentsRes.data);
      setFornecedores(fornecedoresRes.data);
      setAccounts(accountsRes.data.filter((a: any) => a.ativo));
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: "Erro ao carregar dados financeiros.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const clearFilters = () => {
    setFilterStatus("PENDING");
    setFilterSupplier("");
    setFilterPlate("");
    // Reset to week default logic or clear all?
    // Usually "Clear" implies reset to default state
    setActiveFilter("WEEK");
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    setFilterOSStart(weekAgo.toLocaleDateString("en-CA"));
    setFilterOSEnd(now.toLocaleDateString("en-CA"));
    setFilterPayStart("");
    setFilterPayEnd("");
    setSelectedIds([]);
  };

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    setActiveFilter(type);
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    if (type === "TODAY") {
      setFilterOSStart(todayStr);
      setFilterOSEnd(todayStr);
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setFilterOSStart(weekAgo.toLocaleDateString("en-CA"));
      setFilterOSEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterOSStart(firstDay.toLocaleDateString("en-CA"));
      setFilterOSEnd(todayStr);
    }
  };

  const handleUnpay = async (id: number) => {
    if (
      !window.confirm(
        "Deseja realmente estornar este pagamento? O valor retornará para a conta e o registro sairá do Livro Caixa.",
      )
    )
      return;

    try {
      setLoading(true);
      await api.put(`/pagamento-peca/${id}`, {
        pago_ao_fornecedor: false,
        // revert: true // Backend logic handles default 'false' as revert if implemented properly or explicit flag
      });
      setStatusMsg({
        type: "success",
        text: "Pagamento estornado com sucesso!",
      });
      loadData();
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao desfazer pagamento." });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchConfirmClick = () => {
    if (selectedIds.length === 0) {
      setStatusMsg({
        type: "error",
        text: "Nenhum item selecionado para pagamento.",
      });
      return;
    }
    setPaymentModal((prev) => ({ ...prev, isOpen: true }));
  };

  const processBatchPayment = async () => {
    if (!paymentModal.accountId) {
      setStatusMsg({
        type: "error",
        text: "Selecione uma conta bancária de origem.",
      });
      return;
    }

    try {
      setLoading(true);

      // Process updates in parallel
      await Promise.all(
        selectedIds.map((id) => {
          return api.put(`/pagamento-peca/${id}`, {
            pago_ao_fornecedor: true,
            id_conta_bancaria: Number(paymentModal.accountId),
            data_pagamento_fornecedor: paymentModal.date,
          });
        }),
      );

      setStatusMsg({
        type: "success",
        text: `${selectedIds.length} pagamentos confirmados e debitados!`,
      });

      // Clear selection and reload
      setSelectedIds([]);
      setPaymentModal((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao processar pagamentos." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Pagamento",
      message:
        "Tem certeza que deseja excluir este registro de conta a pagar? Esta ação é irreversível.",
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(`/pagamento-peca/${id}`);
          setStatusMsg({
            type: "success",
            text: "Pagamento excluído com sucesso!",
          });
          loadData();
        } catch (error) {
          setStatusMsg({ type: "error", text: "Erro ao excluir pagamento." });
        } finally {
          setLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUpdatePayment = async () => {
    if (!editPayment) return;
    try {
      setLoading(true);
      await api.put(`/pagamento-peca/${editPayment.id_pagamento_peca}`, {
        custo_real: Number(editPayment.custo_real),
        id_fornecedor: Number(editPayment.id_fornecedor),
        // Keep data_compra managed if needed, but for now we focus on payment date
        data_compra: new Date(editPayment.data_compra),
        data_pagamento_fornecedor: editPayment.data_pagamento_fornecedor
          ? new Date(editPayment.data_pagamento_fornecedor)
          : null,
        pago_ao_fornecedor: editPayment.pago_ao_fornecedor,
      });

      if (editPayment.item_os && editPayment.ref_nota) {
        await api.put(`/itens-os/${editPayment.item_os.id_iten}`, {
          codigo_referencia: editPayment.ref_nota,
        });
      }

      setStatusMsg({ type: "success", text: "Dados atualizados com sucesso!" });
      loadData();
      setShowEditModal(false);
      setEditPayment(null);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao atualizar pagamento." });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (payment: any) => {
    setEditPayment({
      ...payment,
      data_compra: new Date(payment.data_compra).toISOString().split("T")[0],
      data_pagamento_fornecedor: payment.data_pagamento_fornecedor
        ? new Date(payment.data_pagamento_fornecedor)
            .toISOString()
            .split("T")[0]
        : "",
      ref_nota: payment.item_os?.codigo_referencia || "",
    });
    setShowEditModal(true);
  };

  const filteredPayments = payments
    .filter((p) => {
      // --- HELPER FOR ROBUST LOCAL DATE COMPARISON ---
      // Converts "YYYY-MM-DD" string to a local Date object at 00:00:00 or 23:59:59
      const getLocalStart = (dateStr: string) => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split("-").map(Number);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      };
      const getLocalEnd = (dateStr: string) => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split("-").map(Number);
        return new Date(y, m - 1, d, 23, 59, 59, 999);
      };

      // 1. Status Filter
      if (filterStatus === "PENDING" && p.pago_ao_fornecedor) return false;
      if (filterStatus === "PAID" && !p.pago_ao_fornecedor) return false;

      // 2. OS Finish Date Filter (dt_entrega)
      if (filterOSStart || filterOSEnd) {
        // Cannot filter by OS date if OS date doesn't exist
        if (!p.item_os?.ordem_de_servico?.dt_entrega) return false;

        const osDate = new Date(p.item_os.ordem_de_servico.dt_entrega);

        if (filterOSStart) {
          const start = getLocalStart(filterOSStart);
          if (start && osDate < start) return false;
        }
        if (filterOSEnd) {
          const end = getLocalEnd(filterOSEnd);
          if (end && osDate > end) return false;
        }
      }

      // 3. Payment to Supplier Date Filter (data_pagamento_fornecedor)
      if (filterPayStart || filterPayEnd) {
        // If we are filtering by payment date, the item MUST have a payment date
        if (!p.data_pagamento_fornecedor) return false;

        const payDate = new Date(p.data_pagamento_fornecedor);

        if (filterPayStart) {
          const start = getLocalStart(filterPayStart);
          if (start && payDate < start) return false;
        }
        if (filterPayEnd) {
          const end = getLocalEnd(filterPayEnd);
          if (end && payDate > end) return false;
        }
      }

      // 4. Supplier Filter
      if (filterSupplier && filterSupplier !== "") {
        if (String(p.id_fornecedor) !== String(filterSupplier)) return false;
      }

      // 5. General Search (was Plate Filter)
      if (filterPlate) {
        const q = filterPlate.toLowerCase();
        const plate =
          p.item_os?.ordem_de_servico?.veiculo?.placa?.toLowerCase() || "";
        const model =
          p.item_os?.ordem_de_servico?.veiculo?.modelo?.toLowerCase() || "";
        const color =
          p.item_os?.ordem_de_servico?.veiculo?.cor?.toLowerCase() || "";
        const supplier = (
          p.fornecedor?.nome_fantasia ||
          p.fornecedor?.nome ||
          ""
        ).toLowerCase();
        const desc = p.item_os?.descricao?.toLowerCase() || "";
        const osId = String(p.item_os?.id_os || "");
        const fullOsId = `#${osId}`;

        const searchable = [
          plate,
          model,
          color,
          supplier,
          desc,
          osId,
          fullOsId,
        ].join(" ");

        if (!searchable.includes(q)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.data_compra || 0).getTime() -
        new Date(a.data_compra || 0).getTime(),
    );

  // Calculate totals
  const totalSelected = filteredPayments
    .filter((p) => selectedIds.includes(p.id_pagamento_peca))
    .reduce((acc, p) => acc + Number(p.custo_real), 0);

  return (
    <div className="w-full mx-auto px-4 md:px-8 py-6 space-y-6">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-600 tracking-tight">
            Pagamento de Auto Peças
          </h1>
          <p className="text-neutral-500">
            Controle de pagamento de peças para fornecedores.
          </p>
        </div>
      </div>
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-surface p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status */}
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 block">
                Status
              </label>
              <div className="flex bg-neutral-100 rounded-xl p-1 gap-1">
                {["PENDING", "PAID", "ALL"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st as any)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      filterStatus === st
                        ? "bg-primary-200 text-primary-500 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {st === "PENDING"
                      ? "PENDENTES"
                      : st === "PAID"
                        ? "PAGAS"
                        : "TODAS"}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="lg:col-span-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 block">
                Buscar
              </label>
              <Input
                value={filterPlate}
                onChange={(e) => setFilterPlate(e.target.value)}
                placeholder="Placa, OS, Fornecedor..."
                icon={Search}
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 block">
                Fornecedor
              </label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full h-[42px] px-3 bg-white border border-neutral-200 rounded-xl font-bold text-sm text-neutral-600 outline-none focus:border-primary-500 transition-colors"
              >
                <option value="">Todos</option>
                {fornecedores.map((f) => (
                  <option key={f.id_fornecedor} value={f.id_fornecedor}>
                    {f.nome_fantasia || f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Filters Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 border-t border-neutral-100 pt-4">
            {/* Start OS Date */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase whitespace-nowrap min-w-[90px]">
                Finalização OS:
              </span>
              <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => applyQuickFilter("TODAY")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFilter === "TODAY"
                      ? "bg-primary-200 text-primary-500 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => applyQuickFilter("WEEK")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFilter === "WEEK"
                      ? "bg-primary-200 text-primary-500 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => applyQuickFilter("MONTH")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFilter === "MONTH"
                      ? "bg-primary-200 text-primary-500 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
                  }`}
                >
                  Mês
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <div className="w-32">
                  <Input
                    type="date"
                    value={filterOSStart}
                    onChange={(e) => {
                      setFilterOSStart(e.target.value);
                      setActiveFilter("CUSTOM");
                    }}
                    className={`h-9 px-2 text-[10px] uppercase font-bold ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                  />
                </div>
                <span className="text-neutral-400">-</span>
                <div className="w-32">
                  <Input
                    type="date"
                    value={filterOSEnd}
                    onChange={(e) => {
                      setFilterOSEnd(e.target.value);
                      setActiveFilter("CUSTOM");
                    }}
                    className={`h-9 px-2 text-[10px] uppercase font-bold ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                  />
                </div>
              </div>
            </div>

            {/* Payment Date */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 lg:ml-auto">
              <span className="text-[10px] font-bold text-neutral-400 uppercase whitespace-nowrap min-w-[130px]">
                Pagamento Fornecedor:
              </span>
              <div className="flex gap-2 items-center">
                <div className="w-32">
                  <Input
                    type="date"
                    value={filterPayStart}
                    onChange={(e) => setFilterPayStart(e.target.value)}
                    className="h-9 px-2 text-[10px] uppercase font-bold"
                  />
                </div>
                <span className="text-neutral-400">-</span>
                <div className="w-32">
                  <Input
                    type="date"
                    value={filterPayEnd}
                    onChange={(e) => setFilterPayEnd(e.target.value)}
                    className="h-9 px-2 text-[10px] uppercase font-bold"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              icon={X}
              className="hidden lg:flex"
            >
              Limpar
            </Button>
          </div>

          <div className="lg:hidden flex justify-end">
            <Button onClick={clearFilters} variant="ghost" size="sm" icon={X}>
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CARD 1: SELETOR DE BAIXA (Checkboxes) - Show only if items selected */}
          {selectedIds.length > 0 ? (
            <div className="bg-blue-900 p-6 rounded-2xl flex items-center justify-between shadow-xl shadow-blue-500/20 text-white animate-in zoom-in duration-300">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">
                  Selecionado para Baixa ({selectedIds.length})
                </p>
                <p className="text-3xl font-black tracking-tighter">
                  {formatCurrency(totalSelected)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={handleBatchConfirmClick}
                  className="bg-neutral-200 text-blue-600 hover:bg-neutral-50 border-none shadow-none"
                  icon={Save}
                >
                  Confirmar Baixa
                </Button>
              </div>
            </div>
          ) : (
            // Display Total Filtered
            <div className="bg-surface p-6 rounded-2xl border border-neutral-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Total Listado (Status Atual)
                </p>
                <p className="text-3xl font-bold text-neutral-600">
                  {formatCurrency(
                    filteredPayments.reduce(
                      (acc, p) => acc + Number(p.custo_real || 0),
                      0,
                    ),
                  )}
                </p>
              </div>
              <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                <DollarSign size={20} />
              </div>
            </div>
          )}

          {/* CARD 2: Total Geral (Todos) */}
          <div className="bg-neutral-800 p-6 rounded-2xl flex items-center justify-between shadow-lg text-white">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Total Geral (Todos Pendentes)
              </p>
              <p className="text-3xl font-bold">
                {formatCurrency(
                  payments
                    .filter((p) => !p.pago_ao_fornecedor)
                    .reduce((acc, p) => acc + Number(p.custo_real || 0), 0),
                )}
              </p>
            </div>
            <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center text-white/50">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>{" "}
      {/* Table */}
      <div className="bg-surface rounded-3xl shadow-sm border border-neutral-200 overflow-hidden w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              <th className="p-5">Ref / Nota</th>
              <th className="p-5">Peça</th>
              <th className="p-5">Fornecedor</th>
              <th className="p-5">Veículo / OS</th>
              <th className="p-5">Status OS</th>
              <th className="p-5 text-right w-32">Valor Custo</th>
              <th className="p-5 text-center w-24">Pagar</th>
              <th className="p-5 text-right w-32">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filteredPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-10 text-center text-neutral-400 italic font-medium"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr
                  key={p.id_pagamento_peca}
                  className={`hover:bg-neutral-25 transition-colors ${p.pago_ao_fornecedor ? "bg-neutral-50/50" : ""}`}
                >
                  <td className="p-5">
                    <div className="flex items-center gap-2 font-bold text-neutral-600 text-xs">
                      <Calendar size={14} />
                      {/* DATA INSERÇÃO NA OS (from item_os.dt_cadastro) */}
                      {p.item_os?.dt_cadastro
                        ? new Date(p.item_os.dt_cadastro).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="font-mono text-xs font-black text-neutral-600 bg-neutral-100 px-2 py-1 rounded w-fit">
                      {p.item_os?.codigo_referencia || "---"}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-neutral-600 text-sm">
                      {p.item_os?.descricao}
                    </p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-orange-500" />
                      <span className="font-bold text-neutral-700 text-xs uppercase">
                        {p.fornecedor?.nome_fantasia || p.fornecedor?.nome}
                      </span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col">
                      <p className="font-black text-neutral-800 text-xs uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded w-fit">
                        {p.item_os?.ordem_de_servico?.veiculo?.placa || "---"}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-bold mt-1 uppercase">
                        {p.item_os?.ordem_de_servico?.veiculo?.modelo || "N/A"}{" "}
                        {p.item_os?.ordem_de_servico?.veiculo?.cor
                          ? `• ${p.item_os.ordem_de_servico.veiculo.cor}`
                          : ""}
                      </p>

                      <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                        OS #{p.item_os?.id_os}
                      </p>
                      {/* Optional: Show OS Finish Date if available */}
                      {p.item_os?.ordem_de_servico?.dt_entrega && (
                        <p className="text-[9px] text-green-600 font-bold mt-1">
                          Fim OS:{" "}
                          {new Date(
                            p.item_os.ordem_de_servico.dt_entrega,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-5">
                    {(() => {
                      const st =
                        p.item_os?.ordem_de_servico?.status || "ABERTA";
                      const styles: Record<string, string> = {
                        FINALIZADA:
                          "bg-emerald-100 text-emerald-700 ring-emerald-200",
                        PAGA_CLIENTE:
                          "bg-neutral-100 text-neutral-600 ring-neutral-200",
                        "PRONTO PARA FINANCEIRO":
                          "bg-amber-100 text-amber-700 ring-amber-200",
                        ABERTA: "bg-blue-100 text-blue-700 ring-blue-200",
                        EM_ANDAMENTO: "bg-cyan-100 text-cyan-700 ring-cyan-200",
                        CANCELADA: "bg-red-100 text-red-700 ring-red-200",
                      };
                      const style =
                        styles[st] || "bg-gray-50 text-gray-500 ring-gray-200";

                      return (
                        <span
                          className={`px-3 py-1 rounded-md text-[10px] font-black uppercase ring-1 whitespace-nowrap ${style}`}
                        >
                          {st === "PRONTO PARA FINANCEIRO"
                            ? "FINANCEIRO"
                            : st.replace(/_/g, " ")}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-5 text-right font-bold text-neutral-600">
                    {formatCurrency(Number(p.custo_real))}
                  </td>
                  <td className="p-5 text-center">
                    {p.pago_ao_fornecedor ? (
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleUnpay(p.id_pagamento_peca)}
                          className="hover:scale-110 transition-transform active:scale-95 text-neutral-400 hover:text-green-600"
                          title={`Pago em: ${p.data_pagamento_fornecedor ? new Date(p.data_pagamento_fornecedor).toLocaleDateString() : "N/A"} (Clique para desfazer)`}
                        >
                          <CheckSquare
                            size={32}
                            className="text-green-500 fill-green-500/20"
                          />
                        </button>
                        {p.data_pagamento_fornecedor && (
                          <span className="text-[9px] font-bold text-green-600 mt-1">
                            {new Date(
                              p.data_pagamento_fornecedor,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleSelection(p.id_pagamento_peca)}
                        className="hover:scale-110 transition-transform active:scale-95 text-neutral-300 hover:text-blue-500"
                        title={
                          selectedIds.includes(p.id_pagamento_peca)
                            ? "Desmarcar"
                            : "Selecionar para pagamento"
                        }
                      >
                        {selectedIds.includes(p.id_pagamento_peca) ? (
                          <CheckSquare
                            size={32}
                            className="text-green-500 fill-green-500/20"
                          />
                        ) : (
                          <Square size={32} className="stroke-[2.5]" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        onClick={() => openEditModal(p)}
                        icon={Edit}
                        label="Editar"
                        variant="accent"
                      />
                      <ActionButton
                        onClick={() => handleDeletePayment(p.id_pagamento_peca)}
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
      {showEditModal && editPayment && (
        <Modal
          title="Editar Pagamento (Peça)"
          onClose={() => setShowEditModal(false)}
        >
          <div className="space-y-6">
            <div className="bg-neutral-50 p-4 rounded-xl mb-4">
              <p className="text-xs font-bold text-neutral-400 uppercase">
                Item da OS
              </p>
              <p className="font-bold text-neutral-800">
                {editPayment.item_os?.descricao}
              </p>
              <div className="mt-2 text-[10px] text-neutral-400 font-mono">
                Inserido em:{" "}
                {editPayment.item_os?.dt_cadastro
                  ? new Date(editPayment.item_os.dt_cadastro).toLocaleString()
                  : "N/A"}
              </div>
              <div className="mt-2">
                <Input
                  label="Ref / Nota"
                  value={editPayment.ref_nota || ""}
                  onChange={(e) =>
                    setEditPayment({ ...editPayment, ref_nota: e.target.value })
                  }
                  placeholder="Número da Nota / Referência"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Read-Only Insertion Date */}
              <div>
                <Input
                  label="Data de Inserção na OS (Auto)"
                  disabled
                  value={
                    editPayment.item_os?.dt_cadastro
                      ? new Date(
                          editPayment.item_os.dt_cadastro,
                        ).toLocaleDateString()
                      : "N/A"
                  }
                />
              </div>

              {/* Read-Only OS Finish Date */}
              <div>
                <Input
                  label="Data de Finalização da OS"
                  disabled
                  value={
                    editPayment.item_os?.ordem_de_servico?.dt_entrega
                      ? new Date(
                          editPayment.item_os.ordem_de_servico.dt_entrega,
                        ).toLocaleDateString()
                      : "OS em Aberto"
                  }
                />
              </div>

              {/* Editable Payment Date */}
              <div className="md:col-span-2">
                <Input
                  label="Data de Pagamento à Auto Peças (Editável)"
                  type="date"
                  value={editPayment.data_pagamento_fornecedor || ""}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      data_pagamento_fornecedor: e.target.value,
                    })
                  }
                  className="text-green-700 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Custo Real (R$)"
                  type="number"
                  step="0.01"
                  value={editPayment.custo_real}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      custo_real: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
                  Fornecedor
                </label>
                <select
                  value={editPayment.id_fornecedor}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      id_fornecedor: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-neutral-200 px-3 py-2.5 rounded-lg font-bold text-sm text-neutral-600 outline-none focus:border-primary-500 transition-colors h-[42px]"
                >
                  {fornecedores.map((f) => (
                    <option key={f.id_fornecedor} value={f.id_fornecedor}>
                      {f.nome_fantasia || f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Revert Payment Option */}
            {editPayment.data_pagamento_fornecedor && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="revertPayment"
                  checked={!editPayment.pago_ao_fornecedor}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      pago_ao_fornecedor: !e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="revertPayment" className="cursor-pointer">
                  <p className="text-sm font-bold text-orange-800">
                    Estornar Pagamento
                  </p>
                  <p className="text-xs text-orange-600">
                    Ao marcar, o pagamento voltará para "Pendente" e o valor
                    será estornado no caixa/banco (mantendo registro riscado).
                  </p>
                </label>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-neutral-100">
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="dark"
                onClick={handleUpdatePayment}
                className="flex-1 shadow-lg"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* CONFIRM PAYMENT MODAL (WITH ACCOUNT SELECTION) */}
      {paymentModal.isOpen && (
        <Modal
          title="Confirmar Pagamento e Baixa"
          onClose={() =>
            setPaymentModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm font-bold text-blue-800 mb-1">
                Resumo da Operação
              </p>
              <p className="text-xs text-blue-600">
                Você está confirmando <strong>{selectedIds.length}</strong>{" "}
                pagamentos no valor total de{" "}
                <strong>
                  R${" "}
                  {totalSelected.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
                .
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Data do Pagamento"
                type="date"
                value={paymentModal.date}
                onChange={(e) =>
                  setPaymentModal({ ...paymentModal, date: e.target.value })
                }
              />

              <div>
                <label className="text-sm font-semibold text-neutral-700 mb-1.5 block">
                  Conta de Origem (Débito)
                </label>
                <select
                  value={paymentModal.accountId}
                  onChange={(e) =>
                    setPaymentModal({
                      ...paymentModal,
                      accountId: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-neutral-200 px-3 py-2.5 rounded-lg font-bold text-sm text-neutral-600 outline-none focus:border-primary-500 transition-colors h-[42px]"
                >
                  <option value="">Selecione uma conta...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id_conta} value={acc.id_conta}>
                      {acc.nome} {acc.banco ? `(${acc.banco})` : ""} - Saldo:{" "}
                      {formatCurrency(Number(acc.saldo_atual))}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                variant="ghost"
                onClick={() =>
                  setPaymentModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={processBatchPayment}
                disabled={loading}
                isLoading={loading}
                className="flex-1 shadow-lg shadow-green-500/20"
                icon={DollarSign}
              >
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal
          title={confirmModal.title}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div className="space-y-6">
            <p className="text-neutral-600 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmModal.onConfirm}
                className="shadow-lg shadow-red-500/30"
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
