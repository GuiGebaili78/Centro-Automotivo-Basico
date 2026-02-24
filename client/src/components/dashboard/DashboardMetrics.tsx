import { CreditCard, Wallet, CheckCircle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IDashboardStats } from "../../types/dashboard.types";

interface StatCardProps {
  title: string;
  icon: any;
  onClick: () => void;
  color: {
    bg: string;
    text: string;
  };
  value?: string | number;
  subtext?: string;
  children?: React.ReactNode;
}

const StatCard = ({
  title,
  icon: Icon,
  onClick,
  color,
  value,
  subtext,
  children,
}: StatCardProps) => (
  <div
    onClick={onClick}
    className="bg-white p-2 rounded-xl shadow-sm border border-neutral-200 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 group h-20 w-full flex flex-col justify-center items-center"
  >
    <div className="flex items-center gap-1.5 mb-0.5">
      <div className={`p-1.5 rounded-lg ${color.bg} ${color.text}`}>
        <Icon size={16} />
      </div>
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest truncate">
        {title}
      </p>
    </div>

    <div className="mt-0 flex flex-col items-center text-center">
      {children ? (
        children
      ) : (
        <>
          <h3 className={`text-lg  text-neutral-800 leading-none`}>{value}</h3>
          {subtext && (
            <p className="text-xs text-neutral-400 uppercase mt-1">{subtext}</p>
          )}
        </>
      )}
    </div>
  </div>
);

interface DashboardMetricsProps {
  stats: IDashboardStats;
}

export const DashboardMetrics = ({ stats }: DashboardMetricsProps) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0 order-3 w-full">
      <StatCard
        title="Contas a Pagar"
        color={{
          bg: "bg-red-50",
          text: "text-red-600",
        }}
        icon={CreditCard}
        onClick={() => navigate("/financeiro/contas-pagar")}
      >
        <div className="flex justify-between items-center w-full px-1 gap-2">
          <div className="flex flex-col items-center">
            <h3 className="text-lg text-neutral-600">
              {stats.contasPagarPending}
            </h3>
            <p className="text-xs text-neutral-400 uppercase mt-0.5 font-medium">
              Pendente
            </p>
          </div>
          <div className="h-5 w-px bg-neutral-200"></div>
          <div className="flex flex-col items-center">
            <h3 className="text-lg text-red-600">{stats.contasPagarOverdue}</h3>
            <p className="text-xs text-neutral-400 uppercase mt-0.5 font-medium">
              Atrasada
            </p>
          </div>
        </div>
      </StatCard>
      <StatCard
        title="Mov. de Caixa"
        value={stats.livroCaixaEntries + stats.livroCaixaExits}
        color={{
          bg: "bg-neutral-100",
          text: "text-neutral-600",
        }}
        icon={Wallet}
        onClick={() => navigate("/financeiro/livro-caixa")}
        subtext={`Entrada: ${stats.livroCaixaEntries} | Saída: ${stats.livroCaixaExits}`}
      />
      <StatCard
        title="Auto Peças"
        value={stats.autoPecasPendentes}
        color={{
          bg: "bg-orange-50",
          text: "text-orange-600",
        }}
        icon={Package}
        onClick={() => navigate("/financeiro/pagamento-pecas")}
        subtext="A Pagar"
      />
      <StatCard
        title="Alerta Estoque"
        value={stats.alertaEstoque}
        color={{
          bg: "bg-red-100",
          text: "text-red-700",
        }}
        icon={Package}
        onClick={() => navigate("/pecas-estoque")}
        subtext="Peças em falta"
      />
      <StatCard
        title="Consolidação"
        value={stats.consolidacao}
        color={{
          bg: "bg-emerald-50",
          text: "text-emerald-600",
        }}
        icon={CheckCircle}
        onClick={() => navigate("/fechamento-financeiro")}
        subtext="Aguardando"
      />
    </div>
  );
};
