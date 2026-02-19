import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Calendar, Wrench, FileText } from "lucide-react";

import { OsStatus } from "../../../types/os.types";

interface OsCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (status: OsStatus) => void;
  clientName?: string;
  vehicleName?: string;
}

export const OsCreationModal = ({
  isOpen,
  onClose,
  onSelect,
  clientName,
  vehicleName,
}: OsCreationModalProps) => {
  if (!isOpen) return null;

  const handleSchedule = () => {
    // Agora implementado oficialmente
    onSelect(OsStatus.AGENDAMENTO);
    onClose();
  };

  return (
    <Modal
      title="Nova Ordem de Serviço"
      onClose={onClose}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {(clientName || vehicleName) && (
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
            <p className="text-sm text-neutral-500 uppercase font-bold tracking-widest mb-1">
              Cliente / Veículo Selecionado
            </p>
            <h3 className="text-lg font-black text-neutral-800">
              {clientName || "Cliente"}
            </h3>
            <p className="text-base text-neutral-600 font-medium">
              {vehicleName || "Veículo"}
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-700">
          <p className="text-center font-medium">
            Selecione como deseja iniciar este atendimento.
          </p>
          <p className="text-center text-xs mt-1opacity-80">
            Agendamentos e Orçamentos podem ser convertidos em OS Aberta
            posteriormente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleSchedule}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-neutral-200 hover:border-purple-500 hover:bg-purple-50 transition-all group text-center"
          >
            <div className="p-4 bg-purple-100 text-purple-600 rounded-full group-hover:scale-110 transition-transform">
              <Calendar size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-800 mb-1">
                Agendar Horário
              </h3>
              <p className="text-xs text-neutral-500">
                Reservar um horário para o futuro. (Em Breve)
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect(OsStatus.ORCAMENTO)}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-neutral-200 hover:border-amber-500 hover:bg-amber-50 transition-all group text-center"
          >
            <div className="p-4 bg-amber-100 text-amber-600 rounded-full group-hover:scale-110 transition-transform">
              <FileText size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-800 mb-1">
                Criar Orçamento
              </h3>
              <p className="text-xs text-neutral-500">
                Inicia como Cotação. Pode ser aprovado ou arquivado.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect(OsStatus.ABERTA)}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-neutral-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-center"
          >
            <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
              <Wrench size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-800 mb-1">
                Abrir OS Direta
              </h3>
              <p className="text-xs text-neutral-500">
                Inicia serviço imediatamente. Status ABERTA.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
