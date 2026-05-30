import { Modal, Button } from "../index";
import { useAlerts } from "../../../contexts/AlertsContext";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ContasPreventivoModal = () => {
  const { isContasModalOpen, setIsContasModalOpen, pendingContasCount } = useAlerts();
  const navigate = useNavigate();

  if (!isContasModalOpen) return null;

  const handleGoToFinance = () => {
    setIsContasModalOpen(false);
    navigate("/financeiro/contas-pagar");
  };

  return (
    <Modal
      title="Atenção Operacional"
      onClose={() => setIsContasModalOpen(false)}
    >
      <div className="space-y-6 pt-2">
        <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="bg-red-600 text-white p-3 rounded-xl shrink-0">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-950 uppercase tracking-wider">
              Pagamentos Pendentes
            </h3>
            <p className="text-sm font-semibold text-red-700 mt-1">
              O sistema identificou <b className="font-black text-red-900">{pendingContasCount} {pendingContasCount === 1 ? "conta" : "contas"}</b> vencendo no dia atual que ainda consta como "pendente".
            </p>
          </div>
        </div>

        <p className="text-base font-bold text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 p-4 rounded-xl">
          Atenção: Existem pagamentos pendentes para hoje. Efetue as baixas antes do encerramento do expediente bancário para evitar encargos.
        </p>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => setIsContasModalOpen(false)}
            className="w-full sm:w-auto font-bold uppercase tracking-wider"
          >
            Fechar Alerta
          </Button>
          <Button
            variant="primary"
            onClick={handleGoToFinance}
            icon={ArrowRight}
            className="w-full sm:w-auto font-bold uppercase tracking-wider shadow-lg bg-red-600 border-red-600 hover:bg-red-700"
          >
            Acessar Contas
          </Button>
        </div>
      </div>
    </Modal>
  );
};
