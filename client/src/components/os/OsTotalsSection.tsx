import { DollarSign, CheckCircle, BadgeCheck } from "lucide-react";
import { Button } from "../ui";
import { formatCurrency } from "../../utils/formatCurrency";

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
    <div className="relative overflow-hidden rounded-3xl bg-primary-600 shadow-2xl">
      {/* Background Glow Effect */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative p-8 text-white space-y-8">
        {/* Totals Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-white/20">
          <div className="flex gap-12">
            <div>
              <p className="text-sm font-medium text-primary-100 uppercase tracking-widest mb-1">
                Peças
              </p>
              <p className="font-bold text-2xl text-white">
                {formatCurrency(totalParts)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary-100 uppercase tracking-widest mb-1">
                Mão de Obra
              </p>
              <p className="font-bold text-2xl text-white">
                {formatCurrency(totalLabor)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white uppercase tracking-widest opacity-90 mb-1">
              VALOR TOTAL DA OS
            </p>
            <p className="font-bold text-5xl tracking-tighter text-white drop-shadow-md">
              {formatCurrency(totalGeneral)}
            </p>
          </div>
        </div>

        {/* Footer Actions Row */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          {/* Payment Card */}
          <div className="w-full lg:w-auto flex-1 max-w-2xl bg-white/10 rounded-2xl p-3 pr-4 flex items-center justify-between border border-white/20 hover:bg-white/20 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 border border-white/30 p-3 rounded-xl shadow-lg">
                <DollarSign
                  className="text-white"
                  size={24}
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-sm font-medium text-primary-100 uppercase tracking-wider">
                    Pagamentos Recebidos
                  </p>
                  <span
                    className={`px-4 py-2 rounded text-[11px] font-black uppercase tracking-wider shadow-lg ${
                      isPaid
                        ? "bg-emerald-500 text-white shadow-emerald-500/40"
                        : "bg-red-500 text-white shadow-red-500/40 animate-pulse"
                    }`}
                  >
                    {isPaid ? "QUITADO" : "PENDENTE"}
                  </span>
                </div>
                <p className="font-black text-3xl text-white tracking-tight">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onManagePayments}
              className="bg-white text-primary-600 hover:bg-neutral-50 font-bold uppercase text-sm h-11 px-6 ml-4 shadow-xl active:scale-95 transition-all"
            >
              Gerenciar
            </Button>
          </div>

          <div className="flex gap-4 w-full lg:w-auto justify-end">
            {["ABERTA", "EM_ANDAMENTO"].includes(osStatus) ? (
              <Button
                onClick={onFinish}
                variant="success"
                className="w-full lg:w-auto px-8 py-5 h-auto text-lg font-bold uppercase tracking-widest shadow-xl bg-emerald-500 border-none hover:bg-emerald-400 text-white flex-1 lg:flex-none justify-center"
              >
                <CheckCircle className="mr-3" size={24} strokeWidth={2} />{" "}
                FINALIZAR OS
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {(osStatus === "PRONTO PARA FINANCEIRO" ||
                  osStatus === "FINALIZADA") && (
                  <Button
                    variant="secondary"
                    onClick={onReopen}
                    className="bg-transparent border-2 border-dashed border-white/40 text-white hover:bg-white/10 hover:border-white px-6 py-4 h-auto w-full sm:w-auto font-bold uppercase transition-all"
                  >
                    REABRIR OS
                  </Button>
                )}
                <div className="flex items-center justify-center gap-3 text-white font-bold bg-white/10 px-8 py-4 rounded-xl border border-white/20 w-full sm:w-auto">
                  <BadgeCheck size={32} />
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-primary-100 font-medium uppercase leading-none">
                      Status Atual
                    </span>
                    <span className="text-xl leading-none mt-1 uppercase font-black">
                      {osStatus.replace(/_/g, " ")}
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
