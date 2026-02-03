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
  Settings,
  Wallet,
  Edit,
  AlertTriangle,
  FilterX,
} from "lucide-react";
import { ActionButton } from "../ui/ActionButton";
import { CategoryManager } from "./CategoryManager";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { toast } from "react-toastify";

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
  const [activeQuickFilter, setActiveQuickFilter] = useState<
    "TODAY" | "WEEK" | "MONTH"
  >("TODAY");

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
  });

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
          let opName = null;

          if (methodDisplay === "CREDITO") {
            opName = opMap[p.id_operadora] || p.bandeira_cartao || "Cartão";
            const parc =
              p.qtd_parcelas > 1 ? ` (${p.qtd_parcelas}x)` : " (À Vista)";
            const nsu = p.codigo_transacao
              ? ` | NSU/Aut: ${p.codigo_transacao}`
              : "";
            methodDisplay = `CRÉDITO ${opName}${parc} - ${p.bandeira_cartao || ""}${nsu}`;
          }
          if (methodDisplay === "DEBITO") {
            opName = opMap[p.id_operadora] || p.bandeira_cartao || "Cartão";
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
          const contaDisplay = p.conta_bancaria
            ? p.conta_bancaria.nome
            : opName || null;

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
            obs: p.obs || p.observacao || p.livro_caixa?.obs || "",
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
      toast.error("Erro ao carregar dados financeiros.");
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
        (Number(entry.value) || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        }),
        new Date(entry.date).toLocaleDateString("pt-BR"),
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
    setActiveQuickFilter(type);
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA"); // Ensure YYYY-MM-DD
    if (type === "TODAY") {
      setCashFilterStart(todayStr);
      setCashFilterEnd(todayStr);
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setCashFilterStart(weekAgo.toLocaleDateString("en-CA"));
      setCashFilterEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setCashFilterStart(firstDay.toLocaleDateString("en-CA"));
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

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        if (editingItem.id.startsWith("man-")) {
          await api.put(`/livro-caixa/${editingItem.rawId}`, formData);
        } else if (editingItem.id.startsWith("in-")) {
          // Allow editing observation for Client Payments
          await api.put(`/pagamento-cliente/${editingItem.rawId}`, {
            valor: formData.valor,
            observacao: formData.obs,
          });
        } else if (editingItem.id.startsWith("out-")) {
          await api.put(`/pagamento-peca/${editingItem.rawId}`, {
            custo_real: formData.valor,
          });
        }
        toast.success("Lançamento atualizado!");
      } else {
        await api.post("/livro-caixa", { ...formData, origem: "MANUAL" });
        toast.success("Lançamento criado!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar lançamento.");
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

      toast.success("Lançamento deletado (estornado).");
      setIsDeleteModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar lançamento.");
    }
  };

  const getQuickFilterClass = (type: "TODAY" | "WEEK" | "MONTH") =>
    `flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
      activeQuickFilter === type
        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
        : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
    }`;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 relative">
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
        <Button
          variant="secondary"
          onClick={() => setIsCategoryModalOpen(true)}
          icon={Settings}
        >
          Categorias
        </Button>
      </div>

      <div className="space-y-6">
        {/* Filters Board */}
        <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col xl:flex-row justify-between items-end gap-6">
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-3">
              <Input
                label="Buscar"
                value={cashSearch}
                onChange={(e) => setCashSearch(e.target.value)}
                placeholder="Pesquisar..."
                icon={Search}
              />
            </div>

            {/* Dates */}
            <div className="md:col-span-4 flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                  De
                </label>
                <input
                  type="date"
                  value={cashFilterStart}
                  onChange={(e) => {
                    setCashFilterStart(e.target.value);
                    setActiveQuickFilter(null as any); // Clear quick filter
                  }}
                  className={`w-full h-[42px] px-3 rounded-lg border text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors uppercase ${
                    activeQuickFilter
                      ? "border-neutral-200 text-neutral-600"
                      : "border-primary-300 text-primary-700"
                  }`}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                  Até
                </label>
                <input
                  type="date"
                  value={cashFilterEnd}
                  onChange={(e) => {
                    setCashFilterEnd(e.target.value);
                    setActiveQuickFilter(null as any);
                  }}
                  className={`w-full h-[42px] px-3 rounded-lg border text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors uppercase ${
                    activeQuickFilter
                      ? "border-neutral-200 text-neutral-600"
                      : "border-primary-300 text-primary-700"
                  }`}
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="md:col-span-5 flex items-center justify-end">
              <div className="w-full">
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                  Período
                </label>
                <div className="flex bg-neutral-50 p-1 rounded-lg border border-neutral-100 gap-1 h-[42px] items-center w-full">
                  <button
                    onClick={() => applyQuickFilter("TODAY")}
                    className={getQuickFilterClass("TODAY")}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => applyQuickFilter("WEEK")}
                    className={getQuickFilterClass("WEEK")}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => applyQuickFilter("MONTH")}
                    className={getQuickFilterClass("MONTH")}
                  >
                    Mês
                  </button>
                </div>
              </div>
            </div>

            {/* Source Filter */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                Origem
              </label>
              <div className="relative">
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value as any)}
                  className="w-full h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">Todas</option>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTO">Automática</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ArrowDownCircle size={14} />
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id_categoria} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ArrowDownCircle size={14} />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button
                variant="primary" // Changed to primary as requested
                onClick={() => {
                  setCashSearch("");
                  setFilterSource("ALL");
                  setFilterCategory("ALL");
                  setActiveQuickFilter("TODAY");
                  const now = new Date();
                  setCashFilterStart(now.toLocaleDateString("en-CA"));
                  setCashFilterEnd(now.toLocaleDateString("en-CA"));
                }}
                className="w-full h-[42px] shadow-lg shadow-primary-500/20"
                icon={FilterX}
                title="Limpar Filtros"
              >
                Limpar
              </Button>
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                className="w-full h-[42px] shadow-lg shadow-primary-500/20"
                icon={Plus}
                title="Novo Lançamento"
              >
                Novo
              </Button>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowDownCircle size={20} />
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                Entradas
              </p>
            </div>
            <p className="text-3xl font-black text-emerald-600">
              {formatCurrency(totalInflow)}
            </p>
          </div>
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <ArrowUpCircle size={20} />
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                Saídas
              </p>
            </div>
            <p className="text-3xl font-black text-red-600">
              {formatCurrency(totalOutflow)}
            </p>
          </div>
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Wallet size={20} />
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                Saldo
              </p>
            </div>
            <p
              className={`text-3xl font-black ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <table className="tabela-limpa w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Conta / Origem</th>
                <th className="p-4 text-right whitespace-nowrap min-w-[150px]">
                  Valor
                </th>
                <th className="p-4 font-bold text-neutral-400 uppercase text-[10px] tracking-widest">
                  Obs
                </th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCashBook.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center text-neutral-400 italic font-medium"
                  >
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                filteredCashBook.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-neutral-50 transition-colors group ${entry.deleted_at ? "opacity-50" : ""}`}
                  >
                    <td className="p-4">
                      <div
                        className={`flex items-center gap-2 font-bold text-xs ${entry.deleted_at ? "line-through text-neutral-400" : "text-neutral-600"}`}
                      >
                        <Calendar size={14} />
                        {new Date(entry.date).toLocaleDateString("pt-BR")}
                        <span className="text-[10px] text-neutral-400">
                          {new Date(entry.date).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`p-4 font-bold ${entry.deleted_at ? "line-through text-neutral-400" : "text-neutral-900"}`}
                    >
                      <div className="text-sm">{entry.description}</div>
                      {entry.source === "AUTO" && (
                        <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
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
                        <div className="text-[10px] text-neutral-400 font-medium mt-0.5 italic">
                          {entry.obs}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          entry.deleted_at
                            ? "bg-neutral-100 text-neutral-500 line-through"
                            : entry.type === "IN"
                              ? "bg-emerald-50 text-emerald-700"
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
                    <td className="p-4">
                      <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                        {entry.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-700">
                          {entry.conta_bancaria || "Caixa Geral / Indefinido"}
                        </span>
                        {entry.paymentMethod && (
                          <span className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                            {entry.paymentMethod}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`p-4 text-right font-black text-sm whitespace-nowrap ${
                        entry.deleted_at
                          ? "line-through text-neutral-400"
                          : entry.type === "IN"
                            ? "text-emerald-600"
                            : "text-red-600"
                      }`}
                    >
                      {entry.type === "IN" ? "+ " : "- "}
                      {formatCurrency(entry.value)}
                    </td>
                    <td className="p-4">
                      {entry.obs ? (
                        <span
                          className="text-xs text-neutral-500 italic truncate max-w-[150px] block"
                          title={entry.obs}
                        >
                          {entry.obs}
                        </span>
                      ) : (
                        <span className="text-neutral-300">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {!entry.deleted_at && (
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            icon={Edit}
                            onClick={() => handleOpenEdit(entry)}
                            label="Editar"
                            variant="neutral"
                          />
                          <ActionButton
                            icon={Trash2}
                            onClick={() => handleOpenDelete(entry)}
                            label="Excluir"
                            variant="danger"
                          />
                        </div>
                      )}
                      {entry.deleted_at && (
                        <span className="text-[10px] font-bold text-red-300 uppercase">
                          Excluído
                        </span>
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
        <Modal
          title={editingItem ? "Editar Lançamento" : "Novo Lançamento"}
          onClose={() => setIsModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <Input
                label="Descrição"
                required
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Ex: Compra de Material, Cafezinho..."
                readOnly={editingItem?.source === "AUTO"} // Prevent edit desc if auto
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Valor (R$)"
                  required
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  readOnly={editingItem?.source === "AUTO"} // Prevent edit value if auto (usually restricted)
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                  Tipo
                </label>
                <div className="relative">
                  <select
                    value={formData.tipo_movimentacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_movimentacao: e.target.value,
                      })
                    }
                    disabled={!!editingItem} // Usually can't change type after creation easily without messes, or enable it. Let's disable for safety or matching legacy.
                    className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2.5 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="ENTRADA">Entrada (+)</option>
                    <option value="SAIDA">Saída (-)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <ArrowDownCircle size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                  className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2.5 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id_categoria} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ArrowDownCircle size={14} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Observação (Opcional)
              </label>
              <textarea
                rows={3}
                value={formData.obs}
                onChange={(e) =>
                  setFormData({ ...formData, obs: e.target.value })
                }
                className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-lg font-medium text-neutral-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                readOnly={editingItem?.id.startsWith("out-")}
                placeholder={
                  editingItem?.id.startsWith("out-")
                    ? "Observação indisponível para Peças"
                    : "Detalhes do lançamento..."
                }
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                variant="primary"
                className="shadow-lg shadow-primary-500/20"
              >
                {editingItem ? "Salvar Alterações" : "Criar Lançamento"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM MODAL */}
      {isDeleteModalOpen && (
        <Modal
          title="Confirmar Exclusão"
          onClose={() => setIsDeleteModalOpen(false)}
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-600 shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-red-900">Atenção!</h3>
                <p className="text-sm text-red-700 mt-1">
                  Você está prestes a excluir o lançamento: <br />
                  <span className="font-black">
                    {itemToDelete?.description} (
                    {formatCurrency(itemToDelete?.value || 0)})
                  </span>
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Essa ação registrará um estorno e não poderá ser desfeita
                  completamente (o registro será mantido como excluído).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Motivo da Exclusão (Opcional)
              </label>
              <Input
                value={deleteObs}
                onChange={(e) => setDeleteObs(e.target.value)}
                placeholder="Ex: Lançado errado, Duplicado..."
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} icon={Trash2}>
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
