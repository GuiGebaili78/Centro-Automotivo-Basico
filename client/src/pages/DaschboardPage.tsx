import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

import { OsStatus } from "../types/os.types";
import { UnifiedSearch } from "../components/shared/dashboard/UnifiedSearch";
import { OsCreationModal } from "../components/shared/os/OsCreationModal";
import { DashboardCalendar } from "../components/shared/dashboard/DashboardCalendar";

import { DashboardService } from "../services/dashboard.service";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import { RecentOsWidget } from "../components/dashboard/RecentOsWidget";
import type { IDashboardStats } from "../types/dashboard.types";

export function DaschboardPage() {
  const navigate = useNavigate();

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          {/* Title / Welcome */}
          <div className="shrink-0">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Monitor
            </h1>
            <p className="text-sm text-slate-500 mt-1">
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
            </p>
          </div>

          {/* Search & Actions - MOVED TO MIDDLE */}
          <div className="flex-1 w-full xl:max-w-xl mx-auto flex items-center gap-3 order-2">
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
                  "input[placeholder*='Buscar por Placa']",
                );
                if (input) (input as HTMLElement).focus();
              }}
            >
              Nova OS
            </Button>
          </div>

          {/* Stats 2x2 Grid - MOVED TO RIGHT */}
          <DashboardMetrics stats={stats} />
        </div>

        <main className="animate-in fade-in duration-500 space-y-4">
          <DashboardCalendar
            items={recentOss
              .filter(
                (o: any) => o.status === "ORCAMENTO" || o.status === "AGENDA",
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
    </div>
  );
}
