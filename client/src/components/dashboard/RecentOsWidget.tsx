import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { OsStatus } from "../../types/os.types";
import { OsTable } from "../shared/os/OsTable";
import type { FilterPeriod } from "../../types/dashboard.types";

interface RecentOsWidgetProps {
  recentOss: any[];
}

export const RecentOsWidget = ({ recentOss }: RecentOsWidgetProps) => {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("STATUS");

  const getFilteredRecentServices = () => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    let filtered = recentOss;

    if (filterPeriod !== "STATUS") {
      filtered = recentOss.filter((os) => {
        const dateRef = os.updated_at
          ? new Date(os.updated_at)
          : new Date(os.dt_abertura);
        if (filterPeriod === "HOJE") {
          if (os.status === "ABERTA") return true;
          return dateRef >= startOfToday;
        } else if (filterPeriod === "SEMANA") {
          const weekAgo = new Date(startOfToday);
          weekAgo.setDate(startOfToday.getDate() - 7);
          if (os.status === "ABERTA") return true;
          return dateRef >= weekAgo;
        } else {
          // MES
          const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (os.status === "ABERTA") return true;
          return dateRef >= firstDayMonth;
        }
      });
    }

    return filtered.sort((a, b) => {
      if (filterPeriod === "STATUS") {
        const priority: Record<string, number> = {
          [OsStatus.ABERTA]: 1,
          EM_ANDAMENTO: 1, // Legacy check
          [OsStatus.FINANCEIRO]: 2,
          "PRONTO PARA FINANCEIRO": 2, // Legacy check
          [OsStatus.FINALIZADA]: 3,
        };
        const pA = priority[a.status] || 99;
        const pB = priority[b.status] || 99;
        if (pA !== pB) return pA - pB;
      }
      const dateA = a.updated_at
        ? new Date(a.updated_at).getTime()
        : new Date(a.dt_abertura).getTime();
      const dateB = b.updated_at
        ? new Date(b.updated_at).getTime()
        : new Date(b.dt_abertura).getTime();
      return dateB - dateA;
    });
  };

  const filteredServices = getFilteredRecentServices();

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-2 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
        <h2 className="text-base font-bold text-neutral-600 tracking-tight flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          Atividade Recente (OS)
        </h2>

        <div className="flex bg-neutral-100 p-1 rounded-lg gap-1">
          {["HOJE", "SEMANA", "MES", "STATUS"].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={filterPeriod === p ? "primary" : "ghost"}
              className={`text-[10px] h-7 px-3 ${filterPeriod === p ? "shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              onClick={() => setFilterPeriod(p as any)}
            >
              {p === "MES" ? "Mês" : p}
            </Button>
          ))}
        </div>
      </div>

      <OsTable
        oss={filteredServices}
        isDashboard={true}
        onRowClick={(os) =>
          navigate(
            os.status === "PRONTO PARA FINANCEIRO"
              ? `/fechamento-financeiro?id_os=${os.id_os}`
              : `/ordem-de-servico?id=${os.id_os}`,
          )
        }
        emptyMessage="Nenhuma atualização neste período."
      />
    </Card>
  );
};
