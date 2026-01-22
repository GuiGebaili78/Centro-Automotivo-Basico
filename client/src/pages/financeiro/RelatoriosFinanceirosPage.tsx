import { useEffect, useState } from "react";
import {
  Card,
  Grid,
  Title,
  Text,
  TabGroup,
  TabList,
  Tab,
  AreaChart,
  Metric,
  BadgeDelta,
  Flex,
  ProgressBar,
  DonutChart,
  BarList,
  DateRangePicker,
  Subtitle,
} from "@tremor/react";
import { api } from "../../services/api";
import { StatusBanner } from "../../components/ui/StatusBanner";

// Formatador BRL
const valueFormatter = (number: number) =>
  `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(number)}`;

export function RelatoriosFinanceirosPage() {
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState(0); // 0 = Visão Gerencial

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const response = await api.get("/relatorios/financeiro/dashboard"); // Certifique-se da rota
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os indicadores financeiros.");
    }
  }

  // Dados seguros (fallback para zero)
  const kpis = data?.kpis || {
    receita: 0,
    despesa: 0,
    lucro: 0,
    margem: 0,
    ticket: 0,
  };
  const fluxo = data?.fluxo_caixa || [];
  const categorias = data?.categorias || [];

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      {/* 1. HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Title className="text-2xl font-bold text-slate-800">
            Inteligência Financeira
          </Title>
          <Subtitle>Acompanhe a saúde da sua oficina em tempo real</Subtitle>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <DateRangePicker
            className="max-w-md mx-auto"
            placeholder="Selecionar Período"
            enableSelect={false}
          />
        </div>
      </div>

      {error && (
        <StatusBanner
          msg={{ type: "error", text: error }}
          onClose={() => setError("")}
        />
      )}

      {/* 2. ABAS DE NAVEGAÇÃO */}
      <TabGroup index={selectedIndex} onIndexChange={setSelectedIndex}>
        <TabList className="mb-8">
          <Tab>Visão Gerencial</Tab>
          <Tab>Detalhamento de Despesas</Tab>
        </TabList>

        {/* CONTEÚDO DA ABA 1: VISÃO GERAL */}
        <div className={selectedIndex === 0 ? "block" : "hidden"}>
          {/* CARDS DE KPI */}
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
            <Card decoration="top" decorationColor="emerald">
              <Text>Faturamento Total</Text>
              <Metric>{valueFormatter(kpis.receita)}</Metric>
              <BadgeDelta
                deltaType="moderateIncrease"
                isIncreasePositive={true}
                className="mt-2"
              >
                +12% vs Mês Anterior
              </BadgeDelta>
            </Card>

            <Card decoration="top" decorationColor="rose">
              <Text>Despesas Totais</Text>
              <Metric>{valueFormatter(kpis.despesa)}</Metric>
              <Text className="mt-2 text-sm text-slate-400">
                Custos Fixos + Variáveis
              </Text>
            </Card>

            <Card decoration="top" decorationColor="indigo">
              <Text>Lucro Líquido</Text>
              <Metric>{valueFormatter(kpis.lucro)}</Metric>
              <Flex className="mt-4">
                <Text>Margem: {kpis.margem.toFixed(1)}%</Text>
                <Text>Meta: 30%</Text>
              </Flex>
              <ProgressBar
                value={kpis.margem}
                color="indigo"
                className="mt-2"
              />
            </Card>

            <Card decoration="top" decorationColor="amber">
              <Text>Ticket Médio</Text>
              <Metric>{valueFormatter(kpis.ticket)}</Metric>
              <Text className="mt-2 text-sm text-slate-400">
                Por Ordem de Serviço
              </Text>
            </Card>
          </Grid>

          {/* GRÁFICO DE FLUXO DE CAIXA */}
          <div className="mt-8">
            <Card>
              <Title>Fluxo de Caixa (Regime de Competência)</Title>
              <Text>
                Evolução de Receitas e Despesas no período selecionado
              </Text>
              <AreaChart
                className="h-80 mt-4"
                data={fluxo}
                index="date"
                categories={["Receitas", "Despesas"]}
                colors={["emerald", "rose"]}
                valueFormatter={valueFormatter}
                yAxisWidth={80}
                showAnimation={true}
                curveType="monotone"
              />
            </Card>
          </div>
        </div>

        {/* CONTEÚDO DA ABA 2: DESPESAS */}
        <div className={selectedIndex === 1 ? "block" : "hidden"}>
          <Grid numItems={1} numItemsLg={3} className="gap-6">
            <Card className="col-span-1">
              <Title>Distribuição de Gastos</Title>
              <DonutChart
                className="mt-6 h-60"
                data={categorias}
                category="value"
                index="name"
                valueFormatter={valueFormatter}
                colors={["rose", "cyan", "amber", "purple", "indigo"]}
              />
            </Card>
            <Card className="col-span-1 lg:col-span-2">
              <Title>Top Categorias de Despesa</Title>
              <div className="mt-6">
                <BarList data={categorias} valueFormatter={valueFormatter} />
              </div>
            </Card>
          </Grid>
        </div>
      </TabGroup>
    </div>
  );
}
