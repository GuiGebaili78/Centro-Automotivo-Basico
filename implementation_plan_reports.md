# Plano de Implementação: Relatórios Financeiros

Este plano descreve a criação do módulo de "Inteligência Financeira".

## 1. Visão Geral

Criaremos uma nova página "Relatórios Financeiros" e um controller dedicado.

## 2. Arquitetura do Backend (`/api/relatorios`)

Não alteraremos tabelas existentes.

### Novo Controller: `RelatorioFinanceiroController.ts`

Endpoint único: `GET /api/relatorios/dashboard`
Retorno JSON:

1.  **DRE Mensal**: Receita Bruta, Custos Diretos (CMV), Despesas Operacionais, Lucro Líquido.
2.  **Fluxo de Caixa**: Histórico `livro_caixa` vs Futuro `recebivel_cartao` + `contas_pagar`.
3.  **Churn**: Clientes inativos > 180 dias.
4.  **Despesas por Categoria**: Gráfico Donut.

## 3. Frontend (`RelatoriosFinanceirosPage.tsx`)

Biblioteca **Recharts**.

- **KPIs**: Lucro Atual, Previsão Entradas.
- **Gráficos**: DRE (Barras), Fluxo (Linha), Despesas (Donut).
- **Tabela**: Churn.

## 4. Passos

1.  Criar `RelatorioFinanceiroController.ts`.
2.  Criar rota `relatorio.routes.ts` e registrar no `server.ts`.
3.  Criar `RelatoriosFinanceirosPage.tsx`.

## 5. Não-Regressão

- Nenhuma tabela alterada.
- Nenhum dado modificado (`READ ONLY`).

---

**Aguardando validação.**
