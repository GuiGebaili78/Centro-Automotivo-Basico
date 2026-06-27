import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { PageLayout } from "../components/ui/PageLayout";
import { ReportFilter } from "../components/relatorios/ReportFilter";
import type {
  ResumoFinanceiro,
  PerformanceFuncionario,
  EvolucaoMensal,
  EvolucaoDespesa,
  EvolucaoDespesaTemporal,
  TimelineDespesasResponse,
  OperadoraStats,
} from "../types/relatorios.types";
import { RelatoriosService } from "../services/relatorios.service";
import { FinanceiroService } from "../services/financeiro.service";
import { EstoqueService } from "../services/estoque.service";
import { formatCurrency } from "../utils/formatCurrency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "react-toastify";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ListFilter,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Filter,
  AlertTriangle,
  X,
  Info,
} from "lucide-react";
import { Select } from "../components/ui";

// ─── Tipos locais ──────────────────────────────────────────────────────────────
type GroupByOption = "day" | "week" | "month" | "quarter" | "semester" | "year";

const GROUP_BY_LABELS: Partial<Record<GroupByOption, string>> = {
  month: "Mensal",
  quarter: "Trimestral",
  semester: "Semestral",
  year: "Anual",
};

// ─── Componente principal ──────────────────────────────────────────────────────
export const RelatoriosPage = () => {
  const navigate = useNavigate();
  const [pendingConsolidations, setPendingConsolidations] = useState<{ hasPending: boolean; count: number } | null>(null);

  useEffect(() => {
    RelatoriosService.verificarPendenciasConsolidacao()
      .then(setPendingConsolidations)
      .catch(console.error);
  }, []);

  // Estado global (filtro do topo)
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [equipe, setEquipe] = useState<PerformanceFuncionario[]>([]);
  const [evolucaoDespesas, setEvolucaoDespesas] = useState<EvolucaoDespesa[]>(
    [],
  );
  const [operadorasStats, setOperadorasStats] = useState<OperadoraStats[]>([]);
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<any[]>([]);
  const [estoqueGeral, setEstoqueGeral] = useState<any[]>([]);

  // Datas globais do filtro superior para sincronizar Timeline de Despesas
  const [globalDates, setGlobalDates] = useState({ startDate: "", endDate: "" });

  // Estado da Evolução Financeira — agrupamento (travado no ano vigente)
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([]);
  const [evolGroupBy, setEvolGroupBy] = useState<GroupByOption>("month");
  const [evolView, setEvolView] = useState<"bruto" | "liquido">("bruto");
  const [evolLoading, setEvolLoading] = useState(false);

  // Estado da Timeline de Despesas
  const [timeline, setTimeline] = useState<EvolucaoDespesaTemporal[]>([]);
  const [timelineKeys, setTimelineKeys] = useState<string[]>([]);
  const [timelineView, setTimelineView] = useState<"categoria" | "subcategoria">("categoria");
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Filtros de categoria da Timeline
  const [timelineCategoriaId, setTimelineCategoriaId] = useState<number | undefined>(undefined);
  const [timelineSubcategoriaId, setTimelineSubcategoriaId] = useState<number | undefined>(undefined);

  // Filtro de Colaborador (tabela de equipe)
  const [colaboradorFiltroId, setColaboradorFiltroId] = useState<number | "">("");

  // Cores para gráficos
  const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];

  // ── Fetch de categorias financeiras ──────────────────────────────────────────
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const data = await FinanceiroService.getCategoriasFinanceiras();
        setCategoriasFinanceiras(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategorias();
  }, []);

  // ── Fetch principal (filtro global) ──────────────────────────────────────────
  const fetchReports = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    setGlobalDates({ startDate, endDate });
    try {
      const [resumoData, equipeData, evolucaoDespesasData, operadorasData, estoqueData] = await Promise.all([
        RelatoriosService.getResumoFinanceiro(startDate, endDate),
        RelatoriosService.getPerformanceEquipe(startDate, endDate),
        RelatoriosService.getEvolucaoDespesas(startDate, endDate),
        RelatoriosService.getOperadorasCartao(startDate, endDate),
        EstoqueService.getAll(),
      ]);
      setResumo(resumoData);
      setEquipe(equipeData);
      setEvolucaoDespesas(evolucaoDespesasData);
      setOperadorasStats(operadorasData);
      setEstoqueGeral(estoqueData.data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Evolução Financeira — sempre travada no ano vigente ───────────────────────
  useEffect(() => {
    const today = new Date();
    const yearStart = format(startOfYear(today), "yyyy-MM-dd");
    const yearEnd = format(endOfYear(today), "yyyy-MM-dd");

    const fetchEvolucao = async () => {
      setEvolLoading(true);
      try {
        const data = await RelatoriosService.getEvolucaoMensal(
          yearStart,
          yearEnd,
          evolGroupBy as any,
        );
        setEvolucao(data);
      } catch (error) {
        console.error(error);
      } finally {
        setEvolLoading(false);
      }
    };
    fetchEvolucao();
  }, [evolGroupBy]); // Datas calculadas internamente — nunca causam loop

  // ── Timeline de Despesas — sincronizada com filtro global + filtros de categoria ──
  useEffect(() => {
    if (!globalDates.startDate || !globalDates.endDate) return;

    const fetchTimeline = async () => {
      setTimelineLoading(true);
      try {
        const response = await RelatoriosService.getEvolucaoDespesasTemporal(
          globalDates.startDate,
          globalDates.endDate,
          timelineView,
          timelineCategoriaId,
          timelineSubcategoriaId,
        );
        setTimeline(response.data);
        setTimelineKeys(response.keys);
      } catch (error) {
        console.error(error);
      } finally {
        setTimelineLoading(false);
      }
    };
    fetchTimeline();
  }, [
    globalDates.startDate,
    globalDates.endDate,
    timelineView,
    timelineCategoriaId,
    timelineSubcategoriaId,
  ]);

  // ── Categoria raiz (sem parent) e subcategorias derivadas ──────────────────────
  const categoriasRaiz = categoriasFinanceiras.filter((c) => !c.id_parent);
  const subcategoriasDaCategoriaAtiva = timelineCategoriaId
    ? categoriasFinanceiras.filter((c) => c.id_parent === timelineCategoriaId)
    : [];

  const handleClearTimelineFilter = () => {
    setTimelineCategoriaId(undefined);
    setTimelineSubcategoriaId(undefined);
  };

  const dataPizza = resumo
    ? [
        { name: "Mão de Obra", value: resumo.liquida.maoDeObra || 0, fill: "#3B82F6" },
        { name: "Estoque", value: resumo.liquida.estoque || 0, fill: "#F59E0B" },
        { name: "Auto Peças", value: resumo.liquida.autoPecas || 0, fill: "#10B981" },
      ].filter((d) => d.value > 0)
    : [];

  // ── Filtro local de Colaborador (Performance da Equipe) ────────────────────────
  const equipeFiltrada = colaboradorFiltroId
    ? equipe.filter((func) => func.id === Number(colaboradorFiltroId))
    : equipe;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Relatórios Gerenciais"
      subtitle="Análise financeira e de performance 360º"
    >
      <div className="space-y-6 relative">
        {pendingConsolidations?.hasPending && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-2 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-red-800">Aviso de Integridade dos Relatórios</h3>
                <p className="text-sm text-red-700 mt-1">
                  Para relatórios corretos, conclua as consolidações pendentes. 
                  Existem <strong>{pendingConsolidations.count}</strong> OS(s) pendente(s) de fechamento financeiro.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/fechamento-financeiro")}
              className="text-sm font-semibold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              Ir para Consolidação
            </button>
          </div>
        )}

        {/* ── Sticky Filter Global ── */}
        <div className="sticky top-[72px] z-30 bg-slate-50/95 backdrop-blur-md pb-4 pt-2 border-b border-neutral-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6 transition-all duration-300">
          <ReportFilter
            onFilterChange={fetchReports}
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            Processando inteligência de dados...
          </div>
        ) : (
          <>
            {/* ── Row 1: 5 KPI Cards ── */}
            {resumo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Receita Bruta */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Receita Bruta
                      </p>
                      <h3 className="text-2xl font-bold text-neutral-800 mt-1">
                        {formatCurrency(resumo.dashboard.receitaBruta)}
                      </h3>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <TrendingUp size={20} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-neutral-50 pt-3">
                    <div className="text-center">
                      <span className="block text-neutral-400 mb-0.5">Operacional Líquida</span>
                      <span className="font-semibold text-emerald-600 truncate block">
                        {formatCurrency(resumo.bruta.total)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">Peças</span>
                      <span className="font-semibold text-neutral-600 truncate block">
                        {formatCurrency(resumo.bruta.receitaPecas ?? (resumo.bruta.autoPecas + resumo.bruta.estoque))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Despesa Bruta */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-neutral-400 tracking-wider" title="Soma dos pagamentos a fornecedores efetivamente liquidados no período (Regime de Caixa).">
                        Despesa Bruta
                        <Info size={14} className="text-neutral-400 cursor-help" />
                      </p>
                      <h3 className="text-2xl font-bold text-red-600 mt-1">
                        - {formatCurrency(resumo.dashboard.despesaBruta)}
                      </h3>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                      <TrendingDown size={20} className="text-red-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs border-t border-neutral-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Regime de Caixa:</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(resumo.dashboard.despesaBruta)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. Lucro Líquido */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-neutral-400 tracking-wider" title="Lucro apurado apenas sobre serviços e peças de Ordens de Serviço já finalizadas (Regime de Competência).">
                        Lucro Líquido
                        <Info size={14} className="text-neutral-400 cursor-help" />
                      </p>
                      <h3
                        className={`text-2xl font-bold mt-1 ${
                          resumo.dashboard.lucroLiquido >= 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(resumo.dashboard.lucroLiquido)}
                      </h3>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Wallet size={20} className="text-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-neutral-50 pt-3">
                    <div className="text-center">
                      <span className="block text-neutral-400 mb-0.5">M.O.</span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.maoDeObra)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">Auto Peças</span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.autoPecas)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">Estoque</span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.estoque)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Prejuízos */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Prejuízos / Consumo
                      </p>
                      <h3 className="text-2xl font-bold text-amber-600 mt-1">
                        {formatCurrency(resumo.dashboard.prejuizos)}
                      </h3>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs border-t border-neutral-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Uso interno na oficina</span>
                    </div>
                  </div>
                </div>

                {/* 5. Estoque Híbrido (2x2 Grid) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                      Estoque Híbrido
                    </p>
                    <div className="bg-indigo-50 p-1.5 rounded-lg">
                      <ListFilter size={16} className="text-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-1">
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block mb-0.5">Compras (Período)</span>
                      <span className="font-bold text-neutral-700 text-sm block">{formatCurrency(resumo.dashboard.estoque.comprasPeriodo)}</span>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider block mb-0.5">Vendas (Período)</span>
                      <span className="font-bold text-neutral-700 text-sm block">{formatCurrency(resumo.dashboard.estoque.vendasPeriodo)}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider block mb-0.5">Lucro (Período)</span>
                      <span className="font-bold text-emerald-700 text-sm block">{formatCurrency(resumo.dashboard.estoque.lucroPeriodo)}</span>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                      <span className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider block mb-0.5">Imobilizado Total</span>
                      <span className="font-bold text-indigo-700 text-sm block">{formatCurrency(resumo.dashboard.estoque.imobilizadoAbsoluto)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Row 2: Evolução Financeira + Origem do Lucro ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Evolução Financeira — travada no ano vigente, agrupamento controlado pelo ReportFilter */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                      <Calendar size={20} className="text-neutral-500" />
                      Evolução Financeira
                    </h3>

                    {/* Toggle Bruto vs Líquido */}
                    <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                      <button
                        type="button"
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          evolView === "bruto"
                            ? "bg-white text-neutral-800 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                        onClick={() => setEvolView("bruto")}
                      >
                        Bruto
                      </button>
                      <button
                        type="button"
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          evolView === "liquido"
                            ? "bg-white text-neutral-800 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                        onClick={() => setEvolView("liquido")}
                      >
                        Líquido
                      </button>
                    </div>
                  </div>

                  <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                    <button type="button" onClick={() => setEvolGroupBy("day")} className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${evolGroupBy === "day" ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>Diário</button>
                    <button type="button" onClick={() => setEvolGroupBy("week")} className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${evolGroupBy === "week" ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>Semanal</button>
                    {(Object.keys(GROUP_BY_LABELS) as GroupByOption[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEvolGroupBy(key)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          evolGroupBy === key
                            ? "bg-white text-neutral-800 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                      >
                        {GROUP_BY_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[300px] min-h-[300px] w-full">
                  {evolLoading ? (
                    <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                      <div className="animate-spin w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full mr-2" />
                      Carregando...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={evolucao}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E5E5E5"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 11 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 11 }}
                          tickFormatter={(val) =>
                            `R$${(val / 1000).toFixed(0)}k`
                          }
                        />
                        <Tooltip
                          formatter={(value: any) =>
                            formatCurrency(Number(value))
                          }
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          cursor={{ fill: "#F3F4F6" }}
                        />
                        <Legend iconType="circle" />

                        {evolView === "bruto" ? (
                          <>
                            <Bar
                              dataKey="receita"
                              name="Receita"
                              fill="#10B981"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="despesa"
                              name="Despesa"
                              fill="#EF4444"
                              radius={[4, 4, 0, 0]}
                            />
                          </>
                        ) : (
                          <>
                            <Bar
                              dataKey="lucroMaoDeObra"
                              name="Mão de Obra"
                              fill="#3B82F6"
                              stackId="a"
                            />
                            <Bar
                              dataKey="lucroEstoque"
                              name="Estoque"
                              fill="#F59E0B"
                              stackId="a"
                            />
                            <Bar
                              dataKey="lucroAutoPecas"
                              name="Auto Peças"
                              fill="#10B981"
                              stackId="a"
                              radius={[4, 4, 0, 0]}
                            />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Composição do Lucro (Pizza) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
                  <ListFilter size={20} className="text-neutral-500" />
                  Origem do Lucro
                </h3>
                <div className="h-[300px] min-h-[300px] w-full flex items-center justify-center">
                  {dataPizza.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataPizza}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dataPizza.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.fill}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-neutral-400">
                      <p>Sem dados de lucro no período</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 3: Performance da Equipe ── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h3 className="text-lg font-bold text-neutral-800">
                  Performance Financeira da Equipe
                </h3>
                <div className="w-56">
                  <Select
                    value={colaboradorFiltroId}
                    onChange={(e) => setColaboradorFiltroId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Todos os Colaboradores</option>
                    {equipe.map((func) => (
                      <option key={func.id} value={func.id}>
                        {func.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2">Colaborador</th>
                      <th className="px-3 py-2 text-right">MO Bruta</th>
                      <th className="px-3 py-2 text-right">Comissão</th>
                      <th className="px-3 py-2 text-right">Lucro MO</th>
                      <th className="px-3 py-2 text-right">Vendas Estoque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {equipeFiltrada.map((func) => (
                      <tr
                        key={func.id}
                        className="hover:bg-neutral-50 transition-colors"
                      >
                        <td className="px-3 py-3 font-medium text-neutral-700">
                          {func.nome}
                        </td>
                        <td className="px-3 py-3 text-right text-neutral-600">
                          {formatCurrency(func.maoDeObraBruta)}
                        </td>
                        <td className="px-3 py-3 text-right text-red-500">
                          -{formatCurrency(func.comissaoPaga)}
                        </td>
                        <td className="px-3 py-3 text-right text-blue-600 font-semibold">
                          {formatCurrency(func.lucroMaoDeObra)}
                        </td>
                        <td className="px-3 py-3 text-right text-amber-600 font-bold bg-amber-50/30 rounded-r-lg">
                          {formatCurrency(func.vendasEstoque)}
                        </td>
                      </tr>
                    ))}
                    {equipeFiltrada.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-8 text-neutral-400"
                        >
                          Nenhum colaborador encontrado no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Row 4: Timeline de Despesas ── */}
            <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex flex-col">
              {/* Cabeçalho com controles */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                  <Filter size={20} className="text-neutral-500" />
                  Timeline de Despesas
                </h3>

                {/* Toggle Categorias vs Subcategorias */}
                <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      timelineView === "categoria"
                        ? "bg-white text-neutral-800 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    onClick={() => setTimelineView("categoria")}
                  >
                    Categorias
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      timelineView === "subcategoria"
                        ? "bg-white text-neutral-800 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    onClick={() => setTimelineView("subcategoria")}
                  >
                    Subcategorias
                  </button>
                </div>
              </div>

              {/* Filtros de Categoria e Subcategoria */}
              <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Filtrar por:
                </span>

                {/* Select de Categoria */}
                <div className="w-52">
                  <Select
                    value={timelineCategoriaId !== undefined ? String(timelineCategoriaId) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTimelineCategoriaId(val ? Number(val) : undefined);
                      setTimelineSubcategoriaId(undefined);
                    }}
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasRaiz.map((cat: any) => (
                      <option
                        key={cat.id_categoria_financeira}
                        value={cat.id_categoria_financeira}
                      >
                        {cat.nome}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Select de Subcategoria — só aparece quando uma categoria está selecionada */}
                {timelineCategoriaId !== undefined &&
                  subcategoriasDaCategoriaAtiva.length > 0 && (
                    <div className="w-52">
                      <Select
                        value={
                          timelineSubcategoriaId !== undefined
                            ? String(timelineSubcategoriaId)
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setTimelineSubcategoriaId(val ? Number(val) : undefined);
                        }}
                      >
                        <option value="">Todas as subcategorias</option>
                        {subcategoriasDaCategoriaAtiva.map((sub: any) => (
                          <option
                            key={sub.id_categoria_financeira}
                            value={sub.id_categoria_financeira}
                          >
                            {sub.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                {/* Botão Limpar */}
                {(timelineCategoriaId !== undefined ||
                  timelineSubcategoriaId !== undefined) && (
                  <button
                    type="button"
                    onClick={handleClearTimelineFilter}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
                  >
                    <X size={12} />
                    Limpar Filtro
                  </button>
                )}

                {/* Indicador de filtro ativo */}
                {timelineCategoriaId !== undefined && (
                  <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-100 font-medium">
                    {timelineSubcategoriaId !== undefined
                      ? "Subcategoria específica"
                      : "Categoria + filhas"}
                  </span>
                )}
              </div>

              {/* Gráfico */}
              <div className="h-[400px] min-h-[400px] w-full flex-shrink-0">
                {timelineLoading ? (
                  <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                    <div className="animate-spin w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full mr-2" />
                    Carregando...
                  </div>
                ) : timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeline}
                      margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#F0F0F0"
                      />
                      <XAxis
                        dataKey="mes"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6B7280", fontSize: 10 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6B7280", fontSize: 10 }}
                        tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: any) =>
                          formatCurrency(Number(value))
                        }
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend iconType="circle" />

                      {timelineKeys.map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          name={key}
                          stackId="a"
                          fill={COLORS[index % COLORS.length]}
                          radius={
                            index === timelineKeys.length - 1
                              ? [4, 4, 0, 0]
                              : [0, 0, 0, 0]
                          }
                          barSize={24}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                    Sem dados de despesas no período selecionado.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};
