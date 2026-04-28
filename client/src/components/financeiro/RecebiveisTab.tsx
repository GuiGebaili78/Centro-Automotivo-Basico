import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { FinanceiroService } from "../../services/financeiro.service";
import {
  Calendar,
  CheckCircle,
  Search,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { IRecebivelCartao } from "../../types/backend";
import { Button, Modal } from "../ui";
import { toast } from "react-toastify";
import { UniversalFilters } from "../common/UniversalFilters";
import type { UniversalFiltersState } from "../common/UniversalFilters";
import { useUniversalFilter } from "../../hooks/useUniversalFilter";

export const RecebiveisTab = () => {
  const [recebiveis, setRecebiveis] = useState<IRecebivelCartao[]>([]);
  const [operadoras, setOperadoras] = useState<any[]>([]);

  // Universal Filters
  const [universalFilters, setUniversalFilters] = useState<UniversalFiltersState>({
    search: "", osId: "", status: "PENDING", operadora: "", fornecedor: "",
    startDate: "", endDate: "", activePeriod: "ALL",
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showConciliateModal, setShowConciliateModal] = useState(false);

  useEffect(() => {
    loadOperadoras();
  }, []);


  const loadOperadoras = async () => {
    try {
      const data = await FinanceiroService.getOperadorasCartao();
      setOperadoras(data);
    } catch (error) {
      console.error("Erro ao carregar operadoras:", error);
    }
  };

  const loadData = useCallback(async (start?: string, end?: string) => {
    try {
      const data =
        start || end
          ? await FinanceiroService.getRecebiveisCartaoByDateRange(
              start ?? "",
              end ?? "",
            )
          : await FinanceiroService.getRecebiveisCartao();
      setRecebiveis(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar recebíveis.");
    }
  }, []);

  // Re-fetch when date range changes (backend filter)
  useEffect(() => {
    loadData(universalFilters.startDate, universalFilters.endDate);
  }, [universalFilters.startDate, universalFilters.endDate, loadData]);


  // Client-side filtering via hook (operadora, status, osId, busca geral)
  const filteredData = useUniversalFilter(recebiveis, universalFilters, {
    dateField: "data_prevista",
    statusField: "status",
    paidValue: "RECEBIDO",
    pendingValue: "PENDENTE",
    operadoraField: "id_operadora",
    osIdField: "id_os",
  });

  const operadorasList = operadoras.map((op) => ({
    id: String(op.id_operadora),
    nome: op.nome,
  }));

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((r) => r.id_recebivel));
    }
  };


  const executeConciliacao = async () => {
    try {
      await FinanceiroService.confirmarRecebiveis(selectedIds, new Date().toISOString());
      toast.success("Recebimentos confirmados e conciliados!");
      setSelectedIds([]);
      loadData(universalFilters.startDate, universalFilters.endDate);
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

  const totalSelected = filteredData
    .filter((r) => selectedIds.includes(r.id_recebivel))
    .reduce((acc, r) => acc + Number(r.valor_liquido), 0);

  const totalPrevisto = filteredData.reduce(
    (acc, r) => acc + Number(r.valor_liquido),
    0,
  );

  // Filter Logic — handled by useUniversalFilter above

  return (
    <div className="p-6 space-y-6">
      {/* ... Header ... */}

      {/* Universal Filters */}
      <UniversalFilters
        onFilterChange={setUniversalFilters}
        config={{
          enableFornecedor: false,
          enableOperadora: true,
          enableOsId: true,
          operadoras: operadorasList,
          statusOptions: [
            { value: "ALL", label: "Todos" },
            { value: "PENDING", label: "Pendentes" },
            { value: "PAID", label: "Recebidos" },
          ],
        }}
      />

      {/* VALUE SUMMARY & ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* PREVISÃO NO PERÍODO - DYNAMIC */}
        {/* PREVISÃO NO PERÍODO */}
        <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden group">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-primary-400" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                Previsão no Período (Filtrado)
              </p>
            </div>
            <p className="text-3xl font-black text-blue-600 tracking-tighter">
              {formatCurrency(totalPrevisto)}
            </p>
            <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider italic">
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
                <p className="text-sm font-bold text-primary-500 uppercase tracking-widest">
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
              <tr className="bg-neutral-50 text-sm font-medium text-gray-600">
                <th className="p-4 w-14 text-center">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      filteredData.length > 0 &&
                      selectedIds.length === filteredData.length
                    }
                    className="w-5 h-5 rounded-lg border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 text-left">Previsão</th>
                <th className="p-4 text-left">Nº / Aut.</th>
                <th className="p-4 text-left">Operadora</th>
                <th className="p-4 text-left">Veículo / Cliente</th>
                <th className="p-4 text-left">Detalhes</th>
                <th className="p-4 text-right">Bruto</th>
                <th className="p-4 text-right">Taxa</th>
                <th className="p-4 text-right font-medium text-gray-900">
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
                        <span className="text-base text-gray-900 font-medium whitespace-nowrap">
                          {new Date(r.data_prevista).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                        <span className="text-xs text-gray-500">Estimado</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900 font-mono bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 w-fit">
                        {(r as any).codigo_autorizacao || (r as any).nsu || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-black text-sm">
                          {(r as any).operadora?.nome?.substring(0, 1) || "O"}
                        </div>
                        <span className="text-base text-gray-900 font-medium">
                          {(r as any).operadora?.nome || "Operadora"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="flex flex-col">
                          <span className="text-base font-medium uppercase text-gray-900">
                            {(r as any).ordem_de_servico?.veiculo?.modelo ||
                              "S/M"}{" "}
                            •{" "}
                            {(r as any).ordem_de_servico?.veiculo?.cor || "S/C"}
                          </span>
                          <span className="text-base uppercase text-primary-600">
                            {(r as any).ordem_de_servico?.veiculo?.placa ||
                              "S/P"}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-600 mt-1">
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
                          className="text-sm font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md w-fit mb-1 cursor-help"
                          title={`Data da Venda: ${new Date(r.data_venda).toLocaleDateString("pt-BR")}`}
                        >
                          OS | {r.id_os}
                        </span>
                        <span className="text-sm text-gray-500">
                          Parcela {r.num_parcela} de {r.total_parcelas}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-base text-gray-500">
                      {formatCurrency(Number(r.valor_bruto))}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-lg">
                          - {Number(r.taxa_aplicada).toFixed(2).replace(".", ",")}%
                        </span>
                        <span className="text-xs text-neutral-500 font-medium">
                          {formatCurrency(Number(r.valor_bruto) - Number(r.valor_liquido))}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-base text-gray-900 font-medium">
                        {formatCurrency(Number(r.valor_liquido))}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {r.status === "RECEBIDO" ? (
                        <div className="flex flex-col items-center">
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle size={12} /> Recebido
                          </span>
                          {(r.confirmado_em || r.data_recebimento) && (
                            <span className="text-sm text-neutral-400 font-bold mt-1 text-center leading-tight">
                              {new Date(r.confirmado_em || r.data_recebimento!).toLocaleDateString("pt-BR")}<br />
                              <span className="text-xs font-medium opacity-75">
                                {r.confirmado_em ? new Date(r.confirmado_em).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : "23:59"}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 border border-primary-100">
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
