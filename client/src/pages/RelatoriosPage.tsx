import { useState, useEffect } from "react";
import {
  Card,
  Grid,
  Title,
  Text,
  Metric,
  Flex,
  BarChart,
  DonutChart,
  BarList,
  Badge,
} from "@tremor/react";
import { api } from "../services/api";
import {
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency"; // If available, or use custom or reuse GlobalFilter logic
// Assuming GlobalFilter or basic date inputs. Let's use simple date inputs for now to be safe,
// or reuse the logic found in previous file if it was custom.
// The previous file used "dateRange" state but no visible import for a specific date picker component other than potentially GlobalFilter.
// I will implement a simple header with date inputs for reliability.

interface DashboardData {
  kpis: {
    faturamentoBruto: number;
    faturamentoMaoDeObra: number;
    faturamentoPecas: number;
    lucroReal: number;
    pontoEquilibrio: number;
    totalDespesas: number;
    custoPecas: number;
  };
  charts: {
    performanceMecanicos: { name: string; value: number }[];
    servicosMaisVendidos: { name: string; value: number }[];
    categoriasDespesa: { name: string; value: number }[];
  };
}

export function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  // Default to current month
  const today = new Date();
  const [startDate, setStartDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0],
  );

  useEffect(() => {
    loadDashboard();
  }, [startDate, endDate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/relatorios/dashboard", {
        params: { startDate, endDate },
      });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, charts } = data;

  // Helpers for charts
  const revenueBreakdown = [
    { name: "Mão de Obra", value: kpis.faturamentoMaoDeObra },
    { name: "Peças", value: kpis.faturamentoPecas },
  ];

  const profitMargin =
    kpis.faturamentoBruto > 0
      ? ((kpis.lucroReal / kpis.faturamentoBruto) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title>Dashboard Financeiro & BI</Title>
          <Text>Visão geral de performance, faturamento e custos.</Text>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <Calendar size={18} className="text-slate-500 ml-2" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none text-sm font-medium text-slate-700 focus:ring-0"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none text-sm font-medium text-slate-700 focus:ring-0"
          />
        </div>
      </div>

      {/* KPI Grid */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
        {/* Faturamento Bruto */}
        <Card decoration="top" decorationColor="blue">
          <Flex justifyContent="start" className="space-x-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <Text>Faturamento Bruto</Text>
              <Metric>{formatCurrency(kpis.faturamentoBruto)}</Metric>
            </div>
          </Flex>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Mão de Obra:</span>
            <span className="font-medium text-slate-700">
              {formatCurrency(kpis.faturamentoMaoDeObra)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-500">Peças:</span>
            <span className="font-medium text-slate-700">
              {formatCurrency(kpis.faturamentoPecas)}
            </span>
          </div>
        </Card>

        {/* Lucro Real */}
        <Card decoration="top" decorationColor="emerald">
          <Flex justifyContent="start" className="space-x-4">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
            <div>
              <Text>Lucro Real (Estimado)</Text>
              <Metric>{formatCurrency(kpis.lucroReal)}</Metric>
            </div>
          </Flex>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <Badge color="emerald" size="xs">
              Margem {profitMargin}%
            </Badge>
            <Text className="text-xs">(Após custos e despesas)</Text>
          </div>
        </Card>

        {/* Custos Totais */}
        <Card decoration="top" decorationColor="red">
          <Flex justifyContent="start" className="space-x-4">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <Text>Custos & Despesas</Text>
              <Metric>
                {formatCurrency(kpis.custoPecas + kpis.totalDespesas)}
              </Metric>
            </div>
          </Flex>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Peças (Custo):</span>
            <span className="font-medium text-slate-700">
              {formatCurrency(kpis.custoPecas)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-500">Despesas Fixas:</span>
            <span className="font-medium text-slate-700">
              {formatCurrency(kpis.totalDespesas)}
            </span>
          </div>
        </Card>

        {/* Ponto de Equilíbrio */}
        <Card decoration="top" decorationColor="amber">
          <Flex justifyContent="start" className="space-x-4">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Target className="text-amber-600" size={24} />
            </div>
            <div>
              <Text>Despesas Fixas (Mês)</Text>
              <Metric>{formatCurrency(kpis.pontoEquilibrio)}</Metric>
            </div>
          </Flex>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Text className="text-xs">
              Break-even Diário:{" "}
              <b>{formatCurrency(kpis.pontoEquilibrio / 30)}</b>
            </Text>
          </div>
        </Card>
      </Grid>

      {/* Main Charts Section */}
      <Grid numItems={1} numItemsLg={3} className="gap-6">
        {/* Performance Mecânicos */}
        <Card className="col-span-1 lg:col-span-2">
          <Title>Performance de Mecânicos (Faturamento Mão de Obra)</Title>
          <BarChart
            className="mt-6"
            data={charts.performanceMecanicos}
            index="name"
            categories={["value"]}
            colors={["blue"]}
            valueFormatter={(number) => formatCurrency(number)}
            yAxisWidth={80}
            showLegend={false}
          />
        </Card>

        {/* Revenue Breakdown Donut */}
        <Card className="col-span-1">
          <Title>Composição da Receita</Title>
          <DonutChart
            className="mt-6"
            data={revenueBreakdown}
            category="value"
            index="name"
            valueFormatter={(number) => formatCurrency(number)}
            colors={["cyan", "indigo"]}
          />
        </Card>
      </Grid>

      {/* Secondary Charts */}
      <Grid numItems={1} numItemsLg={2} className="gap-6">
        {/* Top Services */}
        <Card>
          <Title>Serviços Mais Realizados</Title>
          <Flex className="mt-4">
            <Text>Serviço</Text>
            <Text>Qtd</Text>
          </Flex>
          <BarList
            data={charts.servicosMaisVendidos}
            className="mt-2"
            color="indigo"
          />
        </Card>

        {/* Expenses Breakdown */}
        <Card>
          <Title>Despesas por Categoria</Title>
          <DonutChart
            className="mt-6"
            data={charts.categoriasDespesa}
            category="value"
            index="name"
            valueFormatter={(number) => formatCurrency(number)}
            colors={["rose", "orange", "amber", "yellow", "slate"]}
          />
        </Card>
      </Grid>
    </div>
  );
}
