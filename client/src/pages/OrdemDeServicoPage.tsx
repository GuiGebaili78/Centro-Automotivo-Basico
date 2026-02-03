import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { IOrdemDeServico } from "../types/backend";
import { Search, Plus, Phone, CheckCircle, Wrench } from "lucide-react";

import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { toast } from "react-toastify";

export const OrdemDeServicoPage = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState(""); // NEW: Localizar Search
  const [dateFilter, setDateFilter] = useState<
    "ALL" | "HOJE" | "SEMANA" | "MES"
  >("SEMANA");

  const [oss, setOss] = useState<IOrdemDeServico[]>([]);

  // Status Feedback

  const location = useLocation();

  // --- DATA LOADING ---
  const loadOss = useCallback(async () => {
    try {
      const response = await api.get("/ordem-de-servico");
      setOss(response.data);
    } catch (error) {
      toast.error("Erro ao carregar Ordens de Serviço.");
    }
  }, []);

  // Wizard State for New OS
  const [newOsWizardStep, setNewOsWizardStep] = useState<"NONE" | "OS">("NONE");
  const [wizardClient, setWizardClient] = useState<any>(null);
  const [wizardVehicle, setWizardVehicle] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    loadOss();

    const params = new URLSearchParams(location.search);
    const osId = params.get("id");
    const paramClientId = params.get("clientId");
    const paramVehicleId = params.get("vehicleId");

    if (osId) {
      handleOpenFromId(Number(osId));
    } else if (paramClientId && paramVehicleId) {
      const loadForDirectOpen = async () => {
        try {
          const [cRes, vRes] = await Promise.all([
            api.get(`/cliente/${paramClientId}`),
            api.get(`/veiculo/${paramVehicleId}`),
          ]);
          setWizardClient(cRes.data);
          setWizardVehicle(vRes.data);
          setNewOsWizardStep("OS");
        } catch (e) {
          console.error("Error loading for direct open", e);
        }
      };
      loadForDirectOpen();
    }
  }, [loadOss, location.search]);

  const handleOpenNewOsForExisting = (vehicle: any, client: any) => {
    if (!vehicle || !client) return;
    setWizardClient(client);
    setWizardVehicle(vehicle);
    setNewOsWizardStep("OS");
  };

  const handleCreateOsFinal = async (
    mechanicId: number | null = null,
    km: number = 0,
    defect: string = "",
    overrideVehicle: any = null,
    overrideClient: any = null,
  ) => {
    const client = overrideClient || wizardClient;
    const vehicle = overrideVehicle || wizardVehicle;

    if (!client || !vehicle) return;

    try {
      const payload = {
        id_cliente: client.id_cliente,
        id_veiculo: vehicle.id_veiculo,
        id_funcionario: mechanicId || null,
        km_entrada: km,
        defeito_relatado: defect,
        status: "ABERTA",
        valor_total_cliente: 0,
        valor_mao_de_obra: 0,
        parcelas: 1,
      };
      const res = await api.post("/ordem-de-servico", payload);
      setNewOsWizardStep("NONE");
      setWizardClient(null);
      setWizardVehicle(null);
      handleNewOsSuccess(res.data.id_os);
      toast.success("OS Criada com Sucesso!");
    } catch (e) {
      toast.error("Erro ao criar OS.");
    }
  };

  // --- HANDLERS ---

  /* Updated Logic */
  const handleCancelWizard = () => {
    setNewOsWizardStep("NONE");
    // Check params directly to safely navigate back if opened via deep link
    const params = new URLSearchParams(location.search);
    if (params.get("clientId") && params.get("vehicleId")) {
      navigate(-1);
    }
  };

  const handleOpenFromId = (id: number) => {
    navigate(`/ordem-de-servico/${id}`);
  };

  const handleNewOsSuccess = async (newOsId: number) => {
    handleOpenFromId(newOsId);
  };

  const handleManageItem = (os: IOrdemDeServico) => {
    handleOpenFromId(os.id_os);
  };

  // FILTER LOGIC
  const filteredOss = (Array.isArray(oss) ? oss : []).filter((os) => {
    // 1. Date Filter
    if (dateFilter !== "ALL") {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const osDate = new Date(os.dt_abertura);

      if (dateFilter === "HOJE") {
        if (osDate < startOfToday) return false;
      } else if (dateFilter === "SEMANA") {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(startOfToday.getDate() - 7);
        if (osDate < weekAgo) return false;
      } else if (dateFilter === "MES") {
        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (osDate < firstDayMonth) return false;
      }
    }

    if (!searchTerm) {
      // User requested to show ALL OSs (subject to Date Filter)
      // Previously restricted to 'ABERTA'. Now we show everything matching the date filter.
      return true;
    }

    const q = searchTerm.toLowerCase();
    const plate = os.veiculo?.placa?.toLowerCase() || "";
    const model = os.veiculo?.modelo?.toLowerCase() || "";
    const brand = os.veiculo?.marca?.toLowerCase() || "";
    const color = os.veiculo?.cor?.toLowerCase() || "";
    const owner = (
      os.cliente?.pessoa_fisica?.pessoa?.nome ||
      os.cliente?.pessoa_juridica?.razao_social ||
      ""
    ).toLowerCase();
    const id = String(os.id_os);
    const fullIdHash = `#${os.id_os}`;

    return [plate, model, brand, color, owner, id, fullIdHash]
      .join(" ")
      .includes(q);
  });

  // --- RENDER ---
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
    <>
      <PageLayout
        title="Ordens de Serviço"
        subtitle="Gestão centralizada de atendimentos."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate("/novo-cadastro")}
          >
            Novo Cadastro
          </Button>
        }
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex-1 w-full relative">
            <Input
              ref={searchInputRef}
              variant="default"
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Placa, Cliente, Modelo ou OS..."
            />
          </div>

          <div className="flex bg-neutral-50 p-1 rounded-lg border border-neutral-100 gap-1 shrink-0">
            {["ALL", "HOJE", "SEMANA", "MES"].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f as any)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  dateFilter === f
                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {f === "ALL" ? "Todos" : f === "MES" ? "Mês" : f}
              </button>
            ))}
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tabela-limpa w-full">
              <thead>
                <tr>
                  <th className="p-4">OS / Data</th>
                  <th className="p-4">Veículo</th>
                  <th className="p-4">Diagnóstico / Ações</th>
                  <th className="p-4">Técnico</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOss
                  .sort((a, b) => b.id_os - a.id_os)
                  .map((os) => (
                    <tr
                      key={os.id_os}
                      className="transition-colors hover:bg-neutral-50 group"
                    >
                      <td className="p-4">
                        <div className="font-bold text-neutral-600">
                          #{os.id_os}
                        </div>
                        <div className="text-[13px] text-neutral-600 font-medium">
                          {new Date(os.dt_abertura).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-700 tracking-tight text-sm uppercase">
                          {os.veiculo?.marca} {os.veiculo?.modelo} -{" "}
                          {os.veiculo?.cor}
                        </div>
                        <div className="text-[14px] text-primary-500 font-bold uppercase">
                          {os.veiculo?.placa || "Placa N/I"}
                        </div>
                      </td>
                      <td
                        className="p-4 max-w-[200px]"
                        title={
                          os.diagnostico ||
                          os.defeito_relatado ||
                          "Sem diagnóstico registrado"
                        }
                      >
                        <p className="text-xs font-medium text-neutral-600 line-clamp-2">
                          {os.diagnostico || os.defeito_relatado || (
                            <span className="text-neutral-300 italic">
                              Pendente
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="p-4">
                        <p
                          className="text-xs font-bold text-neutral-700 uppercase truncate max-w-[120px]"
                          title="Responsável Técnico"
                        >
                          {(() => {
                            // @ts-ignore
                            const mechanics = os.servicos_mao_de_obra
                              ?.map(
                                (s) =>
                                  s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(
                                    " ",
                                  )[0],
                              )
                              .filter(Boolean);
                            const uniqueMechanics = [
                              ...new Set(mechanics || []),
                            ];

                            if (uniqueMechanics.length > 0) {
                              return uniqueMechanics.join(", ");
                            }
                            return (
                              os.funcionario?.pessoa_fisica?.pessoa?.nome?.split(
                                " ",
                              )[0] || (
                                <span className="text-neutral-300">---</span>
                              )
                            );
                          })()}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-700 text-sm truncate max-w-[150px]">
                          {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                            os.cliente?.pessoa_juridica?.razao_social ||
                            "Desconhecido"}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-medium">
                          {os.cliente?.telefone_1}
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
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            onClick={() => handleManageItem(os)}
                            label="Gerenciar"
                            variant="neutral"
                            icon={Wrench}
                          />

                          {(os.status === "FINALIZADA" ||
                            os.status === "PRONTO PARA FINANCEIRO" ||
                            os.status === "PAGA_CLIENTE") && (
                            <ActionButton
                              onClick={() =>
                                handleOpenNewOsForExisting(
                                  os.veiculo,
                                  os.cliente,
                                )
                              }
                              icon={Plus}
                              label="Nova OS"
                              variant="primary"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {filteredOss.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-neutral-500"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <p className="font-bold text-neutral-400 mb-2">
                          Nenhum registro encontrado.
                        </p>
                        <p className="text-sm text-neutral-400 mb-4">
                          Deseja iniciar um novo atendimento?
                        </p>
                        <Button
                          onClick={() => navigate("/novo-cadastro")}
                          variant="primary"
                          icon={Plus}
                        >
                          NOVO CADASTRO
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageLayout>

      {newOsWizardStep === "OS" && wizardClient && wizardVehicle && (
        <Modal
          title={
            <span className="text-neutral-600">
              Passo 3: Confirmar Abertura
            </span>
          }
          onClose={handleCancelWizard}
          className="max-w-xl"
        >
          <div className="space-y-6">
            <div className="bg-primary-50 p-6 rounded-xl border border-primary-100 space-y-4">
              <div className="flex justify-between items-start border-b border-primary-100 pb-4">
                <div>
                  <p className="text-[10px] font-bold text-primary-400 uppercase mb-1">
                    Cliente
                  </p>
                  <p className="font-bold text-primary-900 text-lg leading-tight">
                    {wizardClient.pessoa_fisica?.pessoa?.nome ||
                      wizardClient.pessoa_juridica?.razao_social}
                  </p>
                  <p className="text-sm text-primary-600 font-bold mt-1 flex items-center gap-1">
                    <Phone size={14} className="text-primary-400" />{" "}
                    {wizardClient.telefone_1 ||
                      wizardClient.telefone_2 ||
                      "Sem telefone"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-primary-400 uppercase mb-1">
                    Veículo
                  </p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-bold text-primary-900 text-xl tracking-tight">
                        {wizardVehicle.placa}
                      </p>
                      <p className="text-xs text-primary-600 font-bold uppercase">
                        {wizardVehicle.modelo} • {wizardVehicle.cor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
              <p className="text-neutral-500 text-sm font-medium">
                Confirme os dados acima para iniciar a Ordem de Serviço.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateOsFinal(null, 0, "");
              }}
            >
              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  onClick={handleCancelWizard}
                  variant="ghost"
                  className="flex-1"
                  size="lg"
                >
                  CANCELAR
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-[2]"
                  size="lg"
                  icon={CheckCircle}
                >
                  ABRIR ORDEM DE SERVIÇO
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};
