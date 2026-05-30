import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subYears,
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
} from "lucide-react";
import { FilterButton, Input, Select } from "../components/ui";

// ─── Tipos locais ──────────────────────────────────────────────────────────────
type GroupByOption = "month" | "quarter" | "semester" | "year";

const GROUP_BY_LABELS: Record<GroupByOption, string> = {
  month: "Mensal",
  quarter: "Trimestral",
  semester: "Semestral",
  year: "Anual",
};

// ─── Componente principal ──────────────────────────────────────────────────────
export const RelatoriosPage = () => {
  // Estado global (filtro do topo)
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [equipe, setEquipe] = useState<PerformanceFuncionario[]>([]);
  const [evolucaoDespesas, setEvolucaoDespesas] = useState<EvolucaoDespesa[]>(
    [],
  );
  const [operadorasStats, setOperadorasStats] = useState<OperadoraStats[]>([]);
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<any[]>([]);

  // Datas globais do filtro superior para sincronizar Timeline de Despesas
  const [globalDates, setGlobalDates] = useState({ startDate: "", endDate: "" });

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

  // Estado localizado — Evolução Financeira
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([]);
  const [evolGroupBy, setEvolGroupBy] = useState<GroupByOption>("month");
  const [evolView, setEvolView] = useState<"bruto" | "liquido">("bruto");
  const [evolStart, setEvolStart] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [evolEnd, setEvolEnd] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [evolLoading, setEvolLoading] = useState(false);

  // Estado localizado — Timeline de Despesas (dinâmica com datas globais)
  const [timeline, setTimeline] = useState<EvolucaoDespesaTemporal[]>([]);
  const [timelineKeys, setTimelineKeys] = useState<string[]>([]);
  const [timelineView, setTimelineView] = useState<"categoria" | "subcategoria">("categoria");
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Cores do Pie chart e Timeline dinâmico
  const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];

  // ── Fetch principal (filtro global) ──────────────────────────────────────────
  const fetchReports = async (startDate: string, endDate: string) => {
    setLoading(true);
    setGlobalDates({ startDate, endDate });
    try {
      const [resumoData, equipeData, evolucaoDespesasData, operadorasData] = await Promise.all([
        RelatoriosService.getResumoFinanceiro(startDate, endDate),
        RelatoriosService.getPerformanceEquipe(startDate, endDate),
        RelatoriosService.getEvolucaoDespesas(startDate, endDate),
        RelatoriosService.getOperadorasCartao(startDate, endDate),
      ]);
      setResumo(resumoData);
      setEquipe(equipeData);
      setEvolucaoDespesas(evolucaoDespesasData);
      setOperadorasStats(operadorasData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  };

  // ── Evolução Financeira isolada ───────────────────────────────────────────────
  useEffect(() => {
    const fetchEvolucao = async () => {
      setEvolLoading(true);
      try {
        const data = await RelatoriosService.getEvolucaoMensal(
          evolStart,
          evolEnd,
          evolGroupBy
        );
        setEvolucao(data);
      } catch (error) {
        console.error(error);
      } finally {
        setEvolLoading(false);
      }
    };
    fetchEvolucao();
  }, [evolGroupBy, evolStart, evolEnd]);

  // ── handleEvolucaoPreset ───────────────────────────────────────────────
  const handleEvolucaoPreset = (preset: GroupByOption) => {
    const today = new Date();
    let newStart: Date;
    let newEnd: Date;

    switch (preset) {
      case "month":
        newStart = startOfMonth(subMonths(today, 11));
        newEnd = endOfMonth(today);
        break;
      case "quarter":
        newStart = startOfMonth(subMonths(today, 11));
        newEnd = endOfMonth(today);
        break;
      case "semester":
        newStart = startOfYear(subYears(today, 1));
        newEnd = endOfYear(today);
        break;
      case "year":
        newStart = startOfYear(subYears(today, 2));
        newEnd = endOfYear(today);
        break;
    }

    setEvolGroupBy(preset);
    setEvolStart(format(newStart, "yyyy-MM-dd"));
    setEvolEnd(format(newEnd, "yyyy-MM-dd"));
  };

  // ── Timeline de Despesas (dinâmica e pivotada com filtro global de datas) ─────
  useEffect(() => {
    if (!globalDates.startDate || !globalDates.endDate) return;

    const fetchTimeline = async () => {
      setTimelineLoading(true);
      try {
        const response = await RelatoriosService.getEvolucaoDespesasTemporal(
          globalDates.startDate,
          globalDates.endDate,
          timelineView
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
  }, [globalDates.startDate, globalDates.endDate, timelineView]);

  // ── Dados do Pie Chart ────────────────────────────────────────────────────────
  const dataPizza = resumo
    ? [
        { name: "Mão de Obra", value: resumo.liquida.maoDeObra || 0 },
        { name: "Estoque", value: resumo.liquida.estoque || 0 },
        { name: "Auto Peças", value: resumo.liquida.autoPecas || 0 },
      ].filter((d) => d.value > 0)
    : [];

  //

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Relatórios Gerenciais"
      subtitle="Análise financeira e de performance 360º"
    >
      <div className="space-y-6 relative">
        {/* ── Sticky Filter Global ── */}
        <div className="sticky top-[72px] z-30 bg-slate-50/95 backdrop-blur-md pb-4 pt-2 border-b border-neutral-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6 transition-all duration-300">
          <ReportFilter onFilterChange={fetchReports} />
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            Processando inteligência de dados...
          </div>
        ) : (
          <>
            

            {/* ── Row 1: 4 KPI Cards ── */}
            {resumo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Receita Bruta */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Receita Bruta
                      </p>
                      <h3 className="text-2xl font-bold text-neutral-800 mt-1">
                        {formatCurrency(resumo.bruta.total)}
                      </h3>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <TrendingUp size={20} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-neutral-50 pt-3">
                    <div className="text-center">
                      <span className="block text-neutral-400 mb-0.5">
                        M.O.
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.maoDeObra)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Auto Peças
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.autoPecas)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Estoque
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.estoque)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Lucro Líquido */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Lucro Líquido
                      </p>
                      <h3
                        className={`text-2xl font-bold mt-1 ${
                          resumo.indicadores.lucroLiquido >= 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(resumo.indicadores.lucroLiquido)}
                      </h3>
                      <span className="text-sm font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 mt-1 inline-block">
                        {(
                          (resumo.indicadores.lucroLiquido /
                            (resumo.bruta.total || 1)) *
                          100
                        ).toFixed(1)}
                        % Margem
                      </span>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Wallet size={20} className="text-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-neutral-50 pt-3">
                    <div className="text-center">
                      <span className="block text-neutral-400 mb-0.5">
                        M.O.
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.maoDeObra)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Auto Peças
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.autoPecas)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Estoque
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.estoque)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Despesas Totais */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Despesas Totais
                      </p>
                      <h3 className="text-2xl font-bold text-red-600 mt-1">
                        - {formatCurrency(resumo.despesas.total)}
                      </h3>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                      <TrendingDown size={20} className="text-red-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs border-t border-neutral-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Operacional:</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(resumo.despesas.oficina)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Auto Peças:</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(resumo.despesas.autoPecas)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Prejuízos */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Prejuízos
                      </p>
                      <h3 className="text-2xl font-bold text-amber-600 mt-1">
                        {formatCurrency(resumo.prejuizos?.total || 0)}
                      </h3>
                      <span className="text-xs text-neutral-400 block mt-0.5">
                        consumo interno
                      </span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs border-t border-neutral-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Estoque:</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(resumo.prejuizos?.estoque || 0)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Auto Peças:</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(resumo.prejuizos?.autoPecas || 0)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Row 2: Evolução Financeira (isolada) + Origem do Lucro ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Evolução Financeira — controles locais independentes */}
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

                  {/* GroupBy pills */}
                  <div className="flex bg-neutral-100 p-1 rounded-lg gap-1">
                    {(Object.keys(GROUP_BY_LABELS) as GroupByOption[]).map(
                      (key) => (
                        <FilterButton
                          key={key}
                          active={evolGroupBy === key}
                          onClick={() => handleEvolucaoPreset(key)}
                        >
                          {GROUP_BY_LABELS[key]}
                        </FilterButton>
                      ),
                    )}
                  </div>

                  {/* Datas locais */}
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="w-28">
                      <Input
                        type="date"
                        value={evolStart}
                        onChange={(e) => setEvolStart(e.target.value)}
                        className="!py-1 !px-2 !text-xs !rounded-lg bg-white"
                      />
                    </div>
                    <span className="text-neutral-300">→</span>
                    <div className="w-28">
                      <Input
                        type="date"
                        value={evolEnd}
                        onChange={(e) => setEvolEnd(e.target.value)}
                        className="!py-1 !px-2 !text-xs !rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-[300px] w-full">
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
                <div className="h-[300px] w-full flex items-center justify-center">
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
                          {dataPizza.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
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

            {/* ── Row 3: Performance da Equipe (largura total) ── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-800 mb-6">
                Performance Financeira da Equipe
              </h3>
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
                    {equipe.map((func) => (
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
                    {equipe.length === 0 && (
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

            {/* ── Row 4: Timeline de Despesas — largura total ── */}
            <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex flex-col">
              {/* Cabeçalho com toggle de categorias/subcategorias */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

              {/* Gráfico de barras da timeline */}
              <div
                className="w-full flex-shrink-0"
                style={{ width: "100%", height: 400 }}
              >
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
                        formatter={(value: any) => formatCurrency(Number(value))}
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
                          radius={index === timelineKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
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
