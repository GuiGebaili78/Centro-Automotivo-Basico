import { useState, useEffect } from "react";
import { PageLayout } from "../components/ui/PageLayout";
import { ReportFilter } from "../components/relatorios/ReportFilter";
import type {
  ResumoFinanceiro,
  PerformanceFuncionario,
  EvolucaoMensal,
  EvolucaoDespesa,
} from "../types/relatorios.types";
import { RelatoriosService } from "../services/relatorios.service";
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
  DollarSign,
  Wallet,
  Calendar,
  ListFilter,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export const RelatoriosPage = () => {
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [equipe, setEquipe] = useState<PerformanceFuncionario[]>([]);
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([]);
  const [evolucaoDespesas, setEvolucaoDespesas] = useState<EvolucaoDespesa[]>(
    [],
  );

  const [groupBy, setGroupBy] = useState<"month" | "quarter">("month");

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

      // Fetch evolution with current groupBy
      const evolucaoData = await RelatoriosService.getEvolucaoMensal(groupBy);
      setEvolucao(evolucaoData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  };

  // Effect to refresh Evolution only when groupBy changes
  useEffect(() => {
    const refreshEvolucao = async () => {
      try {
        const data = await RelatoriosService.getEvolucaoMensal(groupBy);
        setEvolucao(data);
      } catch (error) {
        console.error(error);
      }
    };
    refreshEvolucao();
  }, [groupBy]);

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

  const prepareLucroData = () => {
    if (!resumo) return [];
    return [
      { name: "M.O.", value: resumo.liquida.maoDeObra || 0 },
      { name: "Peças Fora", value: resumo.liquida.pecasFora || 0 },
      { name: "Estoque", value: resumo.liquida.pecasEstoque || 0 },
    ].filter((d) => d.value > 0);
  };

  const dataPizza = prepareLucroData();

  return (
    <PageLayout
      title="Relatórios Gerenciais"
      subtitle="Análise financeira e de performance 360º"
    >
      <div className="space-y-6 relative">
        {/* Sticky Filter */}
        <div className="sticky top-[72px] z-30 bg-slate-50/95 backdrop-blur-md pb-4 pt-2 border-b border-neutral-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6 transition-all duration-300">
          <ReportFilter onFilterChange={fetchReports} />
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Processando inteligência de dados...
          </div>
        ) : (
          <>
            {/* KPI Cards Redesigned */}
            {resumo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Receita Bruta */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full">
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
                  {/* Mini Grid */}
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
                        Peças Estq
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.pecasEstoque)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Peças Fora
                      </span>
                      <span className="font-semibold text-neutral-600 truncate">
                        {formatCurrency(resumo.bruta.pecasFora)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Lucro Líquido */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Lucro Líquido
                      </p>
                      <h3
                        className={`text-2xl font-bold mt-1 ${resumo.indicadores.lucroLiquido >= 0 ? "text-blue-600" : "text-red-600"}`}
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
                  {/* Mini Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-neutral-50 pt-3">
                    <div className="text-center">
                      <span className="block text-neutral-400 mb-0.5">
                        M.O:
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.maoDeObra)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        P. Fora:
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.pecasFora)}
                      </span>
                    </div>
                    <div className="text-center border-l border-neutral-100">
                      <span className="block text-neutral-400 mb-0.5">
                        Estoque:
                      </span>
                      <span className="font-bold text-blue-600 truncate">
                        {formatCurrency(resumo.liquida.pecasEstoque)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Despesas */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Despesas Totais
                      </p>
                      <h3 className="text-2xl font-bold text-red-600 mt-1">
                        - {formatCurrency(resumo.custos.total)}
                      </h3>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                      <TrendingDown size={20} className="text-red-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs border-t border-neutral-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">
                        Operacional (Fixas):
                      </span>
                      <strong className="text-neutral-700">
                        {formatCurrency(
                          resumo.custos.contas + resumo.custos.equipe,
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">CMV (Peças):</span>
                      <strong className="text-neutral-700">
                        {formatCurrency(
                          resumo.custos.pecasEstoque + resumo.custos.pecasFora,
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Ponto de Equilíbrio */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                        Ponto de Equilíbrio
                      </p>
                      <h3 className="text-2xl font-bold text-amber-600 mt-1">
                        {formatCurrency(resumo.indicadores.pontoEquilibrio)}
                      </h3>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <DollarSign size={20} className="text-amber-500" />
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 mt-auto pt-3 border-t border-neutral-50">
                    Meta mínima de faturamento para não ter prejuízo
                    operacional.
                  </div>
                </div>
              </div>
            )}

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Evolução Temporal (Receita x Despesa) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                    <Calendar size={20} className="text-neutral-500" />
                    Evolução Financeira
                  </h3>
                  <div className="flex bg-neutral-100 p-1 rounded-lg">
                    <button
                      onClick={() => setGroupBy("month")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${groupBy === "month" ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                    >
                      Mensal
                    </button>
                    <button
                      onClick={() => setGroupBy("quarter")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${groupBy === "quarter" ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                    >
                      Trimestral
                    </button>
                  </div>
                </div>

                <div className="h-[320px] w-full">
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
                        tickFormatter={(val) => `R$${val / 1000}k`}
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
                </div>
              </div>

              {/* Composição do Lucro (Pizza) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
                  <ListFilter size={20} className="text-neutral-500" />
                  Origem do Lucro
                </h3>
                <div className="h-[320px] w-full flex flex-col items-center justify-center relative">
                  {resumo && dataPizza.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataPizza}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
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

            {/* Row 3: Performance, Expenses & Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance da Equipe Detalhada */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-800 mb-6">
                  Performance Financeira da Equipe
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2">Colaborador</th>
                        <th className="px-3 py-2 text-right">M.O Bruta</th>
                        <th className="px-3 py-2 text-right">Comissão</th>
                        <th className="px-3 py-2 text-right">Lucro M.O</th>
                        <th className="px-3 py-2 text-right">Lucro Total</th>
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
                          <td className="px-3 py-3 text-right text-emerald-600 font-bold bg-emerald-50/50 rounded-r-lg">
                            {formatCurrency(func.lucroTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Evolução das Despesas (Timeline + Lista) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex flex-col h-full">
                <h3 className="text-lg font-bold text-neutral-800 mb-6">
                  Timeline de Despesas (Realizado vs Previsto)
                </h3>

                {/* Timeline Chart */}
                <div className="h-[200px] w-full mb-6">
                  {resumo && resumo.evolucaoDespesasTemporal && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={resumo.evolucaoDespesasTemporal}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f0f0f0"
                        />
                        <XAxis
                          dataKey="mes"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis hide />
                        <Tooltip
                          formatter={(value: any, name: string) => [
                            formatCurrency(Number(value)),
                            name === "realizado" ? "Realizado" : "Previsto",
                          ]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="realizado"
                          name="Realizado"
                          fill="#4B5563"
                          radius={[4, 4, 0, 0]}
                          barSize={30}
                        />
                        <Bar
                          dataKey="previsto"
                          name="Previsto/A Pagar"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          opacity={0.6}
                          barSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wider">
                  Detalhamento por Categoria
                </h4>
                <div className="overflow-y-auto flex-1 h-[250px] border-t border-neutral-100 pt-2">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-neutral-400 uppercase bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Categoria</th>
                        <th className="px-4 py-2 text-right">Atual</th>
                        <th className="px-4 py-2 text-right">Anterior</th>
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
                            <td className="px-4 py-3 text-right text-neutral-700 font-semibold">
                              {formatCurrency(cat.valorAtual)}
                            </td>
                            <td className="px-4 py-3 text-right text-neutral-400">
                              {formatCurrency(cat.valorAnterior)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-bold text-xs ${isIncrease ? "text-red-500" : isDecrease ? "text-emerald-500" : "text-neutral-400"}`}
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
                      {(!evolucaoDespesas || evolucaoDespesas.length === 0) && (
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
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};
