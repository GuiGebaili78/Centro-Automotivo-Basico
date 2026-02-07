import { useState, useEffect } from "react";
import {
  Card,
  Grid,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
  Metric,
  Flex,
  BarChart,
  DonutChart,
  BarList,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  ProgressBar,
} from "@tremor/react";
import { GlobalFilter } from "../components/dashboard/GlobalFilter";
import { api } from "../services/api";
import { TrendingUp, DollarSign, Target, AlertTriangle } from "lucide-react";

interface RelatorioData {
  kpis: {
    receitaBruta: number;
    receitaLiquida: number;
    margem: number;
    ticketMedio: number;
    taxaConversao: number;
    churn: number;
    breakEven: number;
    countOs: number;
  };
  charts: {
    evolucaoMensal: {
      mes: string;
      maoDeObra: number;
      lucroEstoque: number;
      lucroPecasExternas: number;
    }[];
    porCategoria: { name: string; value: number }[];
    despesasPorCategoria: {
      name: string;
      value: number;
      percentualFaturamento: number;
    }[];
  };
  ranking: {
    equipe: {
      nome: string;
      totalMaoDeObra: number;
      pecasVendidas: number;
      lucroPecas: number;
      totalContribuicao: number;
    }[];
    fornecedores: {
      nome: string;
      totalCompras: number;
      quantidadeCompras: number;
    }[];
  };
  operadoras: {
    nome: string;
    recebido: number;
    aReceber: number;
    taxasDescontadas: number;
  }[];
  livroCaixa: any[];
}

export function RelatoriosPage() {
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [compareYearOverYear, setCompareYearOverYear] = useState(false);
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRelatorio();
  }, [dateRange]);

  const fetchRelatorio = async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    try {
      const response = await api.get("/relatorios/completo", {
        params: {
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        },
      });
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar relatórios", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-slate-50">
        <div className="w-full h-64 flex items-center justify-center bg-white rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <Text>Carregando análises inteligentes...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <div className="p-6 min-h-screen bg-slate-50">
        <div className="w-full h-64 flex items-center justify-center bg-white rounded-xl">
          <Text>Nenhum dado disponível para o período selecionado.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-3xl font-black text-slate-900">
            Central de Inteligência
          </Title>
          <Text className="text-slate-500">
            Dashboard financeiro e operacional completo
          </Text>
        </div>
      </div>

      {/* Filtros */}
      <GlobalFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        compareYearOverYear={compareYearOverYear}
        onCompareChange={setCompareYearOverYear}
      />

      {/* Tabs */}
      <TabGroup className="mt-6">
        <TabList variant="solid" color="blue">
          <Tab>📊 Performance Financeira</Tab>
          <Tab>👥 Gestão de Equipe</Tab>
          <Tab>💰 Fluxo & Despesas</Tab>
          <Tab>📋 Conciliação</Tab>
        </TabList>

        <TabPanels>
          {/* ABA 1: PERFORMANCE */}
          <TabPanel>
            <Grid
              numItems={1}
              numItemsSm={2}
              numItemsLg={4}
              className="gap-4 mt-6"
            >
              <Card decoration="top" decorationColor="blue">
                <Flex alignItems="start">
                  <div>
                    <Text className="text-slate-600">Receita Bruta</Text>
                    <Metric className="mt-2">
                      {formatCurrency(data.kpis.receitaBruta)}
                    </Metric>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </Flex>
                <Text className="mt-2 text-xs text-slate-400">
                  {data.kpis.countOs} OS Finalizadas
                </Text>
              </Card>

              <Card decoration="top" decorationColor="emerald">
                <Flex alignItems="start">
                  <div>
                    <Text className="text-slate-600">Receita Líquida</Text>
                    <Metric className="mt-2">
                      {formatCurrency(data.kpis.receitaLiquida)}
                    </Metric>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-500" />
                </Flex>
                <Text className="mt-2 text-xs text-slate-400">
                  Margem: {(data.kpis.margem || 0).toFixed(1)}%
                </Text>
              </Card>

              <Card decoration="top" decorationColor="violet">
                <Flex alignItems="start">
                  <div>
                    <Text className="text-slate-600">Ticket Médio</Text>
                    <Metric className="mt-2">
                      {formatCurrency(data.kpis.ticketMedio)}
                    </Metric>
                  </div>
                  <Target className="w-8 h-8 text-violet-500" />
                </Flex>
                <Text className="mt-2 text-xs text-slate-400">
                  Por ordem de serviço
                </Text>
              </Card>

              <Card decoration="top" decorationColor="amber">
                <Flex alignItems="start">
                  <div>
                    <Text className="text-slate-600">Taxa de Conversão</Text>
                    <Metric className="mt-2">
                      {(data.kpis.taxaConversao || 0).toFixed(1)}%
                    </Metric>
                  </div>
                  <TrendingUp className="w-8 h-8 text-amber-500" />
                </Flex>
                <Text className="mt-2 text-xs text-slate-400">
                  Orçamentos → Serviços
                </Text>
              </Card>
            </Grid>

            {/* KPIs Secundários */}
            <Grid numItems={1} numItemsSm={2} className="gap-4 mt-4">
              <Card>
                <Flex alignItems="start">
                  <div className="flex-1">
                    <Text className="text-slate-600">
                      Churn (Clientes Inativos)
                    </Text>
                    <Metric className="mt-2 text-red-600">
                      {data.kpis.churn}
                    </Metric>
                    <Text className="mt-1 text-xs text-slate-400">
                      Sem OS há mais de 180 dias
                    </Text>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </Flex>
              </Card>

              <Card>
                <Flex alignItems="start">
                  <div className="flex-1">
                    <Text className="text-slate-600">Ponto de Equilíbrio</Text>
                    <Metric className="mt-2">
                      {formatCurrency(data.kpis.breakEven)}
                    </Metric>
                    <Text className="mt-1 text-xs text-slate-400">
                      Despesas fixas do período
                    </Text>
                  </div>
                  <DollarSign className="w-8 h-8 text-slate-500" />
                </Flex>
              </Card>
            </Grid>

            {/* Gráficos */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <Title>Evolução Mensal (Composição de Lucro)</Title>
                <BarChart
                  className="mt-4 h-80"
                  data={data.charts.evolucaoMensal}
                  index="mes"
                  categories={[
                    "maoDeObra",
                    "lucroEstoque",
                    "lucroPecasExternas",
                  ]}
                  colors={["blue", "emerald", "cyan"]}
                  valueFormatter={formatCurrency}
                  stack={true}
                  yAxisWidth={80}
                />
                <div className="mt-4 flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Mão de Obra</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <span>Lucro Estoque</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                    <span>Lucro Peças Externas</span>
                  </div>
                </div>
              </Card>

              <Card>
                <Title>Receita por Categoria</Title>
                <DonutChart
                  className="mt-6 h-80"
                  data={data.charts.porCategoria}
                  category="value"
                  index="name"
                  valueFormatter={formatCurrency}
                  colors={["blue", "cyan", "indigo", "violet", "fuchsia"]}
                />
              </Card>
            </div>
          </TabPanel>

          {/* ABA 2: EQUIPE */}
          <TabPanel>
            <Card className="mt-6">
              <Title>Ranking de Produtividade da Equipe</Title>
              <Text className="text-slate-500 mb-4">
                Análise completa de contribuição por colaborador
              </Text>
              <Table className="mt-4">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Colaborador</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Mão de Obra
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Peças Vendidas
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Lucro em Peças
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Total Contribuição
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.ranking.equipe.map((colaborador, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-bold text-sm">
                              {idx + 1}
                            </span>
                          </div>
                          <span className="font-medium">
                            {colaborador.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(colaborador.totalMaoDeObra)}
                      </TableCell>
                      <TableCell className="text-right">
                        {colaborador.pecasVendidas} un.
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {formatCurrency(colaborador.lucroPecas)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary-700">
                        {formatCurrency(colaborador.totalContribuicao)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>

          {/* ABA 3: FLUXO & DESPESAS */}
          <TabPanel>
            <div className="mt-6 space-y-6">
              {/* Despesas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <Title>Despesas por Categoria</Title>
                  <DonutChart
                    className="mt-6 h-64"
                    data={data.charts.despesasPorCategoria}
                    category="value"
                    index="name"
                    valueFormatter={formatCurrency}
                    colors={["rose", "orange", "amber", "red", "pink"]}
                  />
                </Card>

                <Card>
                  <Title>Impacto no Faturamento</Title>
                  <div className="mt-6 space-y-4">
                    {data.charts.despesasPorCategoria.map((desp, idx) => (
                      <div key={idx}>
                        <Flex>
                          <Text>{desp.name}</Text>
                          <Text className="font-mono">
                            {formatCurrency(desp.value)}
                          </Text>
                        </Flex>
                        <ProgressBar
                          value={desp.percentualFaturamento}
                          className="mt-2"
                          color={
                            desp.percentualFaturamento > 30
                              ? "red"
                              : desp.percentualFaturamento > 15
                                ? "amber"
                                : "emerald"
                          }
                        />
                        <Text className="text-xs text-slate-400 mt-1">
                          {desp.percentualFaturamento.toFixed(1)}% do
                          faturamento
                        </Text>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Fornecedores */}
              <Card>
                <Title>Ranking de Fornecedores (Top 10)</Title>
                <BarList
                  data={data.ranking.fornecedores.map((f) => ({
                    name: `${f.nome} (${f.quantidadeCompras} compras)`,
                    value: f.totalCompras,
                  }))}
                  className="mt-4"
                  valueFormatter={formatCurrency}
                  color="blue"
                />
              </Card>

              {/* Operadoras */}
              <div>
                <Title className="mb-4">Análise de Operadoras de Cartão</Title>
                <Grid
                  numItems={1}
                  numItemsSm={2}
                  numItemsLg={3}
                  className="gap-4"
                >
                  {data.operadoras.map((op, idx) => (
                    <Card key={idx} decoration="left" decorationColor="blue">
                      <Text className="font-bold text-slate-900">
                        {op.nome}
                      </Text>
                      <div className="mt-4 space-y-2">
                        <Flex>
                          <Text className="text-xs text-slate-500">
                            Recebido
                          </Text>
                          <Text className="text-sm font-mono text-emerald-600">
                            {formatCurrency(op.recebido)}
                          </Text>
                        </Flex>
                        <Flex>
                          <Text className="text-xs text-slate-500">
                            A Receber
                          </Text>
                          <Text className="text-sm font-mono text-amber-600">
                            {formatCurrency(op.aReceber)}
                          </Text>
                        </Flex>
                        <Flex>
                          <Text className="text-xs text-slate-500">
                            Taxas Descontadas
                          </Text>
                          <Text className="text-sm font-mono text-red-600">
                            {formatCurrency(op.taxasDescontadas)}
                          </Text>
                        </Flex>
                      </div>
                    </Card>
                  ))}
                </Grid>
              </div>
            </div>
          </TabPanel>

          {/* ABA 4: CONCILIAÇÃO */}
          <TabPanel>
            <Card className="mt-6">
              <Title>Extrato do Livro Caixa</Title>
              <Table className="mt-4">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Data</TableHeaderCell>
                    <TableHeaderCell>Descrição</TableHeaderCell>
                    <TableHeaderCell>Categoria</TableHeaderCell>
                    <TableHeaderCell>Tipo</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Valor
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.livroCaixa.map((item) => (
                    <TableRow key={item.id_livro_caixa}>
                      <TableCell>
                        {new Date(item.dt_movimentacao).toLocaleDateString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell>{item.categoria}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            item.tipo_movimentacao === "ENTRADA"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.tipo_movimentacao}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(item.valor))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
