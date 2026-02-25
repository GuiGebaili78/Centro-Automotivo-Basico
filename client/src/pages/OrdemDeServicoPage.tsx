import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { IOrdemDeServico } from "../types/backend";
import { Search, Plus, Phone, CheckCircle, Wrench } from "lucide-react";
import { OsTable } from "../components/shared/os/OsTable";

import { ActionButton } from "../components/ui/ActionButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { toast } from "react-toastify";
import { OsCreationModal } from "../components/shared/os/OsCreationModal";
import { OsStatus } from "../types/os.types";
import { OsService } from "../services/os.service";
import { ClienteService } from "../services/cliente.service";
import { VeiculoService } from "../services/veiculo.service";

export const OrdemDeServicoPage = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [osCreationModalOpen, setOsCreationModalOpen] = useState(false);
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
      const data = await OsService.getAll();
      setOss(data);
    } catch (error) {
      toast.error("Erro ao carregar Ordens de Serviço.");
    }
  }, []);

  // Wizard State for New OS
  const [newOsWizardStep, setNewOsWizardStep] = useState<
    "NONE" | "SEARCH_CLIENT" | "SELECT_VEHICLE" | "CONFIRM"
  >("NONE");
  const [wizardClient, setWizardClient] = useState<any>(null);
  const [wizardVehicle, setWizardVehicle] = useState<any>(null);
  const [wizardInitialStatus, setWizardInitialStatus] = useState<OsStatus>(
    OsStatus.ABERTA,
  );
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Client Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (clientSearchTerm.length >= 2 && newOsWizardStep === "SEARCH_CLIENT") {
        try {
          const allClients = await ClienteService.getAll(); // TODO: Optimize backend to accept search param or filter locally if list is small. Assuming small for now or using existing list.
          // Actually, we should probably use a specific search endpoint or filter the full list if already loaded?
          // Let's filter locally from a fresh fetch to ensure latest data.
          const filtered = allClients.filter((c: any) => {
            const name = (
              c.pessoa_fisica?.pessoa?.nome ||
              c.pessoa_juridica?.nome_fantasia ||
              c.pessoa_juridica?.razao_social ||
              ""
            ).toLowerCase();
            const document = (
              c.pessoa_fisica?.cpf ||
              c.pessoa_juridica?.cnpj ||
              ""
            ).replace(/\D/g, "");
            const term = clientSearchTerm.toLowerCase();
            const termClean = term.replace(/\D/g, "");

            return (
              name.includes(term) || (termClean && document.includes(termClean))
            );
          });
          setClientSearchResults(filtered.slice(0, 5)); // Limit to 5 results
        } catch (e) {
          console.error("Error searching clients", e);
        }
      } else {
        setClientSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearchTerm, newOsWizardStep]);

  useEffect(() => {
    loadOss();

    const params = new URLSearchParams(location.search);
    const osId = params.get("id");
    const paramClientId = params.get("clientId");
    const paramVehicleId = params.get("vehicleId");
    const paramStatus = params.get("initialStatus"); // ORCAMENTO

    if (osId) {
      handleOpenFromId(Number(osId));
    } else if (paramClientId && paramVehicleId) {
      const loadForDirectOpen = async () => {
        try {
          const [c, v] = await Promise.all([
            ClienteService.getById(Number(paramClientId)),
            VeiculoService.getById(Number(paramVehicleId)),
          ]);
          setWizardClient(c);
          setWizardVehicle(v);

          // Validate and set status
          const validStatus = Object.values(OsStatus).includes(
            paramStatus as OsStatus,
          )
            ? (paramStatus as OsStatus)
            : OsStatus.ABERTA;

          setWizardInitialStatus(validStatus);
          setNewOsWizardStep("CONFIRM");
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
    setNewOsWizardStep("CONFIRM");
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
        id_funcionario: mechanicId || undefined,
        km_entrada: km,
        defeito_relatado: defect,
        status: wizardInitialStatus,
        valor_total_cliente: 0,
        valor_mao_de_obra: 0,
        parcelas: 1,
      };
      const newOs = await OsService.create(payload);
      setNewOsWizardStep("NONE");
      setWizardClient(null);
      setWizardVehicle(null);
      handleNewOsSuccess(newOs.id_os);
      toast.success("OS Criada com Sucesso!");
    } catch (e) {
      toast.error("Erro ao criar OS.");
    }
  };

  // --- HANDLERS ---

  /* Updated Logic */
  const handleCancelWizard = () => {
    setNewOsWizardStep("NONE");
    setClientSearchTerm("");
    setClientSearchResults([]);
    setWizardClient(null);
    setWizardVehicle(null);

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

  return (
    <>
      <PageLayout
        title="Ordens de Serviço"
        subtitle="Gestão centralizada de atendimentos."
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setOsCreationModalOpen(true)}
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

          <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-100 gap-1 shrink-0">
            {["ALL", "HOJE", "SEMANA", "MES"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={dateFilter === f ? "primary" : "ghost"}
                className={`text-[10px] h-8 px-4 ${dateFilter === f ? "shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                onClick={() => setDateFilter(f as any)}
              >
                {f === "ALL" ? "Todos" : f === "MES" ? "Mês" : f}
              </Button>
            ))}
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <OsTable
            oss={filteredOss.sort((a, b) => b.id_os - a.id_os)}
            onRowClick={handleManageItem}
            renderActions={(os) => (
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
                      handleOpenNewOsForExisting(os.veiculo, os.cliente)
                    }
                    icon={Plus}
                    label="Nova OS"
                    variant="primary"
                  />
                )}
              </div>
            )}
            emptyMessage="Nenhum registro encontrado."
          />
        </Card>
      </PageLayout>

      {/* 1. SELECT CLIENT STEP */}
      {newOsWizardStep === "SEARCH_CLIENT" && (
        <Modal
          title="Selecionar Cliente"
          onClose={handleCancelWizard}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <Input
              // @ts-ignore
              ref={clientSearchInputRef}
              label="Buscar Cliente"
              placeholder="Digite nome ou documento..."
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              icon={Search}
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto space-y-2">
              {clientSearchResults.length > 0
                ? clientSearchResults.map((c) => (
                    <div
                      key={c.id_cliente}
                      onClick={() => {
                        setWizardClient(c);
                        setClientSearchTerm("");
                        setNewOsWizardStep("SELECT_VEHICLE");
                      }}
                      className="p-3 border rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <p className="font-bold text-neutral-800">
                        {c.pessoa_fisica?.pessoa?.nome ||
                          c.pessoa_juridica?.nome_fantasia ||
                          c.pessoa_juridica?.razao_social}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {c.telefone_1 || "Sem telefone"}{" "}
                        {c.pessoa_fisica?.cpf
                          ? `• PDF: ${c.pessoa_fisica.cpf}`
                          : ""}
                      </p>
                    </div>
                  ))
                : clientSearchTerm.length > 2 && (
                    <div className="text-center text-sm text-neutral-500 py-4">
                      Nenhum cliente encontrado.
                      <Button
                        variant="ghost"
                        className="mt-2 text-primary-600"
                        onClick={() => navigate("/novo-cadastro")}
                      >
                        Cadastrar Novo?
                      </Button>
                    </div>
                  )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={handleCancelWizard}>
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. SELECT VEHICLE STEP */}
      {newOsWizardStep === "SELECT_VEHICLE" && wizardClient && (
        <Modal
          title="Selecionar Veículo"
          onClose={handleCancelWizard}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <div className="bg-primary-50 p-3 rounded-lg flex items-center gap-3">
              <div className="bg-white p-2 rounded-full text-primary-600">
                <Phone size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary-400 uppercase">
                  Cliente Selecionado
                </p>
                <p className="font-bold text-primary-900 text-sm">
                  {wizardClient.pessoa_fisica?.pessoa?.nome ||
                    wizardClient.pessoa_juridica?.nome_fantasia}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => setNewOsWizardStep("SEARCH_CLIENT")}
              >
                Alterar
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {wizardClient.veiculos && wizardClient.veiculos.length > 0 ? (
                wizardClient.veiculos.map((v: any) => (
                  <div
                    key={v.id_veiculo}
                    onClick={() => {
                      setWizardVehicle(v);
                      setNewOsWizardStep("CONFIRM");
                    }}
                    className="p-3 border rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-neutral-800">{v.placa}</p>
                      <p className="text-xs text-neutral-500 uppercase">
                        {v.modelo} • {v.cor}
                      </p>
                    </div>
                    <div className="text-neutral-400">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-neutral-500">
                  Este cliente não possui veículos cadastrados.
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        navigate(`/cadastro/${wizardClient.id_cliente}`)
                      }
                    >
                      Cadastrar Veículo
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-start pt-2">
              <Button
                variant="ghost"
                onClick={() => setNewOsWizardStep("SEARCH_CLIENT")}
              >
                Voltar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {newOsWizardStep === "CONFIRM" && wizardClient && wizardVehicle && (
        <Modal
          title={
            <span className="text-neutral-600">
              {wizardInitialStatus === OsStatus.ORCAMENTO ||
              wizardInitialStatus === OsStatus.AGENDAMENTO
                ? "Confirmar Agendamento / Orçamento"
                : "Passo 3: Confirmar Abertura"}
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
                  {wizardInitialStatus === OsStatus.ORCAMENTO
                    ? "CRIAR ORÇAMENTO"
                    : wizardInitialStatus === OsStatus.AGENDAMENTO
                      ? "CONFIRMAR AGENDAMENTO"
                      : "ABRIR ORDEM DE SERVIÇO"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <OsCreationModal
        isOpen={osCreationModalOpen}
        onClose={() => setOsCreationModalOpen(false)}
        onSelect={(status) => {
          setOsCreationModalOpen(false);
          setWizardInitialStatus(status);
          setNewOsWizardStep("SEARCH_CLIENT");
        }}
      />
    </>
  );
};
