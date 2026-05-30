import { Modal, Button } from "../index";
import { useAlerts } from "../../../contexts/AlertsContext";
import { AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const EncerramentoTurnoModal = () => {
  const {
    isClosingModalOpen,
    setIsClosingModalOpen,
    pendingContasCount,
    pendingRecebiveisCount,
    isLoading
  } = useAlerts();
  const navigate = useNavigate();

  if (!isClosingModalOpen) return null;

  const hasPendencies = pendingContasCount > 0 || pendingRecebiveisCount > 0;

  const handleGoToContas = () => {
    setIsClosingModalOpen(false);
    navigate("/financeiro/contas-pagar");
  };

  const handleGoToRecebiveis = () => {
    setIsClosingModalOpen(false);
    navigate("/recebiveis");
  };

  return (
    <Modal
      title="Resumo de Fechamento de Turno"
      onClose={() => setIsClosingModalOpen(false)}
    >
      <div className="space-y-6 pt-2">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 font-bold">
            Verificando pendências financeiras de hoje...
          </div>
        ) : hasPendencies ? (
          // --- ESTADO CRÍTICO (Pendente) ---
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="bg-red-600 text-white p-3 rounded-xl shrink-0">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-950 uppercase tracking-wider">
                  Contas Pendentes Detectadas!
                </h3>
                <p className="text-sm font-semibold text-red-700 mt-1">
                  Existem movimentações de hoje pendentes de baixa no sistema.
                </p>
              </div>
            </div>

            {/* Critical Alert Message */}
            <p className="text-base font-black text-red-600 border-l-4 border-red-600 bg-red-50/50 p-4 rounded-r-xl leading-relaxed">
              Atenção Operacional: O sistema identificou contas de hoje que ainda não foram pagas. Verifique o módulo financeiro antes de encerrar suas atividades.
            </p>

            {/* Pendencies Summary list */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                Detalhamento do Dia
              </h4>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-sm font-bold text-slate-700">Contas a Pagar Pendentes:</span>
                <span className={`text-sm font-black px-2.5 py-1 rounded-full ${pendingContasCount > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {pendingContasCount} {pendingContasCount === 1 ? "conta" : "contas"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-slate-700">Recebíveis Pendentes (Cartões):</span>
                <span className={`text-sm font-black px-2.5 py-1 rounded-full ${pendingRecebiveisCount > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {pendingRecebiveisCount} {pendingRecebiveisCount === 1 ? "parcela" : "parcelas"}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={handleGoToContas}
                icon={ArrowRight}
                disabled={pendingContasCount === 0}
                className="w-full font-bold uppercase tracking-wider justify-center"
              >
                Pagar Contas
              </Button>
              <Button
                variant="outline"
                onClick={handleGoToRecebiveis}
                icon={ArrowRight}
                disabled={pendingRecebiveisCount === 0}
                className="w-full font-bold uppercase tracking-wider justify-center"
              >
                Conciliar Recebíveis
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsClosingModalOpen(false)}
                className="w-full sm:w-auto font-bold uppercase tracking-wider"
              >
                Fechar Alerta
              </Button>
            </div>
          </div>
        ) : (
          // --- ESTADO DE SUCESSO (Tudo em dia!) ---
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">
              Tudo Organizado!
            </h3>
            <p className="text-base font-bold text-emerald-600 px-4">
              Tudo em dia! Nenhuma conta ou recebível pendente para hoje. Bom descanso!
            </p>
            <div className="flex justify-center pt-4 border-t border-slate-100">
              <Button
                variant="primary"
                onClick={() => setIsClosingModalOpen(false)}
                className="w-full sm:w-auto font-bold uppercase tracking-wider bg-emerald-600 border-emerald-600 hover:bg-emerald-700"
              >
                Bom descanso!
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
