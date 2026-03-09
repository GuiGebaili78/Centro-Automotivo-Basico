import { useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { FinanceiroService } from "../../services/financeiro.service";
import { OsItemsService } from "../../services/osItems.service";
import {
  Truck,
  Calendar,
  CheckSquare,
  Square,
  Edit,
  Trash2,
} from "lucide-react";
import {
  ActionButton,
  Button,
  Input,
  Modal,
  Select,
} from "../ui";
import { UniversalFilters } from "../common/UniversalFilters";
import type { UniversalFiltersState } from "../common/UniversalFilters";
import { useUniversalFilter } from "../../hooks/useUniversalFilter";
import type { IPagamentoPeca, IFornecedor } from "../../types/backend";
import type { IFinanceiroStatusMsg } from "../../types/financeiro.types";

interface PagamentoPecasTabProps {
  payments: IPagamentoPeca[];
  fornecedores: IFornecedor[];
  onUpdate: () => void;
  setStatusMsg: (msg: IFinanceiroStatusMsg) => void;
  setLoading: (loading: boolean) => void;
}

export const PagamentoPecasTab = ({
  payments,
  fornecedores,
  onUpdate,
  setStatusMsg,
  setLoading,
}: PagamentoPecasTabProps) => {
  // ── Universal Filters ──────────────────────────────────────────────────────
  const [universalFilters, setUniversalFilters] = useState<UniversalFiltersState>({
    search: "", osId: "", status: "PENDING", operadora: "", fornecedor: "",
    startDate: "", endDate: "", activePeriod: "ALL",
  });

  // Supplier list for the select (id as String for exact match)
  const fornecedoresList = fornecedores.map((f) => ({
    id: String(f.id_fornecedor),
    nome: f.nome,
  }));

  // Elevate id_os to root — IPagamentoPeca has no top-level id_os
  const pagamentosMapeados = payments.map((p) => ({
    ...p,
    id_os: (p as any).item_os?.id_os || (p as any).item_os?.ordem_de_servico?.id_os,
  }));

  // Filtered array via hook
  const filteredPayments = useUniversalFilter(pagamentosMapeados, universalFilters, {
    dateField: "data_compra",
    statusField: "pago_ao_fornecedor",
    paidValue: true,
    pendingValue: false,
    fornecedorField: "id_fornecedor",
    osIdField: "id_os",
  }).sort(
    (a, b) =>
      new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime(),
  );

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalPending = filteredPayments
    .filter((p) => !p.pago_ao_fornecedor)
    .reduce((acc, p) => acc + Number(p.custo_real), 0);
  const totalPaid = filteredPayments
    .filter((p) => p.pago_ao_fornecedor)
    .reduce((acc, p) => acc + Number(p.custo_real), 0);

  // ── Modal State ────────────────────────────────────────────────────────────
  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleTogglePayment = async (
    paymentId: number,
    currentStatus: boolean,
  ) => {
    try {
      setLoading(true);
      await FinanceiroService.updatePagamentoPeca(paymentId, {
        pago_ao_fornecedor: !currentStatus,
        data_pagamento_fornecedor: !currentStatus
          ? new Date().toISOString()
          : null,
      });
      setStatusMsg({
        type: "success",
        text: !currentStatus
          ? "Pagamento marcado como realizado!"
          : "Pagamento reaberto.",
      });
      onUpdate();
      setTimeout(() => setStatusMsg({ type: null, text: "" }), 3000);
    } catch (error) {
      setStatusMsg({
        type: "error",
        text: "Erro ao atualizar status do pagamento.",
      });
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
          await FinanceiroService.deletePagamentoPeca(id);
          setStatusMsg({
            type: "success",
            text: "Pagamento excluído com sucesso!",
          });
          onUpdate();
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
      await FinanceiroService.updatePagamentoPeca(
        editPayment.id_pagamento_peca,
        {
          custo_real: Number(editPayment.custo_real),
          id_fornecedor: Number(editPayment.id_fornecedor),
          data_compra: new Date(editPayment.data_compra).toISOString(),
          data_pagamento_fornecedor: editPayment.data_pagamento_fornecedor
            ? new Date(editPayment.data_pagamento_fornecedor).toISOString()
            : null,
          pago_ao_fornecedor: editPayment.pago_ao_fornecedor,
        },
      );

      // Update reference code on the OS item if available
      const itemOs = (editPayment as any).item_os;
      if (itemOs && editPayment.ref_nota) {
        await OsItemsService.update(itemOs.id_iten, {
          codigo_referencia: editPayment.ref_nota,
        });
      }

      setStatusMsg({ type: "success", text: "Dados atualizados com sucesso!" });
      onUpdate();
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

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

      {/* Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-red-400 uppercase tracking-widest">
              Total Pendente (Filtrado)
            </p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl text-red-200">
            <Square size={24} />
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-green-400 uppercase tracking-widest">
              Total Pago (Filtrado)
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl text-green-200">
            <CheckSquare size={24} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50 text-neutral-400 text-sm uppercase tracking-wider font-bold">
              <th className="p-4 rounded-tl-xl text-left">Data Compra</th>
              <th className="p-4 text-left">Ref / Nota</th>
              <th className="p-4 text-left">Peça</th>
              <th className="p-4 text-left">Fornecedor</th>
              <th className="p-4 text-left">Veículo / OS</th>
              <th className="p-4 text-right w-32">Valor Custo</th>
              <th className="p-4 text-center w-24">Pago?</th>
              <th className="p-4 text-center w-16 rounded-tr-xl">Editar</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-10 text-center text-neutral-400 italic font-medium"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr
                  key={p.id_pagamento_peca}
                  className={`hover:bg-neutral-50 text-sm text-neutral-600 border-b border-neutral-100 transition-colors ${
                    p.pago_ao_fornecedor ? "opacity-75" : ""
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar size={14} className="text-neutral-400" />
                      {new Date(p.data_compra).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-sm text-neutral-600 bg-neutral-100 px-2 py-1 rounded border border-neutral-200 w-fit">
                      {(p as any).item_os?.codigo_referencia || "---"}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-neutral-800">
                      {(p as any).item_os?.descricao}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-orange-500" />
                      <span className="font-bold text-neutral-800">
                        {p.fornecedor?.nome}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <div className="flex flex-col">
                        <span className="font-bold uppercase text-neutral-800 leading-tight">
                          {(p as any).item_os?.ordem_de_servico?.veiculo?.modelo || "S/M"}{" "}
                          • {(p as any).item_os?.ordem_de_servico?.veiculo?.cor || "S/C"}
                        </span>
                        <span className="text-xs font-bold uppercase text-primary-600 leading-tight mt-0.5">
                          {(p as any).item_os?.ordem_de_servico?.veiculo?.placa || "S/P"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded w-fit mt-1">
                        OS | {(p as any).item_os?.id_os}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-neutral-800">
                    {formatCurrency(Number(p.custo_real))}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() =>
                        handleTogglePayment(
                          p.id_pagamento_peca,
                          p.pago_ao_fornecedor,
                        )
                      }
                      className="hover:scale-110 transition-transform active:scale-95 text-neutral-400 hover:text-neutral-600"
                      title={
                        p.pago_ao_fornecedor
                          ? "Desmarcar como pago"
                          : "Marcar como pago"
                      }
                    >
                      {p.pago_ao_fornecedor ? (
                        <CheckSquare
                          size={32}
                          className="text-green-500 fill-green-500/20"
                        />
                      ) : (
                        <Square
                          size={32}
                          className="text-neutral-300 stroke-[2.5]"
                        />
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
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

      {/* Edit Modal */}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Data Compra"
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
                <Input
                  label="Data Pagamento"
                  type="date"
                  value={editPayment.data_pagamento_fornecedor || ""}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      data_pagamento_fornecedor: e.target.value,
                    })
                  }
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
                <Select
                  label="Fornecedor"
                  value={editPayment.id_fornecedor}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      id_fornecedor: e.target.value,
                    })
                  }
                >
                  {fornecedores.map((f) => (
                    <option key={f.id_fornecedor} value={f.id_fornecedor}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

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
                className="flex-1"
              >
                Salvar Alterações
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
              <Button variant="danger" onClick={confirmModal.onConfirm}>
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
