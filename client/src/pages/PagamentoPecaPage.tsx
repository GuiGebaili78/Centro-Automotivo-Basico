import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
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
  Plus,
} from "lucide-react";
import { Modal } from "../components/ui/Modal";

export const PagamentoPecaPage = () => {
  const [, setLoading] = useState(false);

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
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM" | "ALL"
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

  // Confirm Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Payment Confirmation Modal
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    accountId: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Undo Payment Modal
  const [undoModal, setUndoModal] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  useEffect(() => {
    loadData();
  }, []);

  // Clear selection when filters change
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
      // BREAKING CHANGE: API now returns { data: [...], pagination: {...} }
      setPayments(paymentsRes.data?.data || paymentsRes.data || []);
      setFornecedores(fornecedoresRes.data);
      setAccounts(accountsRes.data.filter((a: any) => a.ativo));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados financeiros.");
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
    setActiveFilter("ALL");
    setFilterOSStart("");
    setFilterOSEnd("");
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

  const executeUnpay = async () => {
    if (!undoModal.id) return;
    try {
      setLoading(true);
      await api.put(`/pagamento-peca/${undoModal.id}`, {
        pago_ao_fornecedor: false,
      });
      toast.success("Pagamento estornado com sucesso!");
      loadData();
      setUndoModal({ isOpen: false, id: null });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desfazer pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpay = (id: number) => {
    setUndoModal({ isOpen: true, id });
  };

  const handleBatchConfirmClick = () => {
    if (selectedIds.length === 0) {
      toast.warning("Nenhum item selecionado para pagamento.");
      return;
    }
    setPaymentModal((prev) => ({ ...prev, isOpen: true }));
  };

  const processBatchPayment = async () => {
    if (!paymentModal.accountId) {
      toast.warning("Selecione uma conta bancária de origem.");
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

      toast.success(
        `${selectedIds.length} pagamentos confirmados e debitados!`,
      );

      // Clear selection and reload
      setSelectedIds([]);
      setPaymentModal((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!confirmDeleteId) return;
    try {
      setLoading(true);
      await api.delete(`/pagamento-peca/${confirmDeleteId}`);
      toast.success("Pagamento excluído com sucesso!");
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir pagamento.");
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
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

      toast.success("Dados atualizados com sucesso!");
      loadData();
      setShowEditModal(false);
      setEditPayment(null);
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
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

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        // --- HELPER FOR ROBUST LOCAL DATE COMPARISON ---
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
  }, [
    payments,
    filterStatus,
    filterOSStart,
    filterOSEnd,
    filterPayStart,
    filterPayEnd,
    filterSupplier,
    filterPlate,
  ]);

  // Calculate totals
  const totalSelected = useMemo(() => {
    return filteredPayments
      .filter((p) => selectedIds.includes(p.id_pagamento_peca))
      .reduce((acc, p) => acc + Number(p.custo_real), 0);
  }, [filteredPayments, selectedIds]);

  const totalFiltered = useMemo(() => {
    return filteredPayments.reduce(
      (acc, p) => acc + Number(p.custo_real || 0),
      0,
    );
  }, [filteredPayments]);

  const totalGeneral = useMemo(() => {
    return payments
      .filter((p) => !p.pago_ao_fornecedor)
      .reduce((acc, p) => acc + Number(p.custo_real || 0), 0);
  }, [payments]);

  return (
    <PageLayout
      title="Pagamento de Auto Peças"
      subtitle="Controle de pagamento de peças para fornecedores."
      actions={
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            // Placeholder: Create manual payment logic or redirect if exists
            toast.info("A criação manual será implementada em breve.");
          }}
        >
          Novo Pagamento
        </Button>
      }
    >
      <div className="space-y-6">
        {/* FILTERS */}
        <div className="bg-surface p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Tabs */}
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 block">
                Status
              </label>
              <div className="flex bg-neutral-50 p-1 rounded-lg w-full border border-neutral-200">
                {["PENDING", "PAID", "ALL"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st as any)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filterStatus === st
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-neutral-500 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {st === "PENDING"
                      ? "Pendentes"
                      : st === "PAID"
                        ? "Pagas"
                        : "Todas"}
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
                className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg font-bold text-xs text-neutral-600 outline-none focus:border-primary-500 transition-colors"
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
          <div className="flex flex-col lg:flex-row items-end lg:items-center gap-4 border-t border-neutral-100 pt-4">
            {/* Start OS Date */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-[10px] filter-label font-bold text-neutral-400 uppercase whitespace-nowrap min-w-[90px]">
                Finalização OS:
              </span>

              <div className="flex bg-neutral-50 p-1 rounded-lg w-fit border border-neutral-200">
                <button
                  onClick={() => applyQuickFilter("TODAY")}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFilter === "TODAY"
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-neutral-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => applyQuickFilter("WEEK")}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFilter === "WEEK"
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-neutral-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => applyQuickFilter("MONTH")}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeFilter === "MONTH"
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-neutral-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Mês
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <div className="w-28">
                  <Input
                    type="date"
                    value={filterOSStart}
                    onChange={(e) => {
                      setFilterOSStart(e.target.value);
                      setActiveFilter("CUSTOM");
                    }}
                    className={`h-8 px-2 text-[10px] uppercase font-bold ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                  />
                </div>
                <span className="text-neutral-400">-</span>
                <div className="w-28">
                  <Input
                    type="date"
                    value={filterOSEnd}
                    onChange={(e) => {
                      setFilterOSEnd(e.target.value);
                      setActiveFilter("CUSTOM");
                    }}
                    className={`h-8 px-2 text-[10px] uppercase font-bold ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                  />
                </div>
              </div>
            </div>

            {/* Payment Date */}
            <div className="flex flex-col sm:flex-row items-center gap-2 lg:ml-auto">
              <span className="text-[10px] font-bold text-neutral-400 uppercase whitespace-nowrap">
                Pgto Fornec:
              </span>
              <div className="flex gap-2 items-center">
                <div className="w-28">
                  <Input
                    type="date"
                    value={filterPayStart}
                    onChange={(e) => setFilterPayStart(e.target.value)}
                    className="h-8 px-2 text-[10px] uppercase font-bold"
                  />
                </div>
                <span className="text-neutral-400">-</span>
                <div className="w-28">
                  <Input
                    type="date"
                    value={filterPayEnd}
                    onChange={(e) => setFilterPayEnd(e.target.value)}
                    className="h-8 px-2 text-[10px] uppercase font-bold"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              icon={X}
              className="mt-4 lg:mt-0"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Totals Summary Cards - Standardized */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CARD 1: SELETOR DE BAIXA (Checkboxes) */}
          {selectedIds.length > 0 ? (
            <div className="bg-blue-50 p-6 rounded-xl flex items-center justify-between border border-blue-200 shadow-sm animate-in zoom-in duration-300">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-blue-400">
                  Selecionado para Baixa ({selectedIds.length})
                </p>
                <p className="text-3xl font-black tracking-tighter text-blue-700">
                  {formatCurrency(totalSelected)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={handleBatchConfirmClick}
                  variant="primary"
                  icon={Save}
                >
                  Confirmar Baixa
                </Button>
              </div>
            </div>
          ) : (
            // Display Total Filtered
            <Card className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Total Listado (Status Atual)
                </p>
                <p className="text-3xl font-bold text-neutral-600">
                  {formatCurrency(totalFiltered)}
                </p>
              </div>
              <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                <DollarSign size={20} />
              </div>
            </Card>
          )}

          {/* CARD 2: Total Geral (Todos) */}
          <Card className="flex items-center justify-between p-6">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Total Geral (Todos Pendentes)
              </p>
              <p className="text-3xl font-bold text-neutral-800">
                {formatCurrency(totalGeneral)}
              </p>
            </div>
            <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
              <DollarSign size={20} />
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tabela-limpa w-full">
              <thead>
                <tr className="bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  <th className="p-5">Data</th>
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
                      colSpan={9}
                      className="p-10 text-center text-neutral-400 italic font-medium"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr
                      key={p.id_pagamento_peca}
                      className={`group hover:bg-neutral-50 transition-colors ${p.pago_ao_fornecedor ? "bg-neutral-50/50" : ""}`}
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-2 font-bold text-neutral-600 text-xs">
                          <Calendar size={14} className="text-neutral-400" />
                          {p.item_os?.dt_cadastro
                            ? new Date(
                                p.item_os.dt_cadastro,
                              ).toLocaleDateString()
                            : "N/A"}
                          {/* Time below date if available */}
                          {/* Assuming dt_cadastro is a robust date/time string, we can verify */}
                          <div className="text-[10px] font-normal text-neutral-400 block w-full mt-0.5 ml-6">
                            {p.item_os?.dt_cadastro
                              ? new Date(
                                  p.item_os.dt_cadastro,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
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
                            {p.item_os?.ordem_de_servico?.veiculo?.placa ||
                              "---"}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-bold mt-1 uppercase">
                            {p.item_os?.ordem_de_servico?.veiculo?.modelo ||
                              "N/A"}{" "}
                            {p.item_os?.ordem_de_servico?.veiculo?.cor
                              ? `• ${p.item_os.ordem_de_servico.veiculo.cor}`
                              : ""}
                          </p>

                          <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                            OS Nº {p.item_os?.id_os}
                          </p>
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
                            EM_ANDAMENTO:
                              "bg-cyan-100 text-cyan-700 ring-cyan-200",
                            CANCELADA: "bg-red-100 text-red-700 ring-red-200",
                          };
                          const style =
                            styles[st] ||
                            "bg-gray-50 text-gray-500 ring-gray-200";

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
                        <div className="flex justify-center">
                          {p.pago_ao_fornecedor ? (
                            <button
                              onClick={() => handleUnpay(p.id_pagamento_peca)}
                              className="hover:scale-110 transition-transform active:scale-95 text-neutral-400 hover:text-green-600"
                              title={`Pago em: ${p.data_pagamento_fornecedor ? new Date(p.data_pagamento_fornecedor).toLocaleDateString() : "N/A"} (Clique para desfazer)`}
                            >
                              <CheckSquare
                                size={24}
                                className="text-emerald-500 fill-emerald-500/20"
                              />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                toggleSelection(p.id_pagamento_peca)
                              }
                              className="hover:scale-110 transition-transform active:scale-95 text-neutral-300 hover:text-blue-600"
                            >
                              {selectedIds.includes(p.id_pagamento_peca) ? (
                                <CheckSquare
                                  size={24}
                                  className="text-blue-600"
                                />
                              ) : (
                                <Square size={24} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            variant="primary"
                            icon={Edit}
                            label="Editar"
                            onClick={() => openEditModal(p)}
                          />
                          <ActionButton
                            variant="danger"
                            icon={Trash2}
                            label="Excluir"
                            onClick={() =>
                              setConfirmDeleteId(p.id_pagamento_peca)
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* MODALS */}
      {showEditModal && editPayment && (
        <Modal title="Editar Pagamento" onClose={() => setShowEditModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Data Compra
                </label>
                <Input
                  type="date"
                  value={editPayment.data_compra}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      data_compra: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Ref / Nota
                </label>
                <Input
                  value={editPayment.ref_nota}
                  onChange={(e) =>
                    setEditPayment({ ...editPayment, ref_nota: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">
                Custo Real (R$)
              </label>
              <Input
                type="number"
                value={editPayment.custo_real}
                onChange={(e) =>
                  setEditPayment({ ...editPayment, custo_real: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">
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
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-lg text-sm"
              >
                {fornecedores.map((f) => (
                  <option key={f.id_fornecedor} value={f.id_fornecedor}>
                    {f.nome_fantasia || f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUpdatePayment}>
              Salvar Alterações
            </Button>
          </div>
        </Modal>
      )}

      {/* Batch Payment Modal */}
      {paymentModal.isOpen && (
        <Modal
          title={`Confirmar ${selectedIds.length} Pagamento(s)`}
          onClose={() =>
            setPaymentModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Selecione a conta de onde sairá o dinheiro e a data do pagamento.
            </p>
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1">
                Conta Bancária
              </label>
              <select
                value={paymentModal.accountId}
                onChange={(e) =>
                  setPaymentModal((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-lg"
              >
                <option value="">Selecione...</option>
                {accounts.map((acc: any) => (
                  <option key={acc.id_conta} value={acc.id_conta}>
                    {acc.banco} - {acc.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1">
                Data do Pagamento
              </label>
              <Input
                type="date"
                value={paymentModal.date}
                onChange={(e) =>
                  setPaymentModal((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800">
              Isso criará lançamentos de saída no Livro Caixa automaticamente.
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
            <Button
              variant="ghost"
              onClick={() =>
                setPaymentModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancelar
            </Button>
            <Button variant="success" onClick={processBatchPayment}>
              Confirmar Pagamentos
            </Button>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeletePayment}
        title="Excluir Pagamento"
        description="Tem certeza que deseja excluir este registro de conta a pagar? Esta ação é irreversível."
        variant="danger"
      />

      {/* CONFIRM UNPAY MODAL */}
      <ConfirmModal
        isOpen={undoModal.isOpen}
        onClose={() => setUndoModal({ isOpen: false, id: null })}
        onConfirm={executeUnpay}
        title="Estornar Pagamento"
        description="Deseja marcar este item como pendente novamente? O lançamento no livro caixa referente ao pagamento será mantido para histórico, mas o status voltará para 'Pendente'."
        confirmText="Estornar"
        variant="primary"
      />
    </PageLayout>
  );
};
