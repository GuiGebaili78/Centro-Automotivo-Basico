import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { getStatusStyle } from "../utils/osUtils";
import { FinanceiroService } from "../services/financeiro.service";
import { OsService } from "../services/os.service";
import {
  ActionButton,
  Button,
  PageLayout,
  Card,
  ConfirmModal,
} from "../components/ui";
import { toast } from "react-toastify";
import { DocumentoModal } from "../components/ui/Modals/DocumentoModal";
import { UniversalFilters } from "../components/common/UniversalFilters";
import type { UniversalFiltersState } from "../components/common/UniversalFilters";
import { useUniversalFilter } from "../hooks/useUniversalFilter";
import { Trash2, Edit, CheckCircle, Printer } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { IOrdemDeServico, IFechamentoFinanceiro } from "../types/backend";

// Extended interface if IFechamentoFinanceiro in backend.d.ts doesn't have the relation yet
// or we leverage the one from backend.d.ts if it's sufficient.
// Based on previous analysis, IFechamentoFinanceiro in backend.d.ts lacks 'ordem_de_servico'.
// We will augment it locally for now or rely on the fact that the API returns it.
interface IFechamentoWithOS extends IFechamentoFinanceiro {
  ordem_de_servico: IOrdemDeServico;
}

export const FechamentoFinanceiroPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [fechamentos, setFechamentos] = useState<IFechamentoWithOS[]>([]);
  const [pendingOss, setPendingOss] = useState<IOrdemDeServico[]>([]);
  const [universalFilters, setUniversalFilters] = useState<UniversalFiltersState>({
    search: "", osId: "", status: "ALL", operadora: "", fornecedor: "",
    startDate: "", endDate: "", activePeriod: "ALL",
  });


  // Confirm Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Document Modal (Print)
  const [printData, setPrintData] = useState<{
    id_os: number;
    status: string;
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
  } | null>(null);


  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle deep-link redirect via URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlIdOs = params.get("id_os");
    if (urlIdOs) {
      handleOpenFechamento(Number(urlIdOs));
    }
  }, [location.search]);

  const loadData = async () => {
    try {
      const [fechamentosData, allOss] = await Promise.all([
        FinanceiroService.getFechamentos(),
        OsService.getAll(),
      ]);

      setFechamentos(fechamentosData);

      // Filter OSs pending closure
      const pending = allOss.filter(
        (os) =>
          [
            "ABERTA",
            "EM_ANDAMENTO",
            "PRONTO PARA FINANCEIRO",
            "FINALIZADA",
          ].includes(os.status) &&
          !fechamentosData.some(
            (f: IFechamentoFinanceiro) => f.id_os === os.id_os,
          ),
      );
      setPendingOss(pending);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
      toast.error("Erro ao carregar dados financeiros");
    }
  };

  const handleOpenFechamento = (id_os: number) => {
    navigate(`/fechamento-financeiro/${id_os}`);
  };

  const handleEditFechamento = (fechamento: IFechamentoFinanceiro) => {
    navigate(`/fechamento-financeiro/${fechamento.id_os}`);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await FinanceiroService.deleteFechamento(confirmDeleteId);
      toast.success("Fechamento cancelado com sucesso!");
      loadData();
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error("Erro ao deletar fechamento");
    }
  };

  const handlePrint = (os: IOrdemDeServico) => {
    setPrintData({
      id_os: os.id_os,
      status: os.status,
      clienteNome: getClientName(os),
      clienteEmail: os.cliente?.email || "",
      clienteTelefone: os.cliente?.telefone_1 || "",
    });
  };

  const getClientName = (os: IOrdemDeServico | undefined) => {
    if (!os) return "Cliente N/I";
    return (
      os.cliente?.pessoa_fisica?.pessoa?.nome ||
      os.cliente?.pessoa_juridica?.nome_fantasia ||
      os.cliente?.pessoa_juridica?.razao_social ||
      "Cliente N/I"
    );
  };

  // Filtered via hook
  const filteredFechamentos = useUniversalFilter(fechamentos, universalFilters, {
    dateField: "data_fechamento_financeiro",
    osIdField: "id_os",
  }).sort((a, b) => b.id_fechamento_financeiro - a.id_fechamento_financeiro);


  return (
    <PageLayout
      title="Consolidação"
      subtitle="Consolidação de custos e serviços."
    >
      {/* PENDING OS LIST */}
      <h2 className="text-xl font-bold text-neutral-600 flex items-center gap-2 mb-4">
        <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
        Aguardando Consolidação
      </h2>
      <Card className="p-0 overflow-hidden mb-8">
        {pendingOss.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 italic font-medium">
            Nenhum fechamento pendente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela-limpa w-full">
              <thead>
                <tr>
                  <th>OS / Data</th>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th className="w-1/4">Defeito / Diagnóstico</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pendingOss.map((os) => (
                  <tr
                    key={os.id_os}
                    className="hover:bg-neutral-50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-bold text-neutral-600">
                        OS | {os.id_os}
                      </div>
                      {/* Show both Date and Time if available */}
                      {os.dt_abertura && (
                        <div className="flex flex-col mt-1">
                          <span className="text-sm font-bold text-neutral-500">
                            {new Date(os.dt_abertura).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <span className="text-sm text-neutral-400">
                            {new Date(os.dt_abertura).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-neutral-700 text-sm truncate max-w-[150px]">
                        {getClientName(os)}
                      </div>
                      <div className="text-sm text-neutral-400 font-medium">
                        {os.cliente?.telefone_1 || "Sem telefone"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-700 tracking-tight text-sm uppercase">
                          {os.veiculo?.marca} {os.veiculo?.modelo} -{" "}
                          {os.veiculo?.cor}
                        </span>
                        <span className="text-sm text-primary-500 font-bold uppercase">
                          {os.veiculo?.placa || "Placa N/I"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 max-w-xs transition-opacity opacity-80 group-hover:opacity-100">
                        <div className="leading-tight">
                          <span className="text-sm font-bold text-neutral-600 uppercase block">
                            Defeito
                          </span>
                          <span
                            className="text-xs text-primary-500 font-medium line-clamp-2"
                            title={os.defeito_relatado || ""}
                          >
                            {os.defeito_relatado || "-"}
                          </span>
                        </div>
                        <div className="leading-tight">
                          <span className="text-sm font-bold text-neutral-600 uppercase block">
                            Diagnóstico
                          </span>
                          <span
                            className="text-xs text-primary-500 font-medium line-clamp-2"
                            title={os.diagnostico || ""}
                          >
                            {os.diagnostico || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-md text-sm font-bold uppercase whitespace-nowrap ${getStatusStyle(
                          os.status,
                        )}`}
                      >
                        {os.status === "PRONTO PARA FINANCEIRO"
                          ? "FINANCEIRO"
                          : os.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleOpenFechamento(os.id_os)}
                          variant="primary"
                          size="sm"
                          icon={CheckCircle}
                        >
                          Fechar Financeiro
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* HISTORY LIST */}
      <h2 className="text-xl font-bold text-neutral-600 flex items-center gap-2 mb-4">
        <span className="w-2 h-8 bg-green-600 rounded-full"></span>
        Histórico de Fechamentos
      </h2>

      {/* Filters */}
      <UniversalFilters
        onFilterChange={setUniversalFilters}
        config={{
          enableFornecedor: false,
          enableOperadora: false,
          enableOsId: true,
          enableStatus: false,
        }}
      />

      <Card className="p-0 overflow-hidden min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="tabela-limpa w-full">
            <thead>
              <tr>
                <th>OS</th>
                <th>Cliente</th>
                <th>Veículo (Placa/Cor)</th>
                <th>Valor Serviço</th>
                <th>Mão de Obra (Execução)</th>
                <th>Data</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFechamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-4">
                      <p className="font-bold text-neutral-400 mb-2">
                        {universalFilters.search || universalFilters.startDate
                          ? "Nenhum registro encontrado para a busca."
                          : "Nenhum fechamento realizado ainda."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFechamentos.map((fech) => (
                  <tr
                    key={fech.id_fechamento_financeiro}
                    className="hover:bg-neutral-50 transition-colors group"
                  >
                    <td className="p-4">
                      <span className="font-bold text-neutral-600 px-2 py-1 rounded text-sm">
                        OS | {fech.id_os}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-neutral-700 text-sm truncate max-w-[150px]">
                        {getClientName(fech.ordem_de_servico)}
                      </div>
                      <div className="text-sm text-neutral-400 font-medium">
                        {fech.ordem_de_servico?.cliente?.telefone_1 ||
                          "Sem telefone"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-700 tracking-tight text-sm uppercase">
                          {fech.ordem_de_servico?.veiculo?.marca}{" "}
                          {fech.ordem_de_servico?.veiculo?.modelo} -{" "}
                          {fech.ordem_de_servico?.veiculo?.cor}
                        </span>
                        <span className="text-sm text-primary-500 font-bold uppercase">
                          {fech.ordem_de_servico?.veiculo?.placa || "Placa N/I"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-primary-600 font-bold bg-primary-50 w-fit px-3 py-1 rounded-lg">
                        {formatCurrency(
                          Number(
                            fech.ordem_de_servico?.valor_total_cliente || 0,
                          ),
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {fech.ordem_de_servico?.servicos_mao_de_obra &&
                        fech.ordem_de_servico.servicos_mao_de_obra.length >
                          0 ? (
                          Array.from(
                            new Set(
                              fech.ordem_de_servico.servicos_mao_de_obra
                                .map(
                                  (svc) =>
                                    svc.funcionario?.pessoa_fisica?.pessoa?.nome?.split(
                                      " ",
                                    )[0],
                                )
                                .filter(Boolean),
                            ),
                          ).map((name, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-400 italic">
                            Não informado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-neutral-500">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-600">
                          {new Date(
                            fech.data_fechamento_financeiro,
                          ).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-sm text-neutral-400">
                          {new Date(
                            fech.data_fechamento_financeiro,
                          ).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          onClick={() => handlePrint(fech.ordem_de_servico)}
                          icon={Printer}
                          label="Imprimir"
                          variant="neutral"
                        />
                        <ActionButton
                          onClick={() => handleEditFechamento(fech)}
                          icon={Edit}
                          label="Editar"
                          variant="primary"
                        />
                        <ActionButton
                          onClick={() =>
                            setConfirmDeleteId(fech.id_fechamento_financeiro)
                          }
                          icon={Trash2}
                          label="Cancelar"
                          variant="danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Cancelar Fechamento"
        description="Tem certeza que deseja cancelar este fechamento financeiro? Isso não apaga a OS, apenas a consolidação."
        variant="danger"
      />

      {/* Document Print Modal */}
      {printData && (
        <DocumentoModal
          isOpen={true}
          onClose={() => setPrintData(null)}
          osId={printData.id_os}
          status={printData.status}
          clienteNome={printData.clienteNome}
          clienteEmail={printData.clienteEmail}
          clienteTelefone={printData.clienteTelefone}
        />
      )}
    </PageLayout>
  );
};
