import { Modal } from "../../ui/Modal";
import { PagamentoClienteForm } from "../../forms/PagamentoClienteForm";
import { formatCurrency } from "../../../utils/formatCurrency";

interface PaymentOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  osId: number;
  totalPending: number;
  pagamentos: any[];
  onSuccess: () => void;
}

export const PaymentOsModal = ({
  isOpen,
  onClose,
  osId,
  totalPending,
  pagamentos,
  onSuccess,
}: PaymentOsModalProps) => {
  if (!isOpen) return null;

  return (
    <Modal title="Pagamentos" onClose={onClose}>
      <PagamentoClienteForm
        osId={osId}
        valorTotal={totalPending}
        onSuccess={onSuccess}
        onCancel={onClose}
      />
      <div className="mt-6 border-t pt-4">
        <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">
          Histórico de Pagamentos
        </h4>
        {pagamentos.length > 0 ? (
          pagamentos.map((pag) => (
            <div
              key={pag.id_pagamento_cliente}
              className={`flex justify-between text-xs p-2 border-b ${pag.deleted_at ? "line-through opacity-50" : ""}`}
            >
              <span>
                {new Date(pag.data_pagamento).toLocaleDateString()} -{" "}
                {pag.metodo_pagamento}
              </span>
              <span className="font-bold">
                {formatCurrency(Number(pag.valor))}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-neutral-400 italic">
            Nenhum pagamento registrado.
          </p>
        )}
      </div>
    </Modal>
  );
};
