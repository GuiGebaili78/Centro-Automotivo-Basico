import { DollarSign, CheckCircle, BadgeCheck } from "lucide-react";
import { Button } from "../../ui/Button";
import { formatCurrency } from "../../../utils/formatCurrency"; // Adjust path if needed

interface OsTotalsSectionProps {
  totalParts: number;
  totalLabor: number;
  totalGeneral: number;
  payments: any[];
  osStatus: string;
  onManagePayments: () => void;
  onFinish: () => void;
  onReopen: () => void;
}

export const OsTotalsSection = ({
  totalParts,
  totalLabor,
  totalGeneral,
  payments,
  osStatus,
  onManagePayments,
  onFinish,
  onReopen,
}: OsTotalsSectionProps) => {
  const totalPaid = payments
    .filter((p) => !p.deleted_at)
    .reduce((acc, p) => acc + Number(p.valor), 0);

  const isPaid = totalGeneral - totalPaid <= 0.05;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-600 shadow-2xl">
      {/* Background Glow Effect */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative p-8 text-neutral-25 space-y-8">
        {/* Totals Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-neutral-600">
          <div className="flex gap-12">
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                Peças
              </p>
              <p className="font-medium text-lg text-neutral-300">
                {formatCurrency(totalParts)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                Mão de Obra
              </p>
              <p className="font-medium text-lg text-neutral-300">
                {formatCurrency(totalLabor)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-success-500 uppercase tracking-widest mb-1">
              VALOR TOTAL
            </p>
            <p className="font-bold text-5xl tracking-tighter text-white drop-shadow-2xl">
              {formatCurrency(totalGeneral)}
            </p>
          </div>
        </div>

        {/* Footer Actions Row */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          {/* Payment Card */}
          <div className="w-full lg:w-auto flex-1 max-w-2xl bg-yellow-600/60 rounded-2xl p-2 pr-4 flex items-center justify-between border border-neutral-700/50 hover:bg-yellow-600/80 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="bg-green-400/20 border border-neutral-600 p-3 rounded-xl shadow-lg">
                <DollarSign
                  className="text-success-500"
                  size={24}
                  strokeWidth={2.5}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Pagamentos Recebidos
                  </p>
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider shadow-lg ${
                      isPaid
                        ? "bg-emerald-500 text-white shadow-emerald-500/40"
                        : "bg-red-500 text-white shadow-red-500/40 animate-pulse"
                    }`}
                  >
                    {isPaid ? "QUITADO" : "PENDENTE"}
                  </span>
                </div>
                <p className="font-bold text-2xl text-neutral-25 tracking-tight">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={onManagePayments}
              size="sm"
              className="bg-neutral-700 text-neutral-200 border-none hover:bg-neutral-600 font-bold uppercase text-xs h-9 px-4 ml-4"
            >
              Gerenciar
            </Button>
          </div>

          <div className="flex gap-4 w-full lg:w-auto justify-end">
            {["ABERTA", "EM_ANDAMENTO"].includes(osStatus) ? (
              <Button
                onClick={onFinish}
                variant="success"
                className="w-full lg:w-auto px-8 py-5 h-auto text-lg font-bold uppercase tracking-widest shadow-xl shadow-success-500/20 hover:scale-105 transition-all flex-1 lg:flex-none justify-center"
              >
                <CheckCircle className="mr-3" size={24} strokeWidth={3} />{" "}
                FINALIZAR OS
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {(osStatus === "PRONTO PARA FINANCEIRO" ||
                  osStatus === "FINALIZADA") && (
                  <Button
                    variant="secondary"
                    onClick={onReopen}
                    className="bg-transparent border-2 border-dashed border-neutral-600 text-neutral-500 hover:text-neutral-25 hover:bg-neutral-600 hover:border-neutral-500 px-6 py-4 h-auto w-full sm:w-auto font-bold uppercase transition-all"
                  >
                    REABRIR OS
                  </Button>
                )}
                <div className="flex items-center justify-center gap-3 text-success-400 font-bold bg-success-500/10 px-8 py-4 rounded-xl border border-success-500/20 w-full sm:w-auto">
                  <BadgeCheck size={28} />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-success-600/70 uppercase leading-none">
                      Status Atual
                    </span>
                    <span className="text-lg leading-none mt-1">
                      {osStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
