import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { FinanceiroService } from "../../services/financeiro.service";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Settings,
  Wallet,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { ActionButton, Button, Input, Modal } from "../ui";
import { UniversalFilters } from "../common/UniversalFilters";
import type { UniversalFiltersState } from "../common/UniversalFilters";
import { useUniversalFilter } from "../../hooks/useUniversalFilter";
import { CategoryManager } from "./CategoryManager";
import { CategorySelector } from "./CategorySelector";
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
  parentId: number | null;
}

export const MovimentacoesTab = () => {
  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);

  // Filters
  const [universalFilters, setUniversalFilters] = useState<UniversalFiltersState>({
    search: "", osId: "", status: "ALL", operadora: "", fornecedor: "",
    startDate: "", endDate: "", activePeriod: "ALL",
  });
  // Lists for selects — built from loaded data
  const [fornecedoresList, setFornecedoresList] = useState<{ id: string; nome: string }[]>([]);
  const [operadorasList, setOperadorasList] = useState<{ id: string; nome: string }[]>([]);

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
    id_categoria: undefined as number | undefined,
    obs: "",
  });

  const [summaries, setSummaries] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    balance: 0,
  });

  // Summary cards — re-fetch when date/search changes
  useEffect(() => {
    FinanceiroService.getSummary({
      startDate: universalFilters.startDate,
      endDate: universalFilters.endDate,
      source: "ALL",
      category: "ALL",
      search: universalFilters.search,
    })
      .then(setSummaries)
      .catch((err) => console.error("Erro ao buscar resumo financeiro", err));
  }, [universalFilters.startDate, universalFilters.endDate, universalFilters.search]);

  useEffect(() => {
    loadData();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await FinanceiroService.getCategoriasFinanceiras();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    try {
      const [manual, payments, inflows, ops] = await Promise.all([
        FinanceiroService.getLivroCaixa(),
        FinanceiroService.getPagamentosPeca(),
        FinanceiroService.getPagamentosCliente(),
        FinanceiroService.getOperadorasCartao(),
      ]);

      // Build Operators Map
      const opMap: Record<number, string> = {};
      (ops || []).forEach((op: any) => {
        opMap[op.id_operadora] = op.nome;
      });

      // Build Payment Maps (Link LivroCaixa ID -> Payment Data)
      const lcPaymentMap: Record<number, any> = {};
      (inflows || []).forEach((p: any) => {
        if (p.id_livro_caixa) {
          lcPaymentMap[p.id_livro_caixa] = p;
        }
      });

      const lcSupplierMap: Record<number, string> = {};
      let paymentsData = (payments as any)?.data || payments || [];
      paymentsData.forEach((p: any) => {
        if (p.id_livro_caixa) {
          // If multiple parts share same LC (batch), we'll just take the supplier from the record
          // (Batch entries usually have a generic description anyway, but individual ones will have specific suppliers)
          const name =
            p.fornecedor?.nome_fantasia || p.fornecedor?.nome || "Fornecedor";
          if (!lcSupplierMap[p.id_livro_caixa]) {
            lcSupplierMap[p.id_livro_caixa] = name;
          } else if (!lcSupplierMap[p.id_livro_caixa].includes(name)) {
            // If multiple suppliers in a batch, it gets messy, but usually batch description handles it.
            // For simplicity, let's keep the first or join them if it's small.
            lcSupplierMap[p.id_livro_caixa] += `, ${name}`;
          }
        }
      });

      // 1. Manual Entries (from Libro Caixa)
      // Enrich with values from Linked Payment if available
      const manualEntries = manual
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
            supplier: lcSupplierMap[e.id_livro_caixa] || null,
            paymentMethod: methodDisplay, // Enriched info
          };
        });

      // 2. Auto Outflows (Payments to Suppliers)
      // BREAKING CHANGE: API now returns { data: [...], pagination: {...} }
      paymentsData = (payments as any)?.data || payments || [];
      const outflows = paymentsData
        .filter(
          (p: any) =>
            // Only show if NOT linked to LivroCaixa (prevent duplication)
            !p.id_livro_caixa &&
            !p.livro_caixa &&
            ((p.pago_ao_fornecedor && p.data_pagamento_fornecedor) ||
              p.deleted_at),
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
            description: `OS Nº ${p.item_os?.id_os ?? "?"} - ${veh?.modelo ?? "Veículo"} ${veh?.cor ? veh.cor : ""} (${veh?.placa ?? "SEM-PLACA"}) - ${p.item_os?.descricao ?? "Peça"}`,
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
      // ONLY show payments that have are NOT consolidated/linked to prevent duplication
      // (The consolidated entry comes from manualRes/LivroCaixa)
      const outflowsInflows = (inflows || [])
        .filter((p: any) => !p.livro_caixa && !p.id_livro_caixa) // Check if relation exists
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
            description: `Serviços: OS Nº ${os?.id_os ?? "?"} - ${veh?.modelo ?? "Veículo"} ${veh?.placa ? `(${veh.placa})` : ""}`,
            type: "IN",
            value: Number(p.valor),
            category: "Receita",
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

      const combined = [...manualEntries, ...outflows, ...outflowsInflows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setCashBookEntries(combined);

      // Build lists for UniversalFilters selects
      const uniqueSuppliers = [
        ...new Map(
          combined
            .filter((e) => e.supplier)
            .map((e) => [e.supplier, { id: e.supplier!, nome: e.supplier! }])
        ).values(),
      ];
      setFornecedoresList(uniqueSuppliers);
      setOperadorasList(
        (ops || []).map((op: any) => ({ id: op.nome, nome: op.nome }))
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados financeiros.");
    }
  };

  // Filtered via hook
  const filteredCashBook = useUniversalFilter(cashBookEntries, universalFilters, {
    dateField: "date",
    statusField: "type",
    paidValue: "IN",
    pendingValue: "OUT",
    fornecedorField: "supplier",
    operadoraField: "conta_bancaria",
  });


  const { totalInflow, totalOutflow, balance } = summaries;



  const handleOpenEdit = (entry: any) => {
    setEditingItem(entry);
    if (entry.source === "MANUAL") {
      setFormData({
        descricao: entry.originalData.descricao,
        valor: entry.originalData.valor,
        tipo_movimentacao: entry.originalData.tipo_movimentacao,
        categoria: entry.originalData.categoria,
        id_categoria: entry.originalData.id_categoria,
        obs: entry.originalData.obs || "",
      });
    } else if (entry.source === "AUTO") {
      setFormData({
        descricao: entry.description,
        valor: entry.originalData.custo_real || entry.originalData.valor,
        tipo_movimentacao: entry.type === "IN" ? "ENTRADA" : "SAIDA",
        categoria: entry.category,
        id_categoria: entry.originalData.id_categoria,
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
          await FinanceiroService.updateLivroCaixa(editingItem.rawId, formData);
        } else if (editingItem.id.startsWith("in-")) {
          // Allow editing observation for Client Payments
          await FinanceiroService.updatePagamentoCliente(editingItem.rawId, {
            valor: Number(formData.valor),
            observacao: formData.obs,
          });
        } else if (editingItem.id.startsWith("out-")) {
          await FinanceiroService.updatePagamentoPeca(editingItem.rawId, {
            custo_real: Number(formData.valor),
          });
        }
        toast.success("Lançamento atualizado!");
      } else {
        await FinanceiroService.createLivroCaixa({
          ...formData,
          valor: Number(formData.valor),
          origem: "MANUAL",
        });
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
        await FinanceiroService.deleteLivroCaixa(itemToDelete.rawId, deleteObs);
      } else if (itemToDelete.id.startsWith("in-")) {
        await FinanceiroService.deletePagamentoCliente(itemToDelete.rawId);
      } else if (itemToDelete.id.startsWith("out-")) {
        await FinanceiroService.deletePagamentoPeca(itemToDelete.rawId);
      }

      toast.success("Lançamento deletado (estornado).");
      setIsDeleteModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar lançamento.");
    }
  };

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
          <h2 className="text-xl font-bold text-neutral-600">
            Histórico de Movimentações
          </h2>
          <p className="text-neutral-600 text-sm">
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
        {/* Filters */}
        <UniversalFilters
          onFilterChange={setUniversalFilters}
          config={{
            enableFornecedor: true,
            enableOperadora: true,
            enableOsId: true,
            fornecedores: fornecedoresList,
            operadoras: operadorasList,
            statusOptions: [
              { value: "ALL", label: "Todos" },
              { value: "PAID", label: "Entradas" },
              { value: "PENDING", label: "Saídas" },
            ],
          }}
        />

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowDownCircle size={20} />
              </div>
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
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
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
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
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
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
            <thead className="bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-gray-600">
              <tr>
                <th className="p-4 text-left">Data</th>
                <th className="p-4 text-left">Descrição</th>
                <th className="p-4 text-left">Tipo</th>
                <th className="p-4 text-left">Categoria</th>
                <th className="p-4 text-left">Conta / Origem</th>
                <th className="p-4 text-right whitespace-nowrap min-w-[150px]">
                  Valor
                </th>
                <th className="p-4 text-left">Obs</th>
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
                      <div className="flex flex-col">
                        <span className="text-base text-gray-900">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`p-4 ${entry.deleted_at ? "line-through text-neutral-400" : "text-neutral-900"}`}
                    >
                      {(() => {
                         // Pagamento de Fornecedores
                         if (entry.id.startsWith("out-")) {
                            const os = entry.originalData?.item_os?.ordem_de_servico;
                            const veh = os?.veiculo;
                            return (
                               <div className="flex flex-col">
                                  <div className="text-base text-neutral-600 font-normal">Pg. Auto Peças - OS | {os?.id_os || "?"}</div>
                                  <div className="text-base text-neutral-600 font-normal">{veh?.modelo || "Veículo"} - {veh?.cor || "Cor"} - {veh?.placa || "Placa"}</div>
                                  <div className="text-sm text-neutral-500 font-normal">Pago a: {entry.supplier || "Fornecedor"}</div>
                               </div>
                            );
                         }
                         // Recebimento da OS
                         if (entry.id.startsWith("in-")) {
                            const os = entry.originalData?.ordem_de_servico;
                            const veh = os?.veiculo;
                            return (
                               <div className="flex flex-col">
                                  <div className="text-base text-neutral-900 font-normal">OS | {os?.id_os || "?"} - {veh?.modelo || "Veículo"} - {veh?.cor || ""} - {veh?.placa || "Placa"}</div>
                                  <div className="text-base text-neutral-900 font-normal">{os?.diagnostico || os?.defeito_relatado || "Sem diagnóstico"}</div>
                                  <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                               </div>
                            );
                         }
                         // Pagamento Equipes / Contas a Pagar
                         const isEquipe = entry.originalData?.tipo_lancamento === "PAGAMENTO_EQUIPE" || entry.category?.toLowerCase().includes("equipe");
                         if (entry.source === "MANUAL") {
                            if (isEquipe) {
                               const nomeMatch = entry.description.split(" - ")[1] || entry.description;
                               const isVale = entry.originalData?.tipo_lancamento === "VALE" || entry.description.toLowerCase().includes("adiantamento");
                               return (
                                  <div className="flex flex-col">
                                     <div className="text-base text-neutral-900 font-normal">Pg. Equipe - {nomeMatch}</div>
                                     <div className="text-base text-neutral-900 font-normal">{isVale ? "Adiantamento" : "Pagamento"}</div>
                                     <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                                  </div>
                               );
                            } else {
                               // Contas
                               return (
                                  <div className="flex flex-col">
                                     <div className="text-base text-neutral-900 font-normal">Pg. de Contas: {entry.description}</div>
                                     <div className="text-base text-neutral-900 font-normal">{entry.supplier ? `Pago a: ${entry.supplier}` : <>&nbsp;</>}</div>
                                     <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                                  </div>
                               );
                            }
                         }

                         // Fallback
                         return (
                            <div className="flex flex-col">
                               <div className="text-base text-neutral-900 font-normal">{entry.description.replace(/OS Nº (\d+)/g, "OS | $1")}</div>
                               <div className="text-base text-neutral-900 font-normal min-h-[1.25rem]">&nbsp;</div>
                               <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                            </div>
                         );
                      })()}
                      {/* Show manual obs if exists */}
                      {entry.source === "MANUAL" && entry.obs && (
                        <div className="text-sm text-gray-400 mt-0.5 italic">
                          {entry.obs}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-sm uppercase tracking-wider ${
                        entry.deleted_at
                          ? "bg-neutral-100 text-neutral-500 line-through"
                          : entry.type === "IN"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                      }`}>
                        {entry.deleted_at ? "CANCELADO" : entry.type === "IN" ? "Entrada" : "Saída"} ({entry.source === "MANUAL" ? "M" : "A"})
                      </span>
                    </td>
                    <td className="p-4">
                      {/* Categoria L1 lowercase conforme regra geral */}
                       <div className="flex flex-col">
                          <div className="text-base text-neutral-900 font-normal lowercase">{entry.category || "outros"}</div>
                          <div className="text-sm font-normal min-h-[1.25rem]">&nbsp;</div>
                          <div className="text-sm font-normal min-h-[1.25rem]">&nbsp;</div>
                       </div>
                    </td>
                    <td className="p-4">
                      {/* Conta / Origem com lógica de 3 linhas (referida como Categoria pelo usuário para as condicionais) */}
                      {(() => {
                         const bancoLowerCase = (entry.conta_bancaria || "Caixa Geral Indefinido").toLowerCase();
                         if (entry.id.startsWith("out-") || entry.id.startsWith("man-")) {
                            // Pg Fornecedores / Equipes / Contas usam esse fallback (L2/L3 vazios)
                            return (
                               <div className="flex flex-col">
                                  <div className="text-base text-neutral-600 font-normal lowercase">{bancoLowerCase}</div>
                                  <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                                  <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                               </div>
                            );
                         }
                         if (entry.id.startsWith("in-")) {
                            // Recebimento OS
                            const method = entry.paymentMethod || entry.originalData?.forma_pagamento || "Não informado";
                            return (
                               <div className="flex flex-col">
                                  <div className="text-base text-neutral-600 font-normal lowercase">{bancoLowerCase}</div>
                                  <div className="text-base text-neutral-600 font-normal">{method}</div>
                                  <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                               </div>
                            );
                         }
                         return (
                             <div className="flex flex-col">
                                <div className="text-base text-neutral-600 font-normal lowercase">{bancoLowerCase}</div>
                                <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                                <div className="text-sm text-neutral-500 font-normal min-h-[1.25rem]">&nbsp;</div>
                             </div>
                         );
                      })()}
                    </td>
                    <td
                      className={`p-4 text-right text-base font-medium whitespace-nowrap ${
                        entry.deleted_at
                          ? "line-through text-gray-400"
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
                          className="text-sm text-gray-500 italic truncate max-w-[150px] block"
                          title={entry.obs}
                        >
                          {entry.obs}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
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
                        <span className="text-sm font-bold text-red-300 uppercase">
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
                <label>Tipo</label>
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
                    className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer disabled:opacity-50"
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
              <CategorySelector
                categories={categories}
                value={formData.id_categoria}
                onChange={(id, nome) =>
                  setFormData({
                    ...formData,
                    id_categoria: id,
                    categoria: nome,
                  })
                }
              />
            </div>

            <div>
              <label>Observação (Opcional)</label>
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
                <p className="text-sm text-red-600 mt-2">
                  Essa ação registrará um estorno e não poderá ser desfeita
                  completamente (o registro será mantido como excluído).
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">
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
