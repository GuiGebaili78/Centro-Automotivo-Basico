import { useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { FinanceiroService } from "../../services/financeiro.service";
import { OsItemsService } from "../../services/osItems.service";
import {
  Search,
  Truck,
  Calendar,
  CheckSquare,
  Square,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import {
  ActionButton,
  Button,
  Input,
  Modal,
  FilterButton,
  Select,
} from "../ui";
import type { IPagamentoPeca, IFornecedor } from "../../types/backend";
import type {
  IFinanceiroStatusMsg,
  IPaymentFilters,
} from "../../types/financeiro.types";

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
  // State
  const [filters, setFilters] = useState<IPaymentFilters>({
    status: "PENDING",
    supplier: "",
    plate: "",
    startDate: "",
    endDate: "",
  });
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM" | "ALL"
  >("ALL");

  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Filter Logic
  const filteredPayments = payments
    .filter((p) => {
      if (filters.status === "PENDING" && p.pago_ao_fornecedor) return false;
      if (filters.status === "PAID" && !p.pago_ao_fornecedor) return false;

      if (filters.startDate) {
        const start = new Date(filters.startDate);
        const date = new Date(p.data_compra);
        if (date < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        const date = new Date(p.data_compra);
        if (date > end) return false;
      }

      const supplierMatch = filters.supplier
        ? String(p.id_fornecedor) === filters.supplier
        : true;
      const plateMatch = filters.plate
        ? p.item_os?.ordem_de_servico?.veiculo?.placa
            ?.toLowerCase()
            .includes(filters.plate.toLowerCase())
        : true;

      return supplierMatch && plateMatch;
    })
    .sort(
      (a, b) =>
        new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime(),
    );

  const totalPending = filteredPayments
    .filter((p) => !p.pago_ao_fornecedor)
    .reduce((acc, p) => acc + Number(p.custo_real), 0);
  const totalPaid = filteredPayments
    .filter((p) => p.pago_ao_fornecedor)
    .reduce((acc, p) => acc + Number(p.custo_real), 0);

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH" | "ALL") => {
    setActiveFilter(type);
    if (type === "ALL") {
      setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
      return;
    }
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    if (type === "TODAY") {
      setFilters((prev) => ({
        ...prev,
        startDate: todayStr,
        endDate: todayStr,
      }));
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setFilters((prev) => ({
        ...prev,
        startDate: weekAgo.toLocaleDateString("en-CA"),
        endDate: todayStr,
      }));
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilters((prev) => ({
        ...prev,
        startDate: firstDay.toLocaleDateString("en-CA"),
        endDate: todayStr,
      }));
    }
  };

  // Actions
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

      if (editPayment.item_os && editPayment.ref_nota) {
        await OsItemsService.update(editPayment.item_os.id_iten, {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block tracking-widest">
              Status Pagamento
            </label>
            <div className="flex bg-neutral-100 rounded-xl p-1 gap-1">
              <FilterButton
                active={filters.status === "PENDING"}
                onClick={() => setFilters({ ...filters, status: "PENDING" })}
              >
                PENDENTES
              </FilterButton>
              <FilterButton
                active={filters.status === "PAID"}
                onClick={() => setFilters({ ...filters, status: "PAID" })}
              >
                PAGAS
              </FilterButton>
              <FilterButton
                active={filters.status === "ALL"}
                onClick={() => setFilters({ ...filters, status: "ALL" })}
              >
                TODAS
              </FilterButton>
            </div>
          </div>
          <div>
            <Select
              label="Fornecedor"
              value={filters.supplier}
              onChange={(e) =>
                setFilters({ ...filters, supplier: e.target.value })
              }
            >
              <option value="">Todos</option>
              {fornecedores.map((f) => (
                <option key={f.id_fornecedor} value={f.id_fornecedor}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Buscar por Placa"
              value={filters.plate}
              onChange={(e) =>
                setFilters({ ...filters, plate: e.target.value })
              }
              placeholder="Digite a placa do veículo da OS..."
              icon={Search}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end md:items-center gap-4 border-t border-neutral-100 pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase whitespace-nowrap min-w-[90px] tracking-widest">
              Data Compra:
            </span>

            <div className="flex bg-neutral-50 p-1 rounded-lg w-fit border border-neutral-200 gap-1">
              <FilterButton
                active={activeFilter === "TODAY"}
                onClick={() => applyQuickFilter("TODAY")}
              >
                Hoje
              </FilterButton>
              <FilterButton
                active={activeFilter === "WEEK"}
                onClick={() => applyQuickFilter("WEEK")}
              >
                Semana
              </FilterButton>
              <FilterButton
                active={activeFilter === "MONTH"}
                onClick={() => applyQuickFilter("MONTH")}
              >
                Mês
              </FilterButton>
            </div>

            <div className="flex gap-2 items-center">
              <div className="w-32">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setActiveFilter("CUSTOM");
                  }}
                  className={`h-9 px-2 text-[10px] uppercase font-bold ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                />
              </div>
              <span className="text-neutral-400">-</span>
              <div className="w-32">
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setActiveFilter("CUSTOM");
                  }}
                  className={`h-9 px-2 text-[10px] uppercase font-bold ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setFilters({
                status: "PENDING",
                supplier: "",
                plate: "",
                startDate: "",
                endDate: "",
              });
              setActiveFilter("ALL");
            }}
            variant="outline"
            size="sm"
            icon={X}
            className="md:ml-auto"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
              Total Pendente (Selecionado)
            </p>
            <p className="text-2xl font-black text-red-600">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl text-red-200">
            <Square size={24} />
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">
              Total Pago (Selecionado)
            </p>
            <p className="text-2xl font-black text-green-600">
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
            <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
              <th className="p-5">Data Compra</th>
              <th className="p-5">Ref / Nota</th>
              <th className="p-5">Peça</th>
              <th className="p-5">Fornecedor</th>
              <th className="p-5">Veículo / OS</th>
              <th className="p-5 text-right w-32">Valor Custo</th>
              <th className="p-5 text-center w-24">Pago?</th>
              <th className="p-5 text-center w-16">Editar</th>
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
                  className={`hover:bg-neutral-25 transition-colors ${
                    p.pago_ao_fornecedor ? "opacity-75" : ""
                  }`}
                >
                  <td className="p-5">
                    <div className="flex items-center gap-2 font-bold text-neutral-600 text-xs">
                      <Calendar size={14} />
                      {new Date(p.data_compra).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="font-mono text-xs font-black text-neutral-600 bg-neutral-100 px-2 py-1 rounded w-fit">
                      {p.item_os?.codigo_referencia || "---"}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-neutral-900 text-sm">
                      {p.item_os?.descricao}
                    </p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-orange-500" />
                      <span className="font-bold text-neutral-700 text-xs uppercase">
                        {p.fornecedor?.nome}
                      </span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div>
                      <p className="font-black text-neutral-800 text-xs uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded w-fit">
                        {p.item_os?.ordem_de_servico?.veiculo?.placa || "N/A"}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-bold mt-1">
                        OS Nº {String(p.item_os?.id_os).padStart(4, "0")}
                      </p>
                    </div>
                  </td>
                  <td className="p-5 text-right font-black text-neutral-900">
                    {formatCurrency(Number(p.custo_real))}
                  </td>
                  <td className="p-5 text-center">
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
                  <td className="p-5 text-center">
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
