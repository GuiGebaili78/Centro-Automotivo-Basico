import { Phone, Wrench } from "lucide-react";
import { getStatusStyle } from "../../../utils/osUtils";
import { formatPhone } from "../../../utils/normalize";
import { ActionButton } from "../../ui/ActionButton";
import type { IOrdemDeServico } from "../../../types/backend";

interface OsTableProps {
  oss: IOrdemDeServico[];
  onRowClick: (os: IOrdemDeServico) => void;
  renderActions?: (os: IOrdemDeServico) => React.ReactNode;
  emptyMessage?: string;
}

export const OsTable = ({
  oss,
  onRowClick,
  renderActions,
  emptyMessage = "Nenhum registro encontrado.",
}: OsTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="tabela-limpa w-full">
        <thead>
          <tr>
            <th className="w-[15%]">OS / Data</th>
            <th className="w-[20%]">Veículo</th>
            <th className="w-[25%]">Diagnóstico / Ações</th>
            <th className="w-[15%]">Técnico</th>
            <th className="w-[15%]">Cliente</th>
            <th className="w-[10%] text-center">Status</th>
            <th className="w-[10%] text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {oss.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="p-12 text-center text-neutral-400 font-medium italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            oss.map((os) => (
              <tr
                key={os.id_os}
                onClick={() => onRowClick(os)}
                className="hover:bg-neutral-50 cursor-pointer transition-colors group"
              >
                <td className="p-4">
                  <div className="flex flex-col items-start">
                    <div className="text-base font-bold text-neutral-600">
                      OS | {os.id_os}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-neutral-600 font-medium">
                        {new Date(os.dt_abertura).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-neutral-600 font-medium">
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
                    <span className="text-neutral-600 text-base font-medium uppercase">
                      {os.veiculo?.marca} {os.veiculo?.modelo} •{" "}
                      {os.veiculo?.cor}
                    </span>
                    <span className="text-base text-primary-600 uppercase mt-0.5">
                      {os.veiculo?.placa || "---"} -{" "}
                      {os.veiculo?.ano_modelo || "---"}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <p className="text-base font-medium text-neutral-600 line-clamp-2 uppercase leading-relaxed">
                      {os.diagnostico || os.defeito_relatado || (
                        <span className="text-neutral-300 italic">---</span>
                      )}
                    </p>
                    <div className="h-4"></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
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
                              className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed"
                            >
                              {mech}
                            </span>
                          ));
                        return (
                          <span className="text-neutral-300 text-xs">---</span>
                        );
                      })()}
                    </div>
                    <div className="h-4"></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed">
                      {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                        os.cliente?.pessoa_juridica?.razao_social ||
                        "Desconhecido"}
                    </span>
                    {os.cliente?.telefone_1 && (
                      <span className="text-sm text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
                        <Phone size={12} className="text-neutral-400" />
                        {formatPhone(os.cliente.telefone_1)}
                      </span>
                    )}
                    <div className="h-4"></div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-black uppercase whitespace-nowrap ring-1 ${getStatusStyle(
                      os.status,
                    )}`}
                  >
                    {os.status === "PRONTO PARA FINANCEIRO"
                      ? "FINANCEIRO"
                      : os.status === "ORCAMENTO"
                        ? "AGENDAMENTO"
                        : (os.status as string).replace(/_/g, " ")}
                  </span>
                </td>
                <td
                  className="p-4 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderActions ? (
                    renderActions(os)
                  ) : (
                    <ActionButton
                      onClick={() => onRowClick(os)}
                      variant="primary"
                      icon={Wrench}
                      label="Gerenciar"
                    />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
