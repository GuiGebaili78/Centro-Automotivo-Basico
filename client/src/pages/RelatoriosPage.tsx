import { useState } from "react";
import { PageLayout } from "../components/ui/PageLayout";
import { ReportFilter } from "../components/relatorios/ReportFilter";
import type {
  ResumoFinanceiro,
  PerformanceFuncionario,
  OperadoraStats,
  EvolucaoMensal,
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
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";

export const RelatoriosPage = () => {
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [equipe, setEquipe] = useState<PerformanceFuncionario[]>([]);
  const [operadoras, setOperadoras] = useState<OperadoraStats[]>([]);
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([]);

  const fetchReports = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const [resumoData, equipeData, operadorasData] = await Promise.all([
        RelatoriosService.getResumoFinanceiro(startDate, endDate),
        RelatoriosService.getPerformanceEquipe(startDate, endDate),
        RelatoriosService.getOperadorasCartao(startDate, endDate),
      ]);

      setResumo(resumoData);
      setEquipe(equipeData);
      setOperadoras(operadorasData);

      const evolucaoData = await RelatoriosService.getEvolucaoMensal();
      setEvolucao(evolucaoData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const preparePieData = () => {
    if (!resumo) return [];
    return [
      { name: "Mão de Obra", value: resumo.bruta.maoDeObra },
      { name: "Peças (Estoque)", value: resumo.bruta.pecasEstoque },
      { name: "Peças (Externas)", value: resumo.bruta.pecasFora },
    ];
  };

  return (
    <PageLayout
      title="Relatórios Gerenciais"
      subtitle="Análise financeira e de performance detalhada"
    >
      <div className="space-y-6">
        <ReportFilter onFilterChange={fetchReports} />

        {loading ? (
          <div className="text-center py-20 text-neutral-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Carregando indicadores...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {resumo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Receita Bruta */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp size={48} className="text-emerald-600" />
                  </div>
                  <div className="relative">
                    <p className="text-sm font-medium text-neutral-500">
                      Receita Bruta
                    </p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                      {formatCurrency(resumo.bruta.total)}
                    </h3>
                    <div className="flex gap-2 text-xs mt-2 text-neutral-400">
                      <span className="text-green-600 font-medium bg-green-50 px-1.5 rounded">
                        {(
                          (resumo.bruta.maoDeObra / (resumo.bruta.total || 1)) *
                          100
                        ).toFixed(0)}
                        % Svcs
                      </span>
                      <span className="text-blue-600 font-medium bg-blue-50 px-1.5 rounded">
                        {(
                          ((resumo.bruta.pecasFora +
                            resumo.bruta.pecasEstoque) /
                            (resumo.bruta.total || 1)) *
                          100
                        ).toFixed(0)}
                        % Peças
                      </span>
                    </div>
                  </div>
                </div>

                {/* Despesas Totais */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingDown size={48} className="text-red-600" />
                  </div>
                  <div className="relative">
                    <p className="text-sm font-medium text-neutral-500">
                      Despesas Totais
                    </p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">
                      - {formatCurrency(resumo.custos.total)}
                    </h3>
                    <div className="flex gap-2 text-xs mt-2 text-neutral-400">
                      <span className="text-neutral-500">
                        Fixas:{" "}
                        {formatCurrency(
                          resumo.custos.equipe + resumo.custos.contas,
                        )}
                      </span>
                      <span className="text-neutral-500">
                        Peças:{" "}
                        {formatCurrency(
                          resumo.custos.pecasEstoque + resumo.custos.pecasFora,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lucro Líquido */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Wallet
                      size={48}
                      className={
                        resumo.indicadores.lucroLiquido >= 0
                          ? "text-blue-600"
                          : "text-red-600"
                      }
                    />
                  </div>
                  <div className="relative">
                    <p className="text-sm font-medium text-neutral-500">
                      Lucro Líquido
                    </p>
                    <h3
                      className={`text-2xl font-bold mt-1 ${resumo.indicadores.lucroLiquido >= 0 ? "text-blue-600" : "text-red-600"}`}
                    >
                      {formatCurrency(resumo.indicadores.lucroLiquido)}
                    </h3>
                    <div className="text-xs mt-2 text-neutral-400">
                      Margem:{" "}
                      {(
                        (resumo.indicadores.lucroLiquido /
                          (resumo.bruta.total || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>

                {/* Ponto de Equilíbrio */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <DollarSign size={48} className="text-amber-600" />
                  </div>
                  <div className="relative">
                    <p className="text-sm font-medium text-neutral-500">
                      Ponto de Equilíbrio
                    </p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-1">
                      {formatCurrency(resumo.indicadores.pontoEquilibrio)}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-2">
                      Custos Operacionais
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evolução Faturamento */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 col-span-1 lg:col-span-2">
                <h3 className="text-lg font-bold text-neutral-800 mb-6">
                  Evolução Anual (Faturamento)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolucao}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E5E5E5"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6B7280", fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6B7280", fontSize: 12 }}
                        tickFormatter={(value) => `R$${value / 1000}k`}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          formatCurrency(value || 0)
                        }
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="receita"
                        name="Receita"
                        fill="#0EA5E9"
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

              {/* Composição Receita Pie */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-800 mb-6">
                  Composição da Receita
                </h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                  {resumo && resumo.bruta.total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {preparePieData().map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) =>
                            formatCurrency(value || 0)
                          }
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-neutral-400 text-sm">
                      Sem dados para o período
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Equipe */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <h3 className="text-lg font-bold text-neutral-800 mb-6">
                  Performance da Equipe
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={equipe}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#E5E5E5"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={100}
                        tick={{
                          fill: "#374151",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          formatCurrency(value || 0)
                        }
                        cursor={{ fill: "transparent" }}
                      />
                      <Bar
                        dataKey="totalProduzido"
                        name="Produção (R$)"
                        fill="#10B981"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Operadoras Impacto */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 col-span-1 lg:col-span-2">
                <h3 className="text-lg font-bold text-neutral-800 mb-4">
                  Taxas de Cartão por Operadora
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Operadora</th>
                        <th className="px-6 py-3 text-right">Transações</th>
                        <th className="px-6 py-3 text-right">Total Bruto</th>
                        <th className="px-6 py-3 text-right text-red-600">
                          Taxas
                        </th>
                        <th className="px-6 py-3 text-right text-green-600">
                          Líquido
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {operadoras.map((op, idx) => (
                        <tr
                          key={idx}
                          className="bg-white border-b hover:bg-neutral-50"
                        >
                          <td className="px-6 py-4 font-medium text-neutral-900">
                            {op.nome}
                          </td>
                          <td className="px-6 py-4 text-right">{op.count}</td>
                          <td className="px-6 py-4 text-right">
                            {formatCurrency(op.totalBruto)}
                          </td>
                          <td className="px-6 py-4 text-right text-red-600 font-medium">
                            {formatCurrency(op.totalTaxas)}
                          </td>
                          <td className="px-6 py-4 text-right text-green-600 font-bold">
                            {formatCurrency(op.totalLiquido)}
                          </td>
                        </tr>
                      ))}
                      {operadoras.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-8 text-center text-neutral-400"
                          >
                            Nenhuma transação de cartão no período.
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
