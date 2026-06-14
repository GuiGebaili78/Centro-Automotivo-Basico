import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { formatPhone } from "../utils/normalize";
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
import { Trash2, Edit, CheckCircle, Printer, Wrench } from "lucide-react";
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
    veiculoMarca?: string;
    veiculoModelo?: string;
    veiculoCor?: string;
    veiculoPlaca?: string;
    equipamentoPeca?: string | null;
    equipamentoFabricante?: string | null;
    equipamentoNumeracao?: string | null;
  } | null>(null);

  // Handle deep-link redirect via URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlIdOs = params.get("id_os");
    if (urlIdOs) {
      handleOpenFechamento(Number(urlIdOs));
    }
  }, [location.search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadData(universalFilters.search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [universalFilters.search]);

  const loadData = async (searchTerm?: string) => {
    try {
      const [fechamentosData, allOss] = await Promise.all([
        FinanceiroService.getFechamentos(searchTerm),
        OsService.getAll(searchTerm, [
          "ABERTA",
          "EM_ANDAMENTO",
          "PRONTO PARA FINANCEIRO",
          "FINANCEIRO",
          "FINALIZADA"
        ]),
      ]);

      const fechamentosWithOs = fechamentosData.map((f: any) => {
        const foundOs = allOss.find((os) => os.id_os === f.id_os);
        return {
          ...f,
          ordem_de_servico: {
            ...(foundOs || {}),
            ...(f.ordem_de_servico || {}),
          },
        };
      });

      setFechamentos(fechamentosWithOs);

      // Filter OSs pending closure
      const pending = allOss.filter(
        (os) =>
          [
            "ABERTA",
            "EM_ANDAMENTO",
            "PRONTO PARA FINANCEIRO",
            "FINANCEIRO",
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
      veiculoMarca: os.veiculo?.marca,
      veiculoModelo: os.veiculo?.modelo,
      veiculoCor: os.veiculo?.cor,
      veiculoPlaca: os.veiculo?.placa,
      equipamentoPeca: os.equipamento?.nome_peca,
      equipamentoFabricante: os.equipamento?.fabricante,
      equipamentoNumeracao: os.equipamento?.numeracao,
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
            <table className="tabela-limpa w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-[12%]">OS / Data</th>
                  <th className="w-[20%]">Veículo / Peça</th>
                  <th className="w-[22%]">Defeito Relatado</th>
                  <th className="w-[12%]">Técnico</th>
                  <th className="w-[18%]">Cliente</th>
                  <th className="w-[9%] text-center">Status</th>
                  <th className="w-[7%] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendingOss.map((os) => (
                  <tr
                    key={os.id_os}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col items-start">
                        <div className="text-base font-bold text-neutral-600">
                          OS | {os.id_os}
                        </div>
                        {os.dt_abertura && (
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
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        {os.veiculo ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {os.veiculo.marca} {os.veiculo.modelo} •{" "}
                              {os.veiculo.cor}
                            </span>
                            <span className="text-base text-primary-600 uppercase mt-0.5 break-all">
                              {os.veiculo.placa} - {os.veiculo.ano_fabricacao && os.veiculo.ano_modelo ? `${os.veiculo.ano_fabricacao}/${os.veiculo.ano_modelo}` : os.veiculo.ano_fabricacao || os.veiculo.ano_modelo || "---"}
                            </span>
                          </>
                        ) : os.equipamento ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {os.equipamento.nome_peca}
                            </span>
                            <span className="text-sm text-neutral-400 mt-1 italic break-words">
                              {os.equipamento.fabricante &&
                                `Marca: ${os.equipamento.fabricante}`}
                              {os.equipamento.numeracao &&
                                ` • S/N: ${os.equipamento.numeracao}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-neutral-300 italic">
                            Serviço Avulso
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <p className="text-sm text-neutral-600 line-clamp-2 uppercase leading-relaxed break-words" title={os.defeito_relatado || os.diagnostico || ""}>
                          {os.defeito_relatado || os.diagnostico || <span className="text-neutral-300 italic">---</span>}
                        </p>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const mechanics = os.servicos_mao_de_obra
                              ?.map((s: any) => s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(" ")[0])
                              .filter(Boolean);
                            const uniqueMechanics = [...new Set(mechanics || [])];
                            if (uniqueMechanics.length > 0) {
                              return uniqueMechanics.map((mech: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed"
                                >
                                  {mech}
                                </span>
                              ));
                            }
                            return <span className="text-neutral-300 text-xs text-center ml-2">---</span>;
                          })()}
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <span className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed break-words" title={getClientName(os)}>
                          {getClientName(os)}
                        </span>
                        {os.cliente?.telefone_1 && (
                          <span className="text-sm text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
                            {formatPhone(os.cliente.telefone_1)}
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-black uppercase whitespace-nowrap ring-1 ${getStatusStyle(
                            os.status,
                          )}`}
                        >
                          {os.status === "PRONTO PARA FINANCEIRO"
                            ? "FINANCEIRO"
                            : os.status === "ORCAMENTO"
                            ? "ORÇAMENTO"
                            : os.status.replace(/_/g, " ")}
                        </span>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenFechamento(os.id_os); }}
                          className="flex items-center justify-center p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                          title="Gerenciar Fechamento"
                        >
                          <Wrench size={18} />
                        </button>
                      </div>
                      <div className="h-4"></div>
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
          <table className="tabela-limpa w-full table-fixed">
            <thead>
              <tr>
                <th className="w-[12%]">OS / Data</th>
                <th className="w-[20%]">Veículo / Peça</th>
                <th className="w-[22%]">Defeito Relatado</th>
                <th className="w-[12%]">Técnico</th>
                <th className="w-[18%]">Cliente</th>
                <th className="w-[9%] text-center">Status</th>
                <th className="w-[7%] text-right">Ações</th>
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
                    className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col items-start">
                        <div className="text-base font-bold text-neutral-600">
                          OS | {fech.id_os}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-neutral-600 font-medium">
                            {fech.data_fechamento_financeiro ? new Date(fech.data_fechamento_financeiro).toLocaleDateString() : "---"}
                          </span>
                          <span className="text-xs text-emerald-600 font-bold mt-1">
                            {formatCurrency(Number(fech.ordem_de_servico?.valor_total_cliente || 0))}
                          </span>
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        {fech.ordem_de_servico?.veiculo ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {fech.ordem_de_servico.veiculo.marca} {fech.ordem_de_servico.veiculo.modelo} •{" "}
                              {fech.ordem_de_servico.veiculo.cor}
                            </span>
                            <span className="text-base text-primary-600 uppercase mt-0.5 break-all">
                              {fech.ordem_de_servico.veiculo.placa} - {fech.ordem_de_servico.veiculo.ano_fabricacao && fech.ordem_de_servico.veiculo.ano_modelo ? `${fech.ordem_de_servico.veiculo.ano_fabricacao}/${fech.ordem_de_servico.veiculo.ano_modelo}` : fech.ordem_de_servico.veiculo.ano_fabricacao || fech.ordem_de_servico.veiculo.ano_modelo || "---"}
                            </span>
                          </>
                        ) : fech.ordem_de_servico?.equipamento ? (
                          <>
                            <span className="text-neutral-600 text-base font-medium uppercase break-words">
                              {fech.ordem_de_servico.equipamento.nome_peca}
                            </span>
                            <span className="text-sm text-neutral-400 mt-1 italic break-words">
                              {fech.ordem_de_servico.equipamento.fabricante &&
                                `Marca: ${fech.ordem_de_servico.equipamento.fabricante}`}
                              {fech.ordem_de_servico.equipamento.numeracao &&
                                ` • S/N: ${fech.ordem_de_servico.equipamento.numeracao}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-neutral-300 italic">
                            Serviço Avulso
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <p className="text-sm text-neutral-600 line-clamp-2 uppercase leading-relaxed break-words" title={fech.ordem_de_servico?.defeito_relatado || fech.ordem_de_servico?.diagnostico || ""}>
                          {fech.ordem_de_servico?.defeito_relatado || fech.ordem_de_servico?.diagnostico || <span className="text-neutral-300 italic">---</span>}
                        </p>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const mechanics = fech.ordem_de_servico?.servicos_mao_de_obra
                              ?.map((s: any) => s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(" ")[0])
                              .filter(Boolean);
                            const uniqueMechanics = [...new Set(mechanics || [])];
                            if (uniqueMechanics.length > 0) {
                              return uniqueMechanics.map((mech: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed"
                                >
                                  {mech}
                                </span>
                              ));
                            }
                            return <span className="text-neutral-300 text-xs text-center ml-2">---</span>;
                          })()}
                        </div>
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-slate-600">
                      <div className="flex flex-col break-words whitespace-normal">
                        <span className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed break-words" title={getClientName(fech.ordem_de_servico)}>
                          {getClientName(fech.ordem_de_servico)}
                        </span>
                        {fech.ordem_de_servico?.cliente?.telefone_1 && (
                          <span className="text-sm text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
                            {formatPhone(fech.ordem_de_servico.cliente.telefone_1)}
                          </span>
                        )}
                        <div className="h-4"></div>
                      </div>
                    </td>
                    <td className="p-4 align-top text-center">
                      {(() => {
                        const os = fech.ordem_de_servico;

                        // CLI: pagamentos acumulados do cliente >= valor total da OS (se for 0, também está OK)
                        const totalPago = (os?.pagamentos_cliente || []).reduce((acc: number, p: any) => acc + Number(p.valor), 0);
                        const valorOs = Number(os?.valor_total_cliente || 0);
                        const isCli = valorOs === 0 || totalPago >= valorOs;

                        // CON: todos os itens externos têm ao menos 1 pagamentos_peca com custo_real >= 0
                        const itensExternos = (os?.itens_os || []).filter((i: any) => !i.id_pecas_estoque);
                        const isCon = itensExternos.length === 0 || itensExternos.every((item: any) =>
                          item.pagamentos_peca?.some((pp: any) => pp.custo_real !== null && pp.custo_real !== undefined && Number(pp.custo_real) >= 0)
                        );

                        // PEC: todos os itens externos com pago_ao_fornecedor = true OU nf_numero preenchido
                        const isPec = itensExternos.length === 0 || itensExternos.every((item: any) =>
                          item.pagamentos_peca?.some((pp: any) => pp.pago_ao_fornecedor === true || !!pp.nf_numero)
                        );

                        // REC: nenhum recebível com status PENDENTE (sem recebíveis = OK)
                        const recebiveis = os?.recebiveis_cartao || [];
                        const isRec = recebiveis.length === 0 || !recebiveis.some((r: any) => r.status === "PENDENTE");

                        const badges = [
                          { key: "CLI", label: "CLI", ok: isCli, title: "Faturamento do Cliente Totalizado", route: `/fechamento-financeiro/${fech.id_os}` },
                          { key: "CON", label: "CON", ok: isCon, title: "Consolidação de Custos Preenchida", route: `/fechamento-financeiro/${fech.id_os}` },
                          { key: "PEC", label: "PEC", ok: isPec, title: "Fornecedores de Peças Quitados", route: "/pagamento-peca" },
                          { key: "REC", label: "REC", ok: isRec, title: "Fluxo de Recebíveis de Cartão OK", route: "/recebiveis" },
                        ];

                        return (
                          <div className="flex flex-col items-center h-full">
                            {/* Badge Principal de Status Dinâmico */}
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase whitespace-nowrap shadow-sm ${getStatusStyle(os?.status || "")}`}>
                              {os?.status || "N/A"}
                            </span>

                            {/* Circuito Pro de Auditoria */}
                            <div className="flex flex-wrap gap-1 justify-center mt-3 max-w-[140px]">
                              {badges.map((b) => (
                                <button
                                  key={b.key}
                                  title={b.title}
                                  onClick={(e) => { e.stopPropagation(); navigate(b.route); }}
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all border cursor-pointer hover:brightness-95 ${
                                    b.ok
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                                      : "bg-amber-50 text-amber-600 border-amber-300 shadow-sm"
                                  }`}
                                >
                                  {b.ok && <CheckCircle className="w-2.5 h-2.5" />}
                                  {b.label}
                                </button>
                              ))}
                            </div>
                            <div className="h-4"></div>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="p-4 align-top text-slate-600 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handlePrint(fech.ordem_de_servico); }}
                          icon={Printer}
                          label="Imprimir"
                          variant="neutral"
                        />
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handleEditFechamento(fech); }}
                          icon={Edit}
                          label="Editar"
                          variant="primary"
                        />
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(fech.id_fechamento_financeiro); }}
                          icon={Trash2}
                          label="Cancelar"
                          variant="danger"
                        />
                      </div>
                      <div className="h-4"></div>
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
          veiculoMarca={printData.veiculoMarca}
          veiculoModelo={printData.veiculoModelo}
          veiculoCor={printData.veiculoCor}
          veiculoPlaca={printData.veiculoPlaca}
          equipamentoPeca={printData.equipamentoPeca || undefined}
          equipamentoFabricante={printData.equipamentoFabricante || undefined}
          equipamentoNumeracao={printData.equipamentoNumeracao || undefined}
        />
      )}
    </PageLayout>
  );
};
