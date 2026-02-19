import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../../../utils/formatCurrency";
import { api } from "../../../services/api";
import {
  Calendar,
  CheckCircle,
  Search,
  FilterX,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { IRecebivelCartao } from "../../../types/backend";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { toast } from "react-toastify";

export const RecebiveisTab = () => {
  const [recebiveis, setRecebiveis] = useState<IRecebivelCartao[]>([]);
  const [originalData, setOriginalData] = useState<IRecebivelCartao[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState<
    "PENDENTE" | "RECEBIDO" | "ALL"
  >("PENDENTE");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOsId, setSearchOsId] = useState(""); // Dedicated OS Search
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
  const [selectedOperadoraId, setSelectedOperadoraId] = useState<
    number | "ALL"
  >("ALL");
  const [operadoras, setOperadoras] = useState<any[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
    loadOperadoras();
  }, []);

  const loadOperadoras = async () => {
    try {
      const res = await api.get("/operadora-cartao");
      setOperadoras(res.data);
    } catch (error) {
      console.error("Erro ao carregar operadoras:", error);
    }
  };

  const loadData = async (start?: string, end?: string) => {
    try {
      const params: any = {};
      if (start) params.dataInicio = start;
      if (end) params.dataFim = end;

      const res = await api.get(
        start || end ? "/recebivel-cartao/date-range" : "/recebivel-cartao",
        {
          params,
        },
      );
      setOriginalData(res.data);
      applyFilters(res.data, filterStatus, searchTerm, selectedOperadoraId);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar recebíveis.");
    }
  };

  const applyFilters = (
    data: IRecebivelCartao[],
    status: string,
    search: string,
    operadoraId: number | "ALL",
  ) => {
    let filtered = data;

    // 1. Status Filter
    if (status !== "ALL") {
      filtered = filtered.filter((r) => r.status === status);
    }

    // 2. Operadora Filter
    if (operadoraId !== "ALL") {
      filtered = filtered.filter((r) => r.id_operadora === Number(operadoraId));
    }

    // 3. Search Term (Dynamic "letra a letra" in all relevant columns)
    if (search.trim()) {
      const term = search.toLowerCase();
      const terms = term.split(" ").filter((t) => t.trim() !== "");

      // Helper para limpar termos de busca (ex: remover # para buscar numero OS)
      const cleanTerm = (t: string) => t.replace("#", "");

      filtered = filtered.filter((r) => {
        const searchString = [
          (r as any).codigo_autorizacao || "",
          (r as any).nsu || "",
          (r as any).ordem_de_servico?.veiculo?.placa || "",
          (r as any).ordem_de_servico?.veiculo?.modelo || "",
          (r as any).ordem_de_servico?.veiculo?.cor || "",
          (r as any).ordem_de_servico?.cliente?.pessoa_fisica?.pessoa?.nome ||
            "",
          (r as any).ordem_de_servico?.cliente?.pessoa_juridica?.razao_social ||
            "",
          (r as any).operadora?.nome || "",
          (r as any).bandeira_cartao || "",
          `#${r.id_os}`, // Permite busca exata "#22"
          `OS Nº ${r.id_os}`, // Permite busca "OS Nº 22"
          `OS N ${r.id_os}`, // Permite busca "OS N 22"
          `OSN${r.id_os}`, // Permite busca "OSN22"
          `OS ${r.id_os}`, // Permite busca "OS 22"
          `OS${r.id_os}`, // Permite busca "OS22"
          r.id_os?.toString() || "", // Permite busca "22"
          r.valor_bruto?.toString() || "",
          (Number(r.valor_bruto) || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
          r.valor_liquido?.toString() || "",
          (Number(r.valor_liquido) || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
          r.num_parcela?.toString() || "",
          `${r.num_parcela}/${r.total_parcelas}`,
          new Date(r.data_prevista).toLocaleDateString("pt-BR"),
          r.total_parcelas > 1 ? "parcelado" : "vista",
          r.status === "RECEBIDO" ? "recebido pago" : "pendente aberto",
        ]
          .join(" ")
          .toLowerCase();

        // Verifica se TODOS os termos digitados estão na string de busca
        return terms.every(
          (t) =>
            searchString.includes(t) || searchString.includes(cleanTerm(t)),
        );
      });
    }

    setRecebiveis(filtered);
  };

  useEffect(() => {
    applyFilters(originalData, filterStatus, searchTerm, selectedOperadoraId);
  }, [filterStatus, originalData, searchTerm, selectedOperadoraId]);

  const handleDateChange = (type: "start" | "end", val: string) => {
    setActiveShortcut(null);
    const newRange = { ...dateRange, [type]: val };
    setDateRange(newRange);
    if (newRange.start && newRange.end) {
      loadData(newRange.start, newRange.end);
    }
  };

  const setPresetRange = (days: number) => {
    const today = new Date();
    const start = today.toISOString().split("T")[0];

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    const end = futureDate.toISOString().split("T")[0];

    setDateRange({ start, end });
    loadData(start, end);
  };

  const clearFilters = () => {
    setFilterStatus("PENDENTE");
    setSelectedOperadoraId("ALL");
    setSearchTerm("");
    setDateRange({ start: "", end: "" });
    setActiveShortcut(null);
    loadData();
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === recebiveis.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recebiveis.map((r) => r.id_recebivel));
    }
  };

  // CONCILIATION
  const [showConciliateModal, setShowConciliateModal] = useState(false);

  // SEARCH STATES (Already defined at top, avoiding duplicates)
  // const [searchTerm, setSearchTerm] = useState(""); // DUPLICATE REMOVED
  // const [searchOsId, setSearchOsId] = useState(""); // DUPLICATE REMOVED

  const executeConciliacao = async () => {
    try {
      await api.post("/recebivel-cartao/confirmar", { ids: selectedIds });
      toast.success("Recebimentos confirmados e conciliados!");
      setSelectedIds([]);
      loadData(dateRange.start, dateRange.end);
      setShowConciliateModal(false);
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.details ||
        error.response?.data?.error ||
        "Erro ao conciliar recebíveis.";
      toast.error(msg);
    }
  };

  const handleConciliar = () => {
    if (selectedIds.length === 0) return;
    setShowConciliateModal(true);
  };

  const totalSelected = recebiveis
    .filter((r) => selectedIds.includes(r.id_recebivel))
    .reduce((acc, r) => acc + Number(r.valor_liquido), 0);

  const totalPrevisto = recebiveis.reduce(
    (acc, r) => acc + Number(r.valor_liquido),
    0,
  );

  // Filter Logic (Applied inside component for now, or use Memo if heavy)
  const filteredData = useMemo(() => {
    let data = recebiveis;

    // Filter by Status (Already done by API usually, but client side refinement)
    if (filterStatus !== "ALL") {
      data = data.filter((r) => r.status === filterStatus);
    }

    // Filter by Operadora
    if (selectedOperadoraId !== "ALL") {
      data = data.filter((r) => r.id_operadora === Number(selectedOperadoraId));
    }

    // Filter by OS ID
    if (searchOsId) {
      data = data.filter((r) => r.id_os === Number(searchOsId));
    }

    // Filter by Search Term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.operadora?.nome?.toLowerCase().includes(lower) ||
          r.id_os?.toString().includes(lower) ||
          // removed OS concatenation to avoid false positives as requested,
          // since we have dedicated OS search now.
          r.valor_liquido?.toString().includes(lower),
      );
    }

    return data;
  }, [recebiveis, filterStatus, selectedOperadoraId, searchOsId, searchTerm]);

  return (
    <div className="p-6 space-y-6">
      {/* ... Header ... */}

      {/* FILTERS CONTAINER */}
      <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-end">
          {/* OS Search Field */}
          <div className="xl:col-span-2">
            <label className="text-sm font-semibold text-neutral-700 ml-1 mb-1.5 block">
              Nº OS
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">
                #
              </span>
              <input
                type="number"
                value={searchOsId}
                onChange={(e) => setSearchOsId(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500 transition-all text-sm"
                placeholder="ID"
              />
            </div>
          </div>

          {/* Search Field */}
          <div className="xl:col-span-4">
            <Input
              label="Filtro Rápido (Placa, Operadora...)"
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Busca inteligente..."
            />
          </div>

          {/* Operadora Select */}
          <div className="xl:col-span-3 space-y-1.5">
            <label className="text-sm font-semibold text-neutral-700 ml-1">
              Operadora
            </label>
            <div className="relative">
              <select
                value={selectedOperadoraId}
                onChange={(e) =>
                  setSelectedOperadoraId(
                    e.target.value === "ALL" ? "ALL" : Number(e.target.value),
                  )
                }
                className="w-full bg-neutral-50 border border-neutral-200 px-4 py-[11px] rounded-xl font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">Todas as Operadoras</option>
                {operadoras.map((op) => (
                  <option key={op.id_operadora} value={op.id_operadora}>
                    {op.nome}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                {/* Could add an arrow icon here if needed */}
              </div>
            </div>
          </div>

          {/* Date Range Fields */}
          <div className="xl:col-span-3">
            <label className="text-sm font-semibold text-neutral-700 ml-1 mb-1.5 block">
              Período Customizado
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateChange("start", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2.5 rounded-xl font-bold text-[11px] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-inner uppercase"
                />
              </div>
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateChange("end", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2.5 rounded-xl font-bold text-[11px] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-inner uppercase"
                />
              </div>
            </div>
          </div>

          {/* Clear Button */}
          <div className="xl:col-span-2">
            <Button
              variant="primary" // Changed to primary as requested
              onClick={clearFilters}
              className="w-full h-[46px] shadow-lg shadow-primary-500/20"
              icon={FilterX}
            >
              Limpar Filtro
            </Button>
          </div>
        </div>

        {/* Date Shortcut Pills */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
          <div className="flex bg-neutral-50 p-1 rounded-lg border border-neutral-100 gap-1 w-fit">
            {[
              { label: "Hoje", days: 0 },
              { label: "7 Dias", days: 7 },
              { label: "15 Dias", days: 15 },
              { label: "30 Dias", days: 30 },
              { label: "60 Dias", days: 60 },
              { label: "90 Dias", days: 90 },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => {
                  setPresetRange(card.days);
                  setActiveShortcut(card.label);
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  activeShortcut === card.label
                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {card.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VALUE SUMMARY & ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* PREVISÃO NO PERÍODO - DYNAMIC */}
        {/* PREVISÃO NO PERÍODO */}
        <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden group">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-primary-400" />
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Previsão no Período (Filtrado)
              </p>
            </div>
            <p className="text-3xl font-black text-blue-600 tracking-tighter">
              {formatCurrency(totalPrevisto)}
            </p>
            <p className="text-[10px] text-neutral-400 mt-2 font-bold uppercase tracking-wider italic">
              * Soma total dos itens visíveis abaixo
            </p>
          </div>
        </div>

        {/* ACTION BOX (IF SELECTED) */}
        {selectedIds.length > 0 && (
          <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-primary-100 shadow-xl shadow-primary-500/10 flex flex-col md:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-300 ring-1 ring-primary-500">
            <div className="flex items-center gap-4">
              <div className="bg-primary-50 p-3 rounded-lg text-primary-600">
                <CheckCircle size={28} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">
                  Confirmar Depósito
                </p>
                <p className="text-3xl font-black text-neutral-900 tracking-tighter">
                  {formatCurrency(totalSelected)}
                </p>
                <p className="text-xs font-bold text-neutral-500 mt-1">
                  {selectedIds.length} transações selecionadas
                </p>
              </div>
            </div>
            <Button
              onClick={handleConciliar}
              className="w-full md:w-auto shadow-lg"
              variant="primary"
              icon={Calendar}
              size="lg"
            >
              Dar Baixa no Banco
            </Button>
          </div>
        )}
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="tabela-limpa w-full">
            <thead>
              <tr className="bg-neutral-50 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                <th className="p-4 w-14 text-center">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      recebiveis.length > 0 &&
                      selectedIds.length === recebiveis.length
                    }
                    className="w-5 h-5 rounded-lg border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Previsão</th>
                <th className="p-4">Nº / Aut.</th>
                <th className="p-4">Operadora</th>
                <th className="p-4">Veículo / Cliente</th>
                <th className="p-4">Detalhes</th>
                <th className="p-4 text-right">Bruto</th>
                <th className="p-4 text-right">Taxa</th>
                <th className="p-4 text-right font-black text-neutral-900">
                  Líquido
                </th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <Search size={48} className="mb-4" />
                      <p className="text-lg font-bold text-neutral-500">
                        Nenhum recebível encontrado
                      </p>
                      <p className="text-sm font-medium">
                        Tente ajustar os filtros ou pesquisar outro termo.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((r) => (
                  <tr
                    key={r.id_recebivel}
                    className={`group hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0 ${r.status === "RECEBIDO" ? "opacity-60 bg-neutral-50/50" : ""}`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id_recebivel)}
                        onChange={() => toggleSelect(r.id_recebivel)}
                        disabled={r.status === "RECEBIDO"}
                        className="w-5 h-5 rounded-lg border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-800 text-sm whitespace-nowrap">
                          {new Date(r.data_prevista).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">
                          Estimado
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-neutral-600 font-mono font-bold bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 w-fit">
                        {(r as any).codigo_autorizacao || (r as any).nsu || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-black text-[10px]">
                          {(r as any).operadora?.nome?.substring(0, 1) || "O"}
                        </div>
                        <span className="font-bold text-neutral-900 text-sm">
                          {(r as any).operadora?.nome || "Operadora"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-800 uppercase text-xs">
                            {(r as any).ordem_de_servico?.veiculo?.placa ||
                              "S/P"}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">
                            {(r as any).ordem_de_servico?.veiculo?.modelo ||
                              "S/M"}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">
                            {(r as any).ordem_de_servico?.veiculo?.cor || "S/M"}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-medium mt-1">
                          {(r as any).ordem_de_servico?.cliente?.pessoa_fisica
                            ?.pessoa?.nome ||
                            (r as any).ordem_de_servico?.cliente
                              ?.pessoa_juridica?.razao_social ||
                            "Cliente não identificado"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span
                          className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md w-fit mb-1 cursor-help"
                          title={`Data da Venda: ${new Date(r.data_venda).toLocaleDateString("pt-BR")}`}
                        >
                          OS Nº {r.id_os}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">
                          Parcela {r.num_parcela} de {r.total_parcelas}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase mt-0.5 bg-neutral-100 px-1.5 py-0.5 rounded w-fit">
                          {(() => {
                            if (r.total_parcelas > 1)
                              return "Crédito Parcelado";
                            const payments =
                              (r.ordem_de_servico as any)?.pagamentos_cliente ||
                              [];
                            const cardPayments = payments.filter((p: any) =>
                              ["CREDITO", "DEBITO"].includes(
                                p.metodo_pagamento,
                              ),
                            );

                            const match = cardPayments.find(
                              (p: any) =>
                                Math.abs(
                                  Number(p.valor) - Number(r.valor_bruto),
                                ) < 0.1,
                            );
                            if (match)
                              return match.metodo_pagamento === "CREDITO"
                                ? "Crédito à Vista"
                                : "Débito";

                            if (cardPayments.length === 1)
                              return cardPayments[0].metodo_pagamento ===
                                "CREDITO"
                                ? "Crédito à Vista"
                                : "Débito";

                            return "Crédito a Vista ou Débito";
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium text-neutral-500 text-sm">
                      {formatCurrency(Number(r.valor_bruto))}
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-lg">
                        {/* Ajuste o '2' para quantas casas decimais você deseja */}
                        - {Number(r.taxa_aplicada).toFixed(2).replace(".", ",")}
                        %
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-neutral-900 text-base">
                        {formatCurrency(Number(r.valor_liquido))}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {r.status === "RECEBIDO" ? (
                        <div className="flex flex-col items-center">
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle size={12} /> Recebido
                          </span>
                          {r.data_recebimento && (
                            <span className="text-[9px] text-neutral-400 font-bold mt-1">
                              {new Date(r.data_recebimento).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-primary-100">
                          <Clock size={12} /> Aberto
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
      {/* CONCILIATION MODAL */}
      {showConciliateModal && (
        <Modal
          title="Confirmar Conciliação"
          onClose={() => setShowConciliateModal(false)}
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <CheckCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900">
                  Confirmar Recebimento
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Deseja marcar <b>{selectedIds.length}</b> transações como
                  recebidas?
                  <br />
                  <span className="text-xs opacity-75">
                    Isso atualizará o saldo das contas vinculadas.
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">
                Total a Conciliar
              </p>
              <p className="text-2xl font-black text-neutral-800">
                {formatCurrency(totalSelected)}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowConciliateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={executeConciliacao}
                icon={CheckCircle}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
