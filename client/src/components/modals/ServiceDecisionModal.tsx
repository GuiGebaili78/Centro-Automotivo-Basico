import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Calendar, Wrench, ArrowRight } from "lucide-react";

interface ServiceDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOS: () => void;
  onSchedule: () => void;
  clientName?: string;
  vehicleName?: string;
}

export const ServiceDecisionModal = ({
  isOpen,
  onClose,
  onOpenOS,
  onSchedule,
  clientName,
  vehicleName,
}: ServiceDecisionModalProps) => {
  if (!isOpen) return null;

  return (
    <Modal
      title="Como deseja prosseguir?"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
          <p className="text-sm text-neutral-500 uppercase font-bold tracking-widest mb-1">
            Cliente / Veículo
          </p>
          <h3 className="text-lg font-black text-neutral-800">
            {clientName || "Cliente"}
          </h3>
          <p className="text-base text-neutral-600 font-medium">
            {vehicleName || "Veículo"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={onSchedule}
            className="group flex flex-col items-center p-8 rounded-2xl border-2 border-neutral-100 hover:border-purple-200 hover:bg-purple-50 transition-all text-center gap-4"
          >
            <div className="p-4 bg-purple-100 text-purple-600 rounded-full group-hover:scale-110 transition-transform">
              <Calendar size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-800 mb-1">
                Agendamento / Orçamento
              </h3>
              <p className="text-sm text-neutral-500 leading-snug">
                Criar um orçamento ou agendar serviço para uma data futura.
              </p>
            </div>
          </button>

          <button
            onClick={onOpenOS}
            className="group flex flex-col items-center p-8 rounded-2xl border-2 border-neutral-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-center gap-4"
          >
            <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
              <Wrench size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-800 mb-1">
                Abrir Ordem de Serviço
              </h3>
              <p className="text-sm text-neutral-500 leading-snug">
                Iniciar serviço imediatamente com status "ABERTA".
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
