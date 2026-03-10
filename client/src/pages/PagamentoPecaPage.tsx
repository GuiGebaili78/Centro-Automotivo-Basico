import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "../utils/formatCurrency";
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
} from "lucide-react";
import { ModalPagamentoUnificado } from "../components/financeiro/ModalPagamentoUnificado";
import { UniversalFilters } from "../components/common/UniversalFilters";
import type { UniversalFiltersState } from "../components/common/UniversalFilters";
import { useUniversalFilter } from "../hooks/useUniversalFilter";

export const PagamentoPecaPage = () => {
  const [loading, setLoading] = useState(false);

  // --- DATA STATES ---
  const [payments, setPayments] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

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
      const [paymentsData, suppliersData, accountsData] = await Promise.all([
        FinanceiroService.getPagamentosPeca(),
        FornecedorService.getAll(),
        FinanceiroService.getContasBancarias(),
      ]);
      setPayments(paymentsData || []);
      setFornecedores(suppliersData);
      setAccounts(accountsData.filter((a: any) => a.ativo));
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
        ? new Date(payment.data_pagamento_fornecedor).toISOString().split("T")[0]
        : "",
      ref_nota: payment.item_os?.codigo_referencia || "",
    });
    setShowEditModal(true);
  };

  // --- Supplier list for UniversalFilters ---
  const fornecedoresList = fornecedores.map((f) => ({
    id: String(f.id_fornecedor),
    nome: f.nome_fantasia || f.nome,
  }));

  // --- Elevate id_os to root for hook comparison ---
  const pagamentosMapeados = payments.map((p) => ({
    ...p,
    id_os: p.item_os?.id_os || p.item_os?.ordem_de_servico?.id_os,
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

        {/* Universal Filters */}
        <UniversalFilters
          onFilterChange={setUniversalFilters}
          config={{
            enableFornecedor: true,
            enableOperadora: false,
            enableOsId: true,
            fornecedores: fornecedoresList,
            statusOptions: [
              { value: "ALL", label: "Todos" },
              { value: "PENDING", label: "Pendentes" },
              { value: "PAID", label: "Pagos" },
            ],
          }}
        />

        {/* Totals Summary Cards */}
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
                  <th className="p-5 text-left">Ref / Nota</th>
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
                        <div className="text-base text-neutral-900 font-normal">
                          {p.item_os?.codigo_referencia || "---"}
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
                            {p.fornecedor?.nome_fantasia || p.fornecedor?.nome || "N/I"}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        {(() => {
                          const st = p.item_os?.ordem_de_servico?.status || "ABERTA";
                          const styles: Record<string, string> = {
                            FINALIZADA: "bg-emerald-100 text-emerald-700 ring-emerald-200",
                            PAGA_CLIENTE: "bg-neutral-100 text-neutral-600 ring-neutral-200",
                            "PRONTO PARA FINANCEIRO": "bg-amber-100 text-amber-700 ring-amber-200",
                            ABERTA: "bg-blue-100 text-blue-700 ring-blue-200",
                            EM_ANDAMENTO: "bg-cyan-100 text-cyan-700 ring-cyan-200",
                            CANCELADA: "bg-red-100 text-red-700 ring-red-200",
                          };
                          const style = styles[st] || "bg-gray-50 text-gray-500 ring-gray-200";
                          return (
                            <span
                              className={`px-3 py-1 rounded-md text-sm font-black uppercase ring-1 whitespace-nowrap ${style}`}
                            >
                              {st === "PRONTO PARA FINANCEIRO"
                                ? "FINANCEIRO"
                                : st.replace(/_/g, " ")}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-5 text-right text-base text-neutral-900 font-normal">
                        {formatCurrency(Number(p.custo_real))}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex justify-center">
                          {p.pago_ao_fornecedor ? (
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
                label="Fornecedor"
                value={editPayment.id_fornecedor}
                onChange={(e) =>
                  setEditPayment({ ...editPayment, id_fornecedor: e.target.value })
                }
              >
                {fornecedores.map((f) => (
                  <option key={f.id_fornecedor} value={f.id_fornecedor}>
                    {f.nome_fantasia || f.nome}
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
    </PageLayout>
  );
};
