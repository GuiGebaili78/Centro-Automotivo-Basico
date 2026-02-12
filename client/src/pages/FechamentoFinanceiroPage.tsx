import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import { DocumentoModal } from "../components/ui/DocumentoModal";

import { Search, Trash2, Edit, CheckCircle, Printer } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface IOS {
  id_os: number;
  status: string;
  dt_abertura: string; // Ensure this exists in backend type, otherwise maybe use created_at or verify
  valor_total_cliente: number;
  cliente: {
    pessoa_fisica?: { pessoa: { nome: string } };
    pessoa_juridica?: { nome_fantasia: string; razao_social: string };
    telefone_1?: string;
    email?: string;
  };
  veiculo: {
    placa: string;
    marca?: string;
    modelo: string;
    cor: string;
  };
  fechamento_financeiro?: IFechamentoFinanceiro;
  servicos_mao_de_obra?: {
    funcionario: {
      pessoa_fisica: {
        pessoa: {
          nome: string;
        };
      };
    };
  }[];
  defeito_relatado?: string;
  diagnostico?: string;
  obs_final?: string;
}

interface IFechamentoFinanceiro {
  id_fechamento_financeiro: number;
  id_os: number;
  custo_total_pecas_real: number;
  data_fechamento_financeiro: string;
  ordem_de_servico: IOS;
}

export const FechamentoFinanceiroPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [fechamentos, setFechamentos] = useState<IFechamentoFinanceiro[]>([]);
  const [pendingOss, setPendingOss] = useState<IOS[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Date Filters
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "CUSTOM"
  >("WEEK");

  const [filterStart, setFilterStart] = useState(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return weekAgo.toLocaleDateString("en-CA");
  });

  const [filterEnd, setFilterEnd] = useState(() => {
    return new Date().toLocaleDateString("en-CA");
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlIdOs = params.get("id_os");
    if (urlIdOs) {
      handleOpenFechamento(Number(urlIdOs));
    }
  }, [location.search]);

  const loadData = async () => {
    try {
      const [fechamentosRes, osRes] = await Promise.all([
        api.get("/fechamento-financeiro"),
        api.get("/ordem-de-servico"),
      ]);

      setFechamentos(fechamentosRes.data);

      const allOss = osRes.data;
      // Filter OSs: Em Andamento, Aberta, Pronto Para Financeiro (and Finalizada if pending logic applies, usually Finalizada has fechamento)
      // But if Finalizada DOES NOT have Fechamento, we show it too.
      const pending = allOss.filter(
        (os: IOS) =>
          [
            "ABERTA",
            "EM_ANDAMENTO",
            "PRONTO PARA FINANCEIRO",
            "FINALIZADA",
          ].includes(os.status) &&
          !os.fechamento_financeiro &&
          !fechamentosRes.data.some(
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
      await api.delete(`/fechamento-financeiro/${confirmDeleteId}`);
      toast.success("Fechamento cancelado com sucesso!");
      loadData();
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error("Erro ao deletar fechamento");
    }
  };

  const handlePrint = (os: IOS) => {
    setPrintData({
      id_os: os.id_os,
      status: os.status,
      clienteNome: getClientName(os),
      clienteEmail: os.cliente?.email || "",
      clienteTelefone: os.cliente?.telefone_1 || "",
    });
  };

  const getClientName = (os: IOS) => {
    return (
      os.cliente?.pessoa_fisica?.pessoa?.nome ||
      os.cliente?.pessoa_juridica?.nome_fantasia ||
      os.cliente?.pessoa_juridica?.razao_social ||
      "Cliente N/I"
    );
  };

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    setActiveFilter(type);
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    if (type === "TODAY") {
      setFilterStart(todayStr);
      setFilterEnd(todayStr);
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setFilterStart(weekAgo.toLocaleDateString("en-CA"));
      setFilterEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterStart(firstDay.toLocaleDateString("en-CA"));
      setFilterEnd(todayStr);
    }
  };

  const filteredFechamentos = fechamentos
    .filter((f) => {
      if (filterStart) {
        const recordDate = new Date(f.data_fechamento_financeiro);
        const recordDateLocal = recordDate.toLocaleDateString("en-CA");
        if (recordDateLocal < filterStart) return false;
      }
      if (filterEnd) {
        const recordDate = new Date(f.data_fechamento_financeiro);
        const recordDateLocal = recordDate.toLocaleDateString("en-CA");
        if (recordDateLocal > filterEnd) return false;
      }

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();

      const id = String(f.id_fechamento_financeiro);
      const fullId = `#${id}`;
      const osId = String(f.id_os);
      const fullOsId = `#${osId}`;
      const plate = f.ordem_de_servico?.veiculo?.placa?.toLowerCase() || "";
      const model = f.ordem_de_servico?.veiculo?.modelo?.toLowerCase() || "";
      const color = f.ordem_de_servico?.veiculo?.cor?.toLowerCase() || "";

      return [id, fullId, osId, fullOsId, plate, model, color]
        .join(" ")
        .includes(q);
    })
    .sort((a, b) => b.id_fechamento_financeiro - a.id_fechamento_financeiro);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "FINALIZADA":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
      case "PAGA_CLIENTE":
        return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
      case "PRONTO PARA FINANCEIRO":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
      case "ABERTA":
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
      case "EM_ANDAMENTO":
        return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
      default:
        return "bg-gray-50 text-gray-500 ring-1 ring-gray-200";
    }
  };

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
                        #{os.id_os}
                      </div>
                      {/* Show both Date and Time if available */}
                      {os.dt_abertura && (
                        <div className="flex flex-col mt-1">
                          <span className="text-[10px] font-bold text-neutral-500">
                            {new Date(os.dt_abertura).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <span className="text-[10px] text-neutral-400">
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
                      <div className="text-[12px] text-neutral-400 font-medium">
                        {os.cliente?.telefone_1 || "Sem telefone"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-700 tracking-tight text-sm uppercase">
                          {os.veiculo?.marca} {os.veiculo?.modelo} -{" "}
                          {os.veiculo?.cor}
                        </span>
                        <span className="text-[14px] text-primary-500 font-bold uppercase">
                          {os.veiculo?.placa || "Placa N/I"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 max-w-xs transition-opacity opacity-80 group-hover:opacity-100">
                        <div className="leading-tight">
                          <span className="text-[10px] font-bold text-neutral-600 uppercase block">
                            Defeito
                          </span>
                          <span
                            className="text-xs text-primary-500 font-medium line-clamp-2"
                            title={os.defeito_relatado}
                          >
                            {os.defeito_relatado || "-"}
                          </span>
                        </div>
                        <div className="leading-tight">
                          <span className="text-[10px] font-bold text-neutral-600 uppercase block">
                            Diagnóstico
                          </span>
                          <span
                            className="text-xs text-primary-500 font-medium line-clamp-2"
                            title={os.diagnostico}
                          >
                            {os.diagnostico || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${getStatusStyle(os.status)}`}
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

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="w-full md:flex-1 relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID ou Placa..."
            icon={Search}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {/* Quick Filters Group */}
          <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => applyQuickFilter("TODAY")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "TODAY"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => applyQuickFilter("WEEK")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "WEEK"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => applyQuickFilter("MONTH")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === "MONTH"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-black/5"
              }`}
            >
              Mês
            </button>
          </div>

          {/* Manual Date Inputs */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={filterStart}
              onChange={(e) => {
                setFilterStart(e.target.value);
                setActiveFilter("CUSTOM");
              }}
              className={`h-10 px-3 rounded-lg border text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors ${
                activeFilter === "CUSTOM"
                  ? "border-primary-300 text-primary-700"
                  : "border-neutral-200 text-neutral-600"
              }`}
            />
            <span className="text-neutral-400 self-center">-</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => {
                setFilterEnd(e.target.value);
                setActiveFilter("CUSTOM");
              }}
              className={`h-10 px-3 rounded-lg border text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors ${
                activeFilter === "CUSTOM"
                  ? "border-primary-300 text-primary-700"
                  : "border-neutral-200 text-neutral-600"
              }`}
            />
          </div>
        </div>
      </div>

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
                        {searchTerm || filterStart
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
                        #{fech.id_os}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-neutral-700 text-sm truncate max-w-[150px]">
                        {getClientName(fech.ordem_de_servico)}
                      </div>
                      <div className="text-[12px] text-neutral-400 font-medium">
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
                        <span className="text-[14px] text-primary-500 font-bold uppercase">
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
                        <span className="text-[10px] font-bold text-neutral-600">
                          {new Date(
                            fech.data_fechamento_financeiro,
                          ).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-[10px] text-neutral-400">
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
