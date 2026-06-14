import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { getStatusStyle } from "../utils/osUtils";
import { api } from "../services/api";

import { FinanceiroService } from "../services/financeiro.service";
import { FornecedorService } from "../services/fornecedor.service";
import {
  ActionButton,
  Button,
  Input,
  PageLayout,
  Card,
  ConfirmModal,
  Modal,
  Select,
} from "../components/ui";
import { toast } from "react-toastify";
import {
  Truck,
  Calendar,
  CheckSquare,
  Square,
  Edit,
  Trash2,
  Save,
  DollarSign,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { ModalPagamentoUnificado } from "../components/financeiro/ModalPagamentoUnificado";
import { UniversalFilters } from "../components/common/UniversalFilters";
import type { UniversalFiltersState } from "../components/common/UniversalFilters";
import { useUniversalFilter } from "../hooks/useUniversalFilter";
import { NfSyncBadge } from "../components/financeiro/NfSyncBadge";

export const PagamentoPecaPage = () => {
  const [loading, setLoading] = useState(false);

  // --- DATA STATES ---
  const [payments, setPayments] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [nfsPendentes, setNfsPendentes] = useState<any[]>([]);

  // --- UNIVERSAL FILTERS ---
  const [universalFilters, setUniversalFilters] = useState<UniversalFiltersState>({
    search: "", osId: "", status: "PENDING", operadora: "", fornecedor: "",
    startDate: "", endDate: "", activePeriod: "ALL",
  });

  // --- BATCH SELECTION ---
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // --- MODAL STATES ---
  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    accountId: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [undoModal, setUndoModal] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });
  const [showZeroCostWarning, setShowZeroCostWarning] = useState(false);
  const [nfDetailsModal, setNfDetailsModal] = useState<{
    isOpen: boolean;
    nf: any | null;
    loading: boolean;
  }>({ isOpen: false, nf: null, loading: false });

  useEffect(() => {
    loadData();
  }, []);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [universalFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, suppliersData, accountsData, nfsData] = await Promise.all([
        FinanceiroService.getPagamentosPeca(),
        FornecedorService.getAll(),
        FinanceiroService.getContasBancarias(),
        FinanceiroService.getNfsPendentes(),
      ]);
      setPayments(paymentsData || []);
      setFornecedores(suppliersData);
      setAccounts(accountsData.filter((a: any) => a.ativo));
      setNfsPendentes(Array.isArray(nfsData) ? nfsData : (nfsData?.data ?? []));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const payment = payments.find((x) => x.id_pagamento_peca === id);
    if (payment?.nf_numero) return; // Trava de lote: impede selecionar itens com NF
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const executeUnpay = async () => {
    if (!undoModal.id) return;
    try {
      setLoading(true);
      await FinanceiroService.updatePagamentoPeca(undoModal.id, {
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

    const hasZeroCost = payments.some(
      (p) => selectedIds.includes(p.id_pagamento_peca) && Number(p.custo_real) === 0
    );

    if (hasZeroCost) {
      setShowZeroCostWarning(true);
      return;
    }

    setPaymentModal((prev) => ({ ...prev, isOpen: true }));
  };

  const processBatchPayment = async (data: {
    accountId: number;
    date: string;
    discountValue: number;
  }) => {
    try {
      setLoading(true);
      await FinanceiroService.baixaPagamentoPeca({
        ids: selectedIds,
        desconto_total_aplicado: data.discountValue,
        id_conta_bancaria: data.accountId,
        data_pagamento: data.date,
      });
      toast.success(`${selectedIds.length} pagamentos processados com sucesso!`);
      setSelectedIds([]);
      setPaymentModal((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erro ao processar pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!confirmDeleteId) return;
    try {
      setLoading(true);
      await FinanceiroService.deletePagamentoPeca(confirmDeleteId);
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
      await FinanceiroService.updatePagamentoPeca(editPayment.id_pagamento_peca, {
        custo_real: Number(editPayment.custo_real),
        id_fornecedor: Number(editPayment.id_fornecedor),
        data_compra: String(new Date(editPayment.data_compra).toISOString()),
        data_pagamento_fornecedor: editPayment.data_pagamento_fornecedor
          ? String(new Date(editPayment.data_pagamento_fornecedor).toISOString())
          : null,
        pago_ao_fornecedor: editPayment.pago_ao_fornecedor,
        nf_numero: editPayment.nf_numero || null,
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
      id_fornecedor: payment.id_pessoa || payment.id_fornecedor || "",
      data_compra: new Date(payment.data_compra).toISOString().split("T")[0],
      data_pagamento_fornecedor: payment.data_pagamento_fornecedor
        ? new Date(payment.data_pagamento_fornecedor).toISOString().split("T")[0]
        : "",
      ref_nota: payment.item_os?.codigo_referencia || "",
      nf_numero: payment.nf_numero || "",
    });
    setShowEditModal(true);
  };

  const handleNfClick = async (nf_numero: string) => {
    setNfDetailsModal({ isOpen: true, nf: null, loading: true });
    try {
      const centralNfs = await FinanceiroService.getNotasFiscaisCentral();
      const nfData = centralNfs.find((n: any) => n.nf_numero === nf_numero);
      setNfDetailsModal({ isOpen: true, nf: nfData || { nf_numero, not_found: true }, loading: false });
    } catch (error) {
      toast.error("Erro ao carregar detalhes da NF.");
      setNfDetailsModal({ isOpen: false, nf: null, loading: false });
    }
  };

  // --- Supplier list for UniversalFilters (memoized to avoid cascade re-renders) ---
  const fornecedoresList = useMemo(
    () =>
      fornecedores.map((f) => ({
        id: String(f.id_fornecedor),
        nome: String(f.nome_fantasia || f.nome || "").toUpperCase(),
      })),
    [fornecedores]
  );

  // --- Elevate id_os and id_fornecedor to root for hook comparison ---
  const pagamentosMapeados = payments.map((p) => ({
    ...p,
    id_os: p.item_os?.id_os || p.item_os?.ordem_de_servico?.id_os,
    // id_pessoa armazena o id_fornecedor da nova tabela Fornecedor
    id_fornecedor: p.id_pessoa,
  }));

  // --- Filtered via hook ---
  const filteredPayments = useUniversalFilter(pagamentosMapeados, universalFilters, {
    dateField: "data_compra",
    statusField: "pago_ao_fornecedor",
    paidValue: true,
    pendingValue: false,
    fornecedorField: "id_fornecedor",
    osIdField: "id_os",
  }).sort(
    (a, b) =>
      new Date(b.data_compra || 0).getTime() -
      new Date(a.data_compra || 0).getTime(),
  );

  // --- Totals ---
  const totalSelected = useMemo(() => {
    return filteredPayments
      .filter((p) => selectedIds.includes(p.id_pagamento_peca))
      .reduce((acc, p) => acc + Number(p.custo_real), 0);
  }, [filteredPayments, selectedIds]);

  const totalFiltered = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + Number(p.custo_real || 0), 0);
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
            toast.info("A criação manual será implementada em breve.");
          }}
        >
          Novo Pagamento
        </Button>
      }
    >
      <div className="space-y-6">

        {/* FILTERS */}
      <div className="mb-6">
        <UniversalFilters
          onFilterChange={setUniversalFilters}
          initialState={{ status: "PENDING" }}
          config={{
            isFutureProjection: true,
            enableFornecedor: true,
            enableOperadora: false,
            enableOsId: true,
            fornecedores: fornecedoresList,
            statusOptions: [
              { value: "ALL", label: "Todas" },
              { value: "PENDING", label: "Pendentes" },
              { value: "PAID", label: "Pagas" },
            ],
          }}
        />
      </div>    {/* Totals Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedIds.length > 0 ? (
            <div className="bg-blue-50 p-6 rounded-xl flex items-center justify-between border border-blue-200 shadow-sm animate-in zoom-in duration-300">
              <div>
                <p className="text-sm font-black uppercase tracking-widest mb-1 text-blue-400">
                  Selecionado para Baixa ({selectedIds.length})
                </p>
                <p className="text-3xl font-black tracking-tighter text-blue-700">
                  {formatCurrency(totalSelected)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button onClick={handleBatchConfirmClick} variant="primary" icon={Save}>
                  Confirmar Baixa
                </Button>
              </div>
            </div>
          ) : (
            <Card className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
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

          <Card className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
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
                <tr className="bg-neutral-50 text-sm font-bold text-neutral-500 uppercase tracking-widest">
                  <th className="p-5 text-left">OS / Data</th>
                  <th className="p-5 text-left">NF (Sincronização de Itens)</th>
                  <th className="p-5 text-left">Peça / Veículo</th>
                  <th className="p-5 text-left">Fornecedor</th>
                  <th className="p-5 text-center">Status OS</th>
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
                        <div className="flex flex-col">
                          <div className="text-base text-neutral-900 font-normal">
                            OS | {p.item_os?.id_os || p.item_os?.ordem_de_servico?.id_os || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-base text-neutral-600 font-normal mt-1">
                            <Calendar size={14} className="text-neutral-400" />
                            <span>
                              {p.data_compra
                                ? new Date(p.data_compra).toLocaleDateString("pt-BR")
                                : p.item_os?.dt_cadastro
                                  ? new Date(p.item_os.dt_cadastro).toLocaleDateString("pt-BR")
                                  : "N/A"}
                            </span>
                          </div>
                          <div className="text-sm font-normal text-neutral-500 min-h-[1.25rem]">
                            {(p.data_compra || p.item_os?.dt_cadastro) ?
                              new Date(
                                p.data_compra || p.item_os.dt_cadastro,
                              ).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : '\u00A0'}
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-base text-neutral-900 font-normal">
                            {p.item_os?.codigo_referencia || "---"}
                          </span>
                          {p.nf_numero && (
                            <div className="flex flex-col gap-1 mt-1 col-span-2">
                              <button
                                type="button"
                                onClick={() => handleNfClick(p.nf_numero)}
                                className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-sm text-center hover:bg-neutral-200 transition-colors"
                                title={`Ver detalhes da NF ${p.nf_numero}`}
                              >
                                NF: {p.nf_numero}
                              </button>
                              <div className="scale-95 origin-left">
                                <NfSyncBadge nf_numero={p.nf_numero} />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <div className="text-base text-neutral-900 font-normal max-w-[200px] truncate" title={p.item_os?.descricao}>
                            {p.item_os?.descricao || "N/I"}
                          </div>
                          <div className="text-base text-neutral-600 font-normal uppercase max-w-[200px] truncate mt-1">
                            {p.item_os?.ordem_de_servico?.veiculo?.modelo || "VEÍCULO N/A"} {p.item_os?.ordem_de_servico?.veiculo?.cor ? `• ${p.item_os.ordem_de_servico.veiculo.cor}` : ""}
                          </div>
                          <div className="text-sm text-neutral-500 font-normal uppercase min-h-[1.25rem]">
                            Placa: {p.item_os?.ordem_de_servico?.veiculo?.placa || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-base text-neutral-900 font-normal">
                          <Truck size={14} className="text-neutral-400" />
                          <span>
                            {p.fornecedor?.pessoa_juridica?.nome_fantasia || p.fornecedor?.pessoa_juridica?.razao_social || p.fornecedor?.nome 
                              ? String(p.fornecedor?.pessoa_juridica?.nome_fantasia || p.fornecedor?.pessoa_juridica?.razao_social || p.fornecedor?.nome).toUpperCase() 
                              : "AGUARDANDO CONSOLIDAÇÃO"}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        {(() => {
                          const st = p.item_os?.ordem_de_servico?.status || p.status_os || p.status || "ABERTA";
                          const displayLabel = st === "PRONTO PARA FINANCEIRO" ? "FINANCEIRO" : st.replace(/_/g, " ");
                          return (
                            <span className={`px-3 py-1 rounded-md text-sm font-black uppercase whitespace-nowrap ${getStatusStyle(st)}`}>
                              {displayLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-5 text-right text-base text-neutral-900 font-normal">
                        {formatCurrency(Number(p.custo_real))}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex justify-center">
                          {p.nf_numero ? (
                            <div className="flex flex-col items-center">
                              {p.pago_ao_fornecedor ? (
                                <button
                                  type="button"
                                  onClick={() => handleNfClick(p.nf_numero)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-in fade-in duration-300 hover:bg-emerald-100 transition-colors"
                                >
                                  ✓ Pago (NF: {p.nf_numero})
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleNfClick(p.nf_numero)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm animate-in fade-in duration-300 hover:bg-amber-100 transition-colors"
                                  title={`🔒 Item vinculado à NF ${p.nf_numero}. Clique para ver detalhes.`}
                                >
                                  Aguardando NF: {p.nf_numero}
                                </button>
                              )}
                            </div>
                          ) : p.pago_ao_fornecedor ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnpay(p.id_pagamento_peca)}
                              title={`Pago em: ${p.data_pagamento_fornecedor ? new Date(p.data_pagamento_fornecedor).toLocaleDateString() : "N/A"} (Clique para desfazer)`}
                            >
                              <CheckSquare
                                size={24}
                                className="text-emerald-500 fill-emerald-500/20"
                              />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSelection(p.id_pagamento_peca)}
                            >
                              {selectedIds.includes(p.id_pagamento_peca) ? (
                                <CheckSquare size={24} className="text-blue-600" />
                              ) : (
                                <Square size={24} className="text-neutral-300" />
                              )}
                            </Button>
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
                            onClick={() => setConfirmDeleteId(p.id_pagamento_peca)}
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

      {/* Edit Modal */}
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
                    setEditPayment({ ...editPayment, data_compra: e.target.value })
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
              <Select
                label="Nota Fiscal Vinculada (Sincronização)"
                value={editPayment.nf_numero}
                onChange={(e) =>
                  setEditPayment({ ...editPayment, nf_numero: e.target.value })
                }
                className="border-amber-300 focus:border-amber-500 focus:ring-amber-100 bg-amber-50/10 text-amber-900 font-medium"
              >
                <option value="">Sem Sincronização (Livre)</option>
                {nfsPendentes.map((nf) => {
                  const isExcedente = nf.matchPercent > 100 && nf.nf_numero !== editPayment.nf_numero;
                  return (
                    <option 
                      key={`${nf.nf_numero}_${nf.id_fornecedor || 'null'}`} 
                      value={nf.nf_numero}
                      disabled={isExcedente}
                    >
                      {nf.nf_numero} ({nf.credor || "Sem Credor"}) {isExcedente ? "(Excedeu o Valor)" : ""}
                    </option>
                  );
                })}
              </Select>
            </div>
            <div>
              <Select
                label="Fornecedor"
                value={String(editPayment.id_fornecedor || "")}
                onChange={(e) =>
                  setEditPayment({ ...editPayment, id_fornecedor: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {fornecedores.map((f) => (
                  <option key={f.id_fornecedor} value={String(f.id_fornecedor)}>
                    {String(f.nome_fantasia || f.nome || "").toUpperCase()}
                  </option>
                ))}
              </Select>
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

      {/* Modal de Pagamento Unificado */}
      <ModalPagamentoUnificado
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={processBatchPayment}
        totalAmount={totalSelected}
        bankAccounts={accounts}
        title={`Pagar ${selectedIds.length} Peça(s)`}
        showDiscount={true}
        isLoading={loading}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeletePayment}
        title="Excluir Pagamento"
        description="Tem certeza que deseja excluir este registro de conta a pagar? Esta ação é irreversível."
        variant="danger"
      />

      {/* Confirm Unpay Modal */}
      <ConfirmModal
        isOpen={undoModal.isOpen}
        onClose={() => setUndoModal({ isOpen: false, id: null })}
        onConfirm={executeUnpay}
        title="Estornar Pagamento"
        description="Deseja marcar este item como pendente novamente? O lançamento no livro caixa referente ao pagamento será mantido para histórico, mas o status voltará para 'Pendente'."
        confirmText="Estornar"
        variant="primary"
      />

      {/* Zero Cost Warning Modal */}
      <ConfirmModal
        isOpen={showZeroCostWarning}
        onClose={() => setShowZeroCostWarning(false)}
        onConfirm={() => {
          setShowZeroCostWarning(false);
          setPaymentModal((prev) => ({ ...prev, isOpen: true }));
        }}
        title="Atenção: Custo Zerado"
        description="O valor de custo de uma ou mais peças selecionadas é R$ 0,00. Esqueceu de preencher o valor? Tem certeza que deseja continuar?"
        confirmText="Continuar Mesmo Assim"
        variant="primary"
      />

      {/* NF Details Modal */}
      {nfDetailsModal.isOpen && (
        <Modal title={`Detalhes da Nota Fiscal: ${nfDetailsModal.nf?.nf_numero || "Carregando..."}`} onClose={() => setNfDetailsModal({ isOpen: false, nf: null, loading: false })}>
          <div className="space-y-4">
            {nfDetailsModal.loading ? (
              <div className="p-10 flex items-center justify-center text-neutral-500">
                Carregando informações da NF...
              </div>
            ) : nfDetailsModal.nf?.not_found ? (
              <div className="p-10 text-center flex flex-col items-center">
                <AlertTriangle size={40} className="text-amber-500 mb-2" />
                <p className="text-neutral-700 font-medium">Nota Fiscal não encontrada na central.</p>
                <p className="text-sm text-neutral-500 mt-1">Nenhum lançamento no contas a pagar, estoque ou itens de OS parece pertencer a esta NF de forma validada.</p>
              </div>
            ) : nfDetailsModal.nf ? (
              <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-neutral-500 uppercase">Credor Principal</p>
                    <p className="text-lg font-bold text-neutral-800">{nfDetailsModal.nf.credor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-neutral-500 uppercase">Valor Total (Contas a Pagar)</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(nfDetailsModal.nf.valor_total)}</p>
                  </div>
                </div>
                
                <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Boletos */}
                  {nfDetailsModal.nf.boletos?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-neutral-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Calendar size={16} className="text-neutral-400" />
                        Parcelas / Boletos ({nfDetailsModal.nf.boletos.length})
                      </h4>
                      <div className="grid gap-2">
                        {nfDetailsModal.nf.boletos.map((b: any, i: number) => (
                          <div key={b.id_conta_pagar || i} className="flex items-center justify-between p-3 bg-neutral-50 rounded border border-neutral-100">
                            <div>
                              <p className="font-medium text-sm text-neutral-800">{b.descricao}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">Vence: {new Date(b.dt_vencimento).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-neutral-700">{formatCurrency(b.valor)}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${b.status === "PAGO" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {b.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Peças de OS */}
                  {nfDetailsModal.nf.pecas_os?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-neutral-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <CheckSquare size={16} className="text-neutral-400" />
                        Peças aplicadas em OS ({nfDetailsModal.nf.pecas_os.length})
                      </h4>
                      <div className="grid gap-2">
                        {nfDetailsModal.nf.pecas_os.map((p: any, i: number) => (
                          <div key={p.id_pagamento_peca || i} className="flex items-center justify-between p-3 bg-neutral-50 rounded border border-neutral-100">
                            <div>
                              <p className="font-medium text-sm text-neutral-800 line-clamp-1">{p.descricao}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">OS: {p.id_os || "Avulsa"} • {p.veiculo}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-neutral-700">{formatCurrency(p.custo_real)}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.pago_ao_fornecedor ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"}`}>
                                {p.pago_ao_fornecedor ? "BAIXADO" : "PENDENTE"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estoque */}
                  {nfDetailsModal.nf.pecas_estoque?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-neutral-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Truck size={16} className="text-neutral-400" />
                        Entradas no Estoque ({nfDetailsModal.nf.pecas_estoque.length})
                      </h4>
                      <div className="grid gap-2">
                        {nfDetailsModal.nf.pecas_estoque.map((e: any, i: number) => (
                          <div key={e.id_entrada_estoque || i} className="flex items-center justify-between p-3 bg-neutral-50 rounded border border-neutral-100">
                            <div>
                              <p className="font-medium text-sm text-neutral-800">Entrada Lote #{e.id_entrada_estoque}</p>
                              <p className="text-xs text-neutral-500 mt-0.5">{new Date(e.data_compra).toLocaleDateString()}</p>
                            </div>
                            <span className="font-bold text-neutral-700">{formatCurrency(e.valor_total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setNfDetailsModal({ isOpen: false, nf: null, loading: false })}>
              Fechar
            </Button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};
