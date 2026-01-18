import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { api } from "../../services/api";
import {
  Plus,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Wallet,
  Settings,
} from "lucide-react";
import { StatusBanner } from "../ui/StatusBanner";
import { CategoryManager } from "./CategoryManager";

interface CashBookEntry {
  id: string; // 'man-1', 'in-5', 'out-10' (prefix to identify source)
  rawId: number;
  date: string; // ISO date string
  description: string;
  type: "IN" | "OUT";
  value: number;
  category: string;
  vehicle?: string;
  client?: string;
  supplier?: string; // New field
  obs?: string;
  source: "MANUAL" | "AUTO";
  deleted_at?: string | null;
  originalData?: any;
  // New fields
  conta_bancaria?: string;
  paymentMethod?: string;
}

interface Category {
  id_categoria: number;
  nome: string;
  tipo: string;
}

export const MovimentacoesTab = () => {
  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // Filters
  const [cashSearch, setCashSearch] = useState("");
  const [cashFilterStart, setCashFilterStart] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [cashFilterEnd, setCashFilterEnd] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [filterSource, setFilterSource] = useState<"ALL" | "MANUAL" | "AUTO">(
    "ALL",
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CashBookEntry | null>(null);
  const [itemToDelete, setItemToDelete] = useState<CashBookEntry | null>(null);
  const [deleteObs, setDeleteObs] = useState("");

  // Category Management
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    tipo_movimentacao: "ENTRADA",
    categoria: "OUTROS",
    obs: "",
    // id_conta_bancaria could be added here later
  });

  // Operators Cache - Removed state, now local in loadData

  useEffect(() => {
    loadData();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get("/categoria-financeira");
      setCategories(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    try {
      const [manualRes, paymentsRes, inflowsRes, opsRes] = await Promise.all([
        api.get("/livro-caixa"),
        api.get("/pagamento-peca"),
        api.get("/pagamento-cliente"),
        api.get("/operadora-cartao"),
      ]);

      // Build Operators Map
      const opMap: Record<number, string> = {};
      (opsRes.data || []).forEach((op: any) => {
        opMap[op.id_operadora] = op.nome;
      });

      // (Previous block was duplicated, removing)

      // Build Payment Map (Link LivroCaixa ID -> Payment Data)
      const lcPaymentMap: Record<number, any> = {};
      (inflowsRes.data || []).forEach((p: any) => {
        if (p.id_livro_caixa) {
          lcPaymentMap[p.id_livro_caixa] = p;
        }
      });

      // 1. Manual Entries (from Libro Caixa)
      // Enrich with values from Linked Payment if available
      const manual = manualRes.data
        .filter((e: any) => e.categoria !== "CONCILIACAO_CARTAO")
        .map((e: any) => {
          const linkedP = lcPaymentMap[e.id_livro_caixa];
          let methodDisplay = null;

          if (linkedP) {
            // Enrich from Linked Payment
            const method = linkedP.metodo_pagamento;
            if (method === "CREDITO") {
              const opName =
                opMap[linkedP.id_operadora] ||
                linkedP.bandeira_cartao ||
                "Cartão";
              const parc =
                linkedP.qtd_parcelas > 1
                  ? ` (${linkedP.qtd_parcelas}x)`
                  : " (À Vista)";
              methodDisplay = `CRÉDITO ${opName}${parc}`;
            } else if (method === "DEBITO") {
              const opName =
                opMap[linkedP.id_operadora] ||
                linkedP.bandeira_cartao ||
                "Cartão";
              methodDisplay = `DÉBITO ${opName}`;
            } else if (method === "PIX") {
              const nsu = linkedP.codigo_transacao
                ? ` | ID: ${linkedP.codigo_transacao}`
                : "";
              const bankInfo = linkedP.conta_bancaria?.nome
                ? ` (${linkedP.conta_bancaria.nome})`
                : "";
              methodDisplay = `PIX${bankInfo}${nsu}`;
            } else if (method === "DINHEIRO") {
              const bankInfo = linkedP.conta_bancaria?.nome
                ? ` (${linkedP.conta_bancaria.nome})`
                : "";
              methodDisplay = `DINHEIRO${bankInfo}`;
            }
          }

          return {
            id: `man-${e.id_livro_caixa}`,
            rawId: e.id_livro_caixa,
            date: e.dt_movimentacao,
            description: e.descricao,
            type: e.tipo_movimentacao === "ENTRADA" ? "IN" : "OUT",
            value: Number(e.valor),
            category: e.category || e.categoria,
            obs: e.obs,
            source: e.origem === "AUTOMATICA" ? "AUTO" : "MANUAL",
            deleted_at: e.deleted_at,
            originalData: e,
            conta_bancaria: e.conta ? e.conta.nome : null,
            paymentMethod: methodDisplay, // Enriched info
          };
        });

      // 2. Auto Outflows (Payments to Suppliers)
      const outflows = paymentsRes.data
        .filter(
          (p: any) =>
            (p.pago_ao_fornecedor && p.data_pagamento_fornecedor) ||
            p.deleted_at,
        )
        .map((p: any) => {
          const os = p.item_os?.ordem_de_servico;
          const veh = os?.veiculo;
          const cli = os?.cliente;
          const clientName =
            cli?.pessoa_fisica?.pessoa?.nome ||
            cli?.pessoa_juridica?.nome_fantasia ||
            cli?.pessoa_juridica?.razao_social ||
            "Desconhecido";
          const vehicleText = veh
            ? `${veh.placa} - ${veh.modelo} (${veh.cor})`
            : "";
          const supplierName = p.fornecedor?.nome || "Fornecedor";

          return {
            id: `out-${p.id_pagamento_peca}`,
            rawId: p.id_pagamento_peca,
            date: p.data_pagamento_fornecedor || p.data_compra,
            description: `OS #${p.item_os?.id_os || "?"} - ${veh?.modelo || "V"} ${veh?.cor || ""} (${veh?.placa || "?"}) - ${p.item_os?.descricao || "Peça"}`,
            type: "OUT",
            value: Number(p.custo_real),
            category: "Auto Peças",
            vehicle: vehicleText,
            client: clientName,
            supplier: supplierName,
            obs: "",
            source: "AUTO",
            deleted_at: p.deleted_at,
            originalData: p,
          };
        });

      // 3. Auto Inflows (Payments from Clients)
      // ONLY include payments that are NOT linked to a Livro Caixa entry (to avoid duplicates)
      // or if we want to show non-consolidated items.
      // Usually, standard flow creates LC immediately for PIX/Cash.
      // For Card, if it's NOT in LC, maybe we should show it?
      // But user asked for LC display adjustments.
      const inflows = (inflowsRes.data || [])
        .filter((p: any) => !p.id_livro_caixa) // Prevent duplicates if already in LC
        .map((p: any) => {
          const os = p.ordem_de_servico;
          const veh = os?.veiculo;
          const cli = os?.cliente;
          const clientName =
            cli?.pessoa_fisica?.pessoa?.nome ||
            cli?.pessoa_juridica?.nome_fantasia ||
            cli?.pessoa_juridica?.razao_social ||
            "Desconhecido";
          const vehicleText = veh
            ? `${veh.placa} - ${veh.modelo} (${veh.cor})`
            : "";

          // Determine display method
          let methodDisplay = p.metodo_pagamento;
          // (Previous block was duplicated, removing)

          // Helper to format currency
          // const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

          if (methodDisplay === "CREDITO") {
            const opName =
              opMap[p.id_operadora] || p.bandeira_cartao || "Cartão";
            const parc =
              p.qtd_parcelas > 1 ? ` (${p.qtd_parcelas}x)` : " (À Vista)";
            const nsu = p.codigo_transacao
              ? ` | NSU/Aut: ${p.codigo_transacao}`
              : "";
            methodDisplay = `CRÉDITO ${opName}${parc} - ${p.bandeira_cartao || ""}${nsu}`;
          }
          if (methodDisplay === "DEBITO") {
            const opName =
              opMap[p.id_operadora] || p.bandeira_cartao || "Cartão";
            const nsu = p.codigo_transacao
              ? ` | NSU/Aut: ${p.codigo_transacao}`
              : "";
            methodDisplay = `DÉBITO ${opName} - ${p.bandeira_cartao || ""}${nsu}`;
          }
          if (methodDisplay === "PIX") {
            const nsu = p.codigo_transacao
              ? ` | ID: ${p.codigo_transacao}`
              : "";
            const bankInfo = p.conta_bancaria?.nome
              ? ` (${p.conta_bancaria.nome})`
              : "";
            methodDisplay = `PIX${bankInfo}${nsu}`;
          }
          if (methodDisplay === "DINHEIRO") {
            const bankInfo = p.conta_bancaria?.nome
              ? ` (${p.conta_bancaria.nome})`
              : "";
            methodDisplay = `DINHEIRO${bankInfo}`;
          }
          const contaDisplay = p.conta_bancaria ? p.conta_bancaria.nome : null;

          return {
            id: `in-${p.id_pagamento_cliente}`,
            rawId: p.id_pagamento_cliente,
            date: p.data_pagamento,
            description: `Recebimento: OS #${p.id_os}`,
            type: "IN",
            value: Number(p.valor),
            category: "Receita de Serviços",
            vehicle: vehicleText,
            client: clientName,
            obs: p.observacao || "",
            source: "AUTO",
            deleted_at: p.deleted_at,
            originalData: p,
            // Store method + account for display
            paymentMethod: methodDisplay,
            conta_bancaria: contaDisplay,
          };
        });

      const combined = [...manual, ...outflows, ...inflows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setCashBookEntries(combined);
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: "Erro ao carregar dados financeiros.",
      });
    }
  };

  // Filter Logic
  const filteredCashBook = cashBookEntries.filter((entry) => {
    if (filterSource !== "ALL") {
      if (filterSource !== entry.source) return false;
    }
    if (filterCategory !== "ALL") {
      if (entry.category !== filterCategory) return false;
    }

    if (cashSearch) {
      const searchTerms = cashSearch
        .toLowerCase()
        .split(" ")
        .filter((term) => term.length > 0);
      const searchableText = [
        entry.description,
        entry.category,
        entry.vehicle,
        entry.client,
        entry.obs,
        `#${entry.rawId}`,
        String(entry.value),
        entry.conta_bancaria,
        entry.supplier,
        entry.paymentMethod,
        entry.type === "IN" ? "Entrada" : "Saída",
      ]
        .join(" ")
        .toLowerCase();

      // Check if ALL search terms are present in the searchable text
      return searchTerms.every((term) => searchableText.includes(term));
    }

    const recordDateLocal = new Date(entry.date).toLocaleDateString("en-CA");
    if (cashFilterStart && recordDateLocal < cashFilterStart) return false;
    if (cashFilterEnd && recordDateLocal > cashFilterEnd) return false;

    return true;
  });

  const totalInflow = filteredCashBook
    .filter((e) => e.type === "IN" && !e.deleted_at)
    .reduce((acc, e) => acc + e.value, 0);
  const totalOutflow = filteredCashBook
    .filter((e) => e.type === "OUT" && !e.deleted_at)
    .reduce((acc, e) => acc + e.value, 0);
  const balance = totalInflow - totalOutflow;

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (type === "TODAY") {
      setCashFilterStart(todayStr);
      setCashFilterEnd(todayStr);
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setCashFilterStart(weekAgo.toISOString().split("T")[0]);
      setCashFilterEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setCashFilterStart(firstDay.toISOString().split("T")[0]);
      setCashFilterEnd(todayStr);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      descricao: "",
      valor: "",
      tipo_movimentacao: "ENTRADA",
      categoria: "OUTROS",
      obs: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: any) => {
    setEditingItem(entry);
    if (entry.source === "MANUAL") {
      setFormData({
        descricao: entry.originalData.descricao,
        valor: entry.originalData.valor,
        tipo_movimentacao: entry.originalData.tipo_movimentacao,
        categoria: entry.originalData.categoria,
        obs: entry.originalData.obs || "",
      });
    } else if (entry.source === "AUTO") {
      setFormData({
        descricao: entry.description,
        valor: entry.originalData.custo_real || entry.originalData.valor,
        tipo_movimentacao: entry.type === "IN" ? "ENTRADA" : "SAIDA",
        categoria: entry.category,
        obs: entry.obs,
      });
    }

    setIsModalOpen(true);
  };

  const handleOpenDelete = (entry: any) => {
    setItemToDelete(entry);
    setDeleteObs("");
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        if (editingItem.id.startsWith("man-")) {
          await api.put(`/livro-caixa/${editingItem.rawId}`, formData);
        } else if (editingItem.id.startsWith("in-")) {
          await api.put(`/pagamento-cliente/${editingItem.rawId}`, {
            valor: formData.valor,
          });
        } else if (editingItem.id.startsWith("out-")) {
          await api.put(`/pagamento-peca/${editingItem.rawId}`, {
            custo_real: formData.valor,
          });
        }
        setStatusMsg({ type: "success", text: "Lançamento atualizado!" });
      } else {
        await api.post("/livro-caixa", { ...formData, origem: "MANUAL" });
        setStatusMsg({ type: "success", text: "Lançamento criado!" });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Erro ao salvar lançamento." });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.id.startsWith("man-")) {
        await api.delete(`/livro-caixa/${itemToDelete.rawId}`, {
          data: { obs: deleteObs },
        });
      } else if (itemToDelete.id.startsWith("in-")) {
        await api.delete(`/pagamento-cliente/${itemToDelete.rawId}`);
      } else if (itemToDelete.id.startsWith("out-")) {
        await api.delete(`/pagamento-peca/${itemToDelete.rawId}`);
      }

      setStatusMsg({
        type: "success",
        text: "Lançamento deletado (estornado).",
      });
      setIsDeleteModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Erro ao deletar lançamento." });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
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
          <h2 className="text-xl font-bold text-neutral-800">
            Histórico de Movimentações
          </h2>
          <p className="text-neutral-500 text-sm">
            Registro completo de entradas e saídas.
          </p>
        </div>
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 font-bold text-sm bg-white border border-neutral-200 px-4 py-2 rounded-xl hover:shadow-sm hover:border-neutral-300 transition-all"
        >
          <Settings size={16} />
          Categorias
        </button>
      </div>

      <div className="space-y-6">
        {/* Filters Board */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col xl:flex-row justify-between items-end gap-4">
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-3">
              <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                Buscar
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={16}
                />
                <input
                  value={cashSearch}
                  onChange={(e) => setCashSearch(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="md:col-span-4 flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                  De
                </label>
                <input
                  type="date"
                  value={cashFilterStart}
                  onChange={(e) => setCashFilterStart(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none uppercase"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                  Até
                </label>
                <input
                  type="date"
                  value={cashFilterEnd}
                  onChange={(e) => setCashFilterEnd(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none uppercase"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="md:col-span-5 flex items-center justify-end">
              <div className="w-full">
                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                  Período
                </label>
                <div className="flex bg-neutral-100 p-1 rounded-xl h-[46px] items-center w-full">
                  <button
                    onClick={() => applyQuickFilter("TODAY")}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white transition-all text-neutral-500"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => applyQuickFilter("WEEK")}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white transition-all text-neutral-500"
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => applyQuickFilter("MONTH")}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white transition-all text-neutral-500"
                  >
                    Mês
                  </button>
                </div>
              </div>
            </div>

            {/* Source Filter */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                Origem
              </label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
                className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
              >
                <option value="ALL">Todas</option>
                <option value="MANUAL">Manual</option>
                <option value="AUTO">Automática</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">
                Categoria
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
              >
                <option value="ALL">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id_categoria} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                className="w-full bg-neutral-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-neutral-800 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap text-sm tracking-wide"
                onClick={handleOpenCreate}
              >
                <Plus size={32} strokeWidth={3} />
                <div className="flex flex-col items-start leading-tight">
                  <span>NOVO</span>
                  <span className="text-[10px] opacity-70 font-medium">
                    LANÇAMENTO
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-success-50 text-success-600 rounded-lg">
                <ArrowDownCircle size={20} />
              </div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                Entradas
              </p>
            </div>
            <p className="text-3xl font-black text-success-600">
              {formatCurrency(totalInflow)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <ArrowUpCircle size={20} />
              </div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                Saídas
              </p>
            </div>
            <p className="text-3xl font-black text-red-600">
              {formatCurrency(totalOutflow)}
            </p>
          </div>
          <div className="bg-neutral-900 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-800 text-neutral-400 rounded-lg">
                <Wallet size={20} />
              </div>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                Saldo
              </p>
            </div>
            <p
              className={`text-3xl font-black ${balance >= 0 ? "text-white" : "text-red-400"}`}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                <th className="p-5">Data</th>
                <th className="p-5">Descrição</th>
                <th className="p-5">Tipo</th>
                <th className="p-5">Categoria</th>
                <th className="p-5">Conta / Origem</th>
                <th className="p-5 text-right whitespace-nowrap min-w-[150px]">
                  Valor
                </th>
                <th className="p-5 font-black text-neutral-400 uppercase text-[10px] tracking-widest">
                  Obs
                </th>
                <th className="p-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredCashBook.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center text-neutral-400 italic font-medium"
                  >
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                filteredCashBook.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-neutral-25 transition-colors ${entry.deleted_at ? "opacity-50" : ""}`}
                  >
                    <td className="p-5">
                      <div
                        className={`flex items-center gap-2 font-bold text-xs ${entry.deleted_at ? "line-through text-neutral-400" : "text-neutral-600"}`}
                      >
                        <Calendar size={14} />
                        {/* Show Date and Time */}
                        {new Date(entry.date).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td
                      className={`p-5 font-bold ${entry.deleted_at ? "line-through text-neutral-400" : "text-neutral-900"}`}
                    >
                      <div>{entry.description}</div>
                      {entry.source === "AUTO" && (
                        <div className="text-[10px] text-neutral-400 font-medium mt-1">
                          {entry.type === "OUT" ? (
                            <span>Pago a: {entry.supplier}</span>
                          ) : (
                            <span>
                              {entry.client}{" "}
                              {entry.vehicle ? `| ${entry.vehicle}` : ""}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Show manual obs if exists */}
                      {entry.source === "MANUAL" && entry.obs && (
                        <div className="text-[10px] text-neutral-400 font-medium mt-1 italic">
                          {entry.obs}
                        </div>
                      )}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          entry.deleted_at
                            ? "bg-neutral-100 text-neutral-500 line-through"
                            : entry.type === "IN"
                              ? "bg-success-50 text-success-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {entry.deleted_at
                          ? "CANCELADO"
                          : entry.type === "IN"
                            ? "Entrada"
                            : "Saída"}{" "}
                        ({entry.source === "MANUAL" ? "M" : "A"})
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-xs font-bold text-neutral-600 uppercase bg-neutral-100 px-2 py-1 rounded-md">
                        {entry.category || "Geral"}
                      </span>
                    </td>
                    <td className="p-5">
                      {entry.paymentMethod ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-neutral-600 uppercase">
                            {entry.paymentMethod}
                          </span>
                          {entry.conta_bancaria && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                              {entry.conta_bancaria}
                            </span>
                          )}
                        </div>
                      ) : entry.conta_bancaria ? (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
                          {entry.conta_bancaria}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">
                          Caixa Geral
                        </span>
                      )}
                    </td>
                    <td
                      className={`p-5 text-right font-black ${entry.deleted_at ? "line-through text-neutral-400" : "text-neutral-900"}`}
                    >
                      {formatCurrency(entry.value)}
                    </td>
                    <td className="p-5">
                      <div
                        className="text-xs text-neutral-500 italic truncate max-w-[150px]"
                        title={entry.obs}
                      >
                        {entry.obs || "-"}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      {!entry.deleted_at && (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-primary-600 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(entry)}
                            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-neutral-900">
                {editingItem ? "Editar Lançamento" : "Novo Lançamento"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Descrição
                </label>
                <input
                  disabled={editingItem?.source === "AUTO"} // Lock description for AUTO
                  required
                  type="text"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400 disabled:opacity-60"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Valor (R$)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Tipo
                  </label>
                  <select
                    disabled={editingItem?.source === "AUTO"} // Only lock for AUTO
                    value={formData.tipo_movimentacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_movimentacao: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400 disabled:opacity-60"
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Categoria
                </label>
                <select
                  disabled={editingItem?.source === "AUTO"} // Lock category for AUTO
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400 disabled:opacity-60"
                >
                  {categories.map((cat) => (
                    <option key={cat.id_categoria} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Observação
                </label>
                <textarea
                  disabled={editingItem?.source === "AUTO"} // Lock OBS for AUTO
                  rows={3}
                  value={formData.obs}
                  onChange={(e) =>
                    setFormData({ ...formData, obs: e.target.value })
                  }
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-medium text-neutral-900 outline-none focus:border-neutral-400 disabled:opacity-60"
                />
                {editingItem?.source === "AUTO" && (
                  <p className="text-[10px] text-red-500 mt-1">
                    * Obs e Categoria não editáveis em lançamentos automáticos.
                  </p>
                )}
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 shadow-lg"
                >
                  {editingItem ? "Salvar Alterações" : "Criar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-black text-neutral-900 mb-2">
              Excluir Lançamento?
            </h2>
            <p className="text-neutral-500 mb-6">
              Esta ação irá inativar o registro. Para lançamentos automáticos,
              isso não desfaz a OS ou Pagamento original, apenas remove do Livro
              Caixa visível.
            </p>

            {itemToDelete?.source === "MANUAL" && (
              <input
                value={deleteObs}
                onChange={(e) => setDeleteObs(e.target.value)}
                placeholder="Motivo da exclusão (obs)..."
                className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-medium text-sm outline-none focus:border-red-200 mb-6"
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
