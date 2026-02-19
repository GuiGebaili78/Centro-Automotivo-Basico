import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Wrench } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { OsStatus } from "../../types/os.types";
import { getStatusStyle } from "../../utils/osUtils";
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

  const getFilterButtonClass = (isActive: boolean) =>
    `px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
      isActive
        ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
        : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
        <h2 className="text-sm font-bold text-neutral-700 tracking-tight flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          Atividade Recente (OS)
        </h2>

        {/* Date Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-lg">
          {["HOJE", "SEMANA", "MES", "STATUS"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPeriod(p as any)}
              className={getFilterButtonClass(filterPeriod === p)}
            >
              {p === "MES" ? "Mês" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tabela-limpa w-full">
          <thead>
            <tr>
              <th className="w-[15%]">Data / OS</th>
              <th className="w-[20%]">Veículo</th>
              <th className="w-[25%]">Diagnóstico / Defeito</th>
              <th className="w-[15%]">Colaborador</th>
              <th className="w-[15%]">Cliente</th>
              <th className="w-[10%] text-center">Status</th>
              <th className="w-[10%] text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filteredServices.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-12 text-center text-neutral-400 font-medium italic"
                >
                  Nenhuma atualização neste período.
                </td>
              </tr>
            ) : (
              filteredServices.map((os: any) => (
                <tr
                  key={os.id_os}
                  onClick={() =>
                    navigate(
                      os.status === "PRONTO PARA FINANCEIRO"
                        ? `/fechamento-financeiro?id_os=${os.id_os}`
                        : `/ordem-de-servico?id=${os.id_os}`,
                    )
                  }
                  className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-neutral-700 bg-neutral-100 px-1.5 rounded w-fit mb-1">
                        #{os.id_os}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-600">
                          {new Date(os.dt_abertura).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {new Date(os.dt_abertura).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-800 text-xs uppercase">
                        {os.veiculo?.modelo || "Modelo N/I"}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase mt-0.5">
                        {os.veiculo?.placa || "---"}
                      </span>
                      {os.veiculo?.cor && (
                        <span className="text-[9px] text-neutral-400">
                          {os.veiculo.cor}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-medium text-neutral-600 line-clamp-2 leading-relaxed">
                      {os.diagnostico || os.defeito_relatado || (
                        <span className="text-neutral-300 italic">---</span>
                      )}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const mechanics = os.servicos_mao_de_obra
                          ?.map(
                            (s: any) =>
                              s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(
                                " ",
                              )[0],
                          )
                          .filter(Boolean);
                        const uniqueMechanics = [...new Set(mechanics || [])];
                        if (uniqueMechanics.length > 0)
                          return uniqueMechanics.map((mech: any, i: number) => (
                            <span
                              key={i}
                              className="text-[9px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded uppercase"
                            >
                              {mech}
                            </span>
                          ));
                        return (
                          <span className="text-neutral-300 text-xs">---</span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-700 text-xs truncate max-w-[120px]">
                        {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                          os.cliente?.pessoa_juridica?.razao_social ||
                          "Desconhecido"}
                      </span>
                      {os.cliente?.telefone_1 && (
                        <span className="text-[10px] text-neutral-400">
                          {os.cliente.telefone_1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap ring-1 ${getStatusStyle(
                        os.status,
                      )}`}
                    >
                      {os.status === "PRONTO PARA FINANCEIRO"
                        ? "FINANCEIRO"
                        : os.status === "ORCAMENTO"
                          ? "AGENDAMENTO"
                          : os.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          os.status === "PRONTO PARA FINANCEIRO"
                            ? `/fechamento-financeiro?id_os=${os.id_os}`
                            : `/ordem-de-servico?id=${os.id_os}`,
                        );
                      }}
                      variant="secondary"
                      size="sm"
                      icon={Wrench}
                    >
                      Gerenciar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
