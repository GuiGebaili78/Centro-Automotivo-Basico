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
} from "lucide-react";

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

  // Estado localizado — Evolução Financeira
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([]);
  const [evolGroupBy, setEvolGroupBy] = useState<GroupByOption>("month");
  const [evolStart, setEvolStart] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [evolEnd, setEvolEnd] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [evolLoading, setEvolLoading] = useState(false);

  // Estado localizado — Timeline de Despesas
  const [timelineCategoria, setTimelineCategoria] = useState("");
  const [timeline, setTimeline] = useState<EvolucaoDespesaTemporal[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Cores do Pie chart
  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

  // ── Fetch principal (filtro global) ──────────────────────────────────────────
  const fetchReports = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const [resumoData, equipeData, evolucaoDespesasData] = await Promise.all([
        RelatoriosService.getResumoFinanceiro(startDate, endDate),
        RelatoriosService.getPerformanceEquipe(startDate, endDate),
        RelatoriosService.getEvolucaoDespesas(startDate, endDate),
      ]);
      setResumo(resumoData);
      setEquipe(equipeData);
      setEvolucaoDespesas(evolucaoDespesasData);
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
        const data = await FinanceiroService.getEvolution({
          startDate: evolStart,
          endDate: evolEnd,
          groupBy: evolGroupBy as "day" | "month",
        });
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
  // Ao clicar nos bottons de agrupamento, atualiza TANTO o groupBy QUANTO
  // as datas para um intervalo lógico correspondente, de forma automática.
  const handleEvolucaoPreset = (preset: GroupByOption) => {
    const today = new Date();
    let newStart: Date;
    let newEnd: Date;

    switch (preset) {
      case "month":
        // Últimos 12 meses
        newStart = startOfMonth(subMonths(today, 11));
        newEnd = endOfMonth(today);
        break;
      case "quarter":
        // Último 1 ano completo (4 trimestres)
        newStart = startOfMonth(subMonths(today, 11));
        newEnd = endOfMonth(today);
        break;
      case "semester":
        // Últimos 2 anos (4 semestres)
        newStart = startOfYear(subYears(today, 1));
        newEnd = endOfYear(today);
        break;
      case "year":
        // Últimos 3 anos
        newStart = startOfYear(subYears(today, 2));
        newEnd = endOfYear(today);
        break;
    }

    setEvolGroupBy(preset);
    setEvolStart(format(newStart, "yyyy-MM-dd"));
    setEvolEnd(format(newEnd, "yyyy-MM-dd"));
  };

  // ── Timeline de Despesas (10 meses) ──────────────────────────────────────────
  useEffect(() => {
    const fetchTimeline = async () => {
      setTimelineLoading(true);
      try {
        const data = await RelatoriosService.getEvolucaoDespesasTemporal(
          timelineCategoria || undefined,
        );
        setTimeline(data);
      } catch (error) {
        console.error(error);
      } finally {
        setTimelineLoading(false);
      }
    };
    fetchTimeline();
  }, [timelineCategoria]);

  // ── Dados do Pie Chart ────────────────────────────────────────────────────────
  const dataPizza = resumo
    ? [
        { name: "M.O.", value: resumo.liquida.maoDeObra || 0 },
        { name: "Estoque", value: resumo.liquida.pecasEstoque || 0 },
        { name: "Peças/Terceiros", value: resumo.liquida.pecasTerceiros || 0 },
      ].filter((d) => d.value > 0)
    : [];

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
                        Peças/Terc.
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.pecasTerceiros)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Estoque
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.pecasEstoque)}
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 mt-1 inline-block">
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
                        Peças/Terc.
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.pecasTerceiros)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Estoque
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.pecasEstoque)}
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
                        {formatCurrency(resumo.despesas.operacional)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Fornecedor:</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(resumo.despesas.fornecedor)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Média Mensal */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Média Mensal
                      </p>
                      <h3 className="text-2xl font-bold text-violet-600 mt-1">
                        {formatCurrency(resumo.medias.receitaBruta)}
                      </h3>
                      <span className="text-[10px] text-neutral-400">
                        receita/mês
                      </span>
                    </div>
                    <div className="bg-violet-50 p-2 rounded-lg">
                      <BarChart2 size={20} className="text-violet-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs border-t border-neutral-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Lucro Líq.:</span>
                      <strong
                        className={
                          resumo.medias.lucroLiquido >= 0
                            ? "text-blue-600"
                            : "text-red-500"
                        }
                      >
                        {formatCurrency(resumo.medias.lucroLiquido)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Despesas:</span>
                      <strong className="text-red-500">
                        {formatCurrency(resumo.medias.despesasTotais)}
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
                  <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                    <Calendar size={20} className="text-neutral-500" />
                    Evolução Financeira
                  </h3>

                  {/* GroupBy pills */}
                  <div className="flex bg-neutral-100 p-1 rounded-lg">
                    {(Object.keys(GROUP_BY_LABELS) as GroupByOption[]).map(
                      (key) => (
                        <button
                          key={key}
                          onClick={() => handleEvolucaoPreset(key)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            evolGroupBy === key
                              ? "bg-white text-neutral-800 shadow-sm"
                              : "text-neutral-500 hover:text-neutral-700"
                          }`}
                        >
                          {GROUP_BY_LABELS[key]}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Datas locais */}
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <input
                      type="date"
                      value={evolStart}
                      onChange={(e) => setEvolStart(e.target.value)}
                      className="border border-neutral-200 rounded-lg px-2 py-1 text-xs text-neutral-700 bg-white outline-none focus:ring-1 focus:ring-primary-300"
                    />
                    <span className="text-neutral-300">→</span>
                    <input
                      type="date"
                      value={evolEnd}
                      onChange={(e) => setEvolEnd(e.target.value)}
                      className="border border-neutral-200 rounded-lg px-2 py-1 text-xs text-neutral-700 bg-white outline-none focus:ring-1 focus:ring-primary-300"
                    />
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
              {/* Cabeçalho com select de categoria */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                  <Filter size={20} className="text-neutral-500" />
                  Timeline de Despesas
                  <span className="text-xs font-normal text-neutral-400">
                    (6 meses passados + 4 futuros)
                  </span>
                </h3>
                <select
                  value={timelineCategoria}
                  onChange={(e) => setTimelineCategoria(e.target.value)}
                  className="text-xs border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-700 bg-white outline-none focus:ring-1 focus:ring-primary-300 cursor-pointer"
                >
                  <option value="">Todas as Categorias</option>
                  {resumo?.despesasPorCategoria.map((cat) => (
                    <option key={cat.categoria} value={cat.categoria}>
                      {cat.categoria}
                    </option>
                  ))}
                </select>
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
                        formatter={(value: any, name?: string) => [
                          formatCurrency(Number(value)),
                          name === "realizado"
                            ? "Realizado"
                            : "Previsto/A Pagar",
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend iconType="circle" />
                      {/* Realizado: vermelho escuro */}
                      <Bar
                        dataKey="realizado"
                        name="Realizado"
                        fill="#991B1B"
                        radius={[4, 4, 0, 0]}
                        barSize={22}
                      />
                      {/* Previsto: vermelho claro/translúcido */}
                      <Bar
                        dataKey="previsto"
                        name="Previsto/A Pagar"
                        fill="#FCA5A5"
                        radius={[4, 4, 0, 0]}
                        barSize={22}
                        opacity={0.85}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                    Sem dados de despesas na janela de 10 meses.
                  </div>
                )}
              </div>

              {/* Legenda de cores */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-50 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#991B1B]" />
                  Realizado (pago)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#FCA5A5]" />
                  Previsto (a pagar)
                </span>
              </div>
            </div>

            {/* ── Row 4: Comparativo de Despesas por Categoria ── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-800 mb-4">
                Comparativo de Despesas por Categoria
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-neutral-400 uppercase bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Categoria</th>
                      <th className="px-4 py-2 text-right">Anterior</th>
                      <th className="px-4 py-2 text-right">Atual</th>
                      <th className="px-4 py-2 text-right">Var %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {evolucaoDespesas.map((cat, idx) => {
                      const isIncrease = cat.variacaoPercentual > 0;
                      const isDecrease = cat.variacaoPercentual < 0;
                      return (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 font-medium text-neutral-700">
                            {cat.categoria}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-400">
                            {formatCurrency(cat.valorAnterior)}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-700 font-semibold">
                            {formatCurrency(cat.valorAtual)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold text-xs ${
                              isIncrease
                                ? "text-red-500"
                                : isDecrease
                                  ? "text-emerald-500"
                                  : "text-neutral-400"
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {isIncrease && <ArrowUpRight size={14} />}
                              {isDecrease && <ArrowDownRight size={14} />}
                              {Math.abs(cat.variacaoPercentual).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {evolucaoDespesas.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-8 text-neutral-400"
                        >
                          Dados insuficientes para comparação.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};
