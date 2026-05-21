import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { PageLayout } from "../components/ui/PageLayout";

import { OsStatus } from "../types/os.types";
import { UnifiedSearch } from "../components/dashboard/UnifiedSearch";
import { OsCreationModal } from "../components/os/OsCreationModal";
import { LoosePartOsModal } from "../components/os/LoosePartOsModal";
import { DashboardCalendar } from "../components/dashboard/DashboardCalendar";

import { DashboardService } from "../services/dashboard.service";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import { RecentOsWidget } from "../components/dashboard/RecentOsWidget";
import type { IDashboardStats } from "../types/dashboard.types";

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [isLoosePartModalOpen, setIsLoosePartModalOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<any>(null);

  const [handleNewRecord] = useState(() => () => navigate("/novo-cadastro"));

  const [recentOss, setRecentOss] = useState<any[]>([]);
  const [stats, setStats] = useState<IDashboardStats>({
    osAberta: 0,
    contasPagarPending: 0,
    contasPagarOverdue: 0,
    livroCaixaEntries: 0,
    livroCaixaExits: 0,
    autoPecasPendentes: 0,
    consolidacao: 0,
    alertaEstoque: 0,
  });

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    fetchData();

    // Atualizar data/hora a cada segundo
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (location.state?.focusSearch) {
      // Pequeno delay para garantir que o componente de busca foi renderizado
      setTimeout(() => {
        const input = document.querySelector(
          "input[placeholder*='Buscar cliente, placa ou peça...']",
        );
        if (input) (input as HTMLElement).focus();
      }, 100);

      // Limpa o state para não focar novamente se der refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const fetchData = async () => {
    try {
      const data = await DashboardService.getDashboardData();
      setStats(data.stats);
      setRecentOss(data.recentOss);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard", error);
    }
  };

  const handleSearchResultSelect = (result: any) => {
    if (result.subtext === "Sem veículo cadastrado") {
      navigate(`/cadastro/${result.id_cliente}`);
      return;
    }
    setSelectedSearch(result);
    setDecisionModalOpen(true);
  };

  const handleOsSelect = (status: OsStatus) => {
    if (!selectedSearch) return;

    // Construct URL with all necessary params
    const params = new URLSearchParams();
    params.append("clientId", selectedSearch.id_cliente);
    if (selectedSearch.id_veiculo) {
      params.append("vehicleId", selectedSearch.id_veiculo);
    }
    params.append("initialStatus", status);

    navigate(`/ordem-de-servico?${params.toString()}`);
    setDecisionModalOpen(false);
  };

  return (
    <PageLayout
      title="Monitor"
      subtitle={
        <div className="flex items-center text-neutral-500 font-medium">
          {currentDateTime.toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          •{" "}
          {currentDateTime.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      }
      actions={
        <div className="flex-1 w-full xl:max-w-3xl mx-auto flex items-center gap-3 order-2">
          <div className="flex-1">
            <UnifiedSearch
              onSelect={handleSearchResultSelect}
              onNewRecord={handleNewRecord}
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            className="h-[42px] px-4 shadow-lg shadow-primary-500/20 whitespace-nowrap"
            onClick={() => {
              const input = document.querySelector(
                "input[placeholder*='Buscar cliente, placa ou peça...']",
              );
              if (input) (input as HTMLElement).focus();
            }}
          >
            Nova OS
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsLoosePartModalOpen(true)}
            className="h-[42px] px-4 border-neutral-200 text-neutral-600 hover:text-primary-600 whitespace-nowrap font-bold"
          >
            🔧 Peça Avulsa
          </Button>
        </div>
      }
    >
      <div className="h-[calc(100vh-170px)] flex flex-col overflow-hidden space-y-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-neutral-100 animate-in fade-in slide-in-from-top-4 duration-700 shrink-0">
          <DashboardMetrics stats={stats} />
        </div>

        <main className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
          <DashboardCalendar
            items={recentOss
              .filter(
                (o: any) =>
                  o.status === OsStatus.ORCAMENTO ||
                  o.status === OsStatus.AGENDAMENTO,
              )
              .map((o: any) => ({
                id_os: o.id_os,
                date: o.dt_abertura
                  ? new Date(o.dt_abertura)
                  : o.created_at
                    ? new Date(o.created_at)
                    : new Date(),
                clientName:
                  o.cliente?.pessoa_fisica?.pessoa?.nome ||
                  o.cliente?.pessoa_juridica?.nome_fantasia ||
                  "Cliente",
                vehicleModel: `${o.veiculo?.modelo || "N/I"} ${o.veiculo?.cor ? `- ${o.veiculo.cor}` : ""}`,
                status: o.status,
              }))}
          />

          {/* Recent Services - FULL WIDTH */}
          <RecentOsWidget recentOss={recentOss} />
        </main>
      </div>

      <OsCreationModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onSelect={handleOsSelect}
        clientName={selectedSearch?.display}
        vehicleName={selectedSearch?.subtext}
      />

      <LoosePartOsModal
        isOpen={isLoosePartModalOpen}
        onClose={() => setIsLoosePartModalOpen(false)}
      />
    </PageLayout>
  );
}
