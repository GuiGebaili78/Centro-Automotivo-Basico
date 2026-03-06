import { Modal } from "../ui";
import { PagamentoClienteForm } from "../financeiro/Forms/PagamentoClienteForm";
import { formatCurrency } from "../../utils/formatCurrency";

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
        <h4 className="text-sm font-medium text-gray-600 uppercase mb-2">
          Histórico de Pagamentos
        </h4>
        {pagamentos.length > 0 ? (
          pagamentos.map((pag) => (
              <div
                key={pag.id_pagamento_cliente}
                className={`flex justify-between text-base text-gray-900 p-3 border-b border-neutral-100 ${pag.deleted_at ? "line-through opacity-50" : ""}`}
              >
                <span className="text-gray-500">
                  {new Date(pag.data_pagamento).toLocaleDateString()} -{" "}
                  {pag.metodo_pagamento}
                </span>
                <span className="text-gray-900">
                  {formatCurrency(Number(pag.valor))}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic mt-4 text-center uppercase tracking-widest">
              Nenhum pagamento registrado.
            </p>
        )}
      </div>
    </Modal>
  );
};
