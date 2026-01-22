import {
  createBrowserRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ClientePage } from "./pages/ClientePage";

// Importe suas páginas antigas aqui enquanto não refatora todas
import { VeiculoPage } from "./pages/VeiculoPage";
import { OrdemDeServicoPage } from "./pages/OrdemDeServicoPage";
import { OrdemDeServicoDetalhePage } from "./pages/OrdemDeServicoDetalhePage";
import { CadastroUnificadoPage } from "./pages/CadastroUnificadoPage";

import { PecasEstoquePage } from "./pages/PecasEstoquePage";
import { EntradaEstoquePage } from "./pages/EntradaEstoquePage";
import { FuncionarioPage } from "./pages/FuncionarioPage";
import { PessoaPage } from "./pages/PessoaPage";
import { TipoPage } from "./pages/TipoPage";
import { FechamentoFinanceiroPage } from "./pages/FechamentoFinanceiroPage";
import { FechamentoFinanceiroDetalhePage } from "./pages/FechamentoFinanceiroDetalhePage";

import { FornecedorPage } from "./pages/FornecedorPage";
import { PagamentoPecaPage } from "./pages/PagamentoPecaPage";
import { LivroCaixaPage } from "./pages/LivroCaixaPage";
import { ContasAPagarPage } from "./pages/ContasAPagarPage";
import { SearchClientePage } from "./pages/SearchClientePage";
import { SearchVeiculoPage } from "./pages/SearchVeiculoPage";
import { NovoPagamentoPage } from "./pages/NovoPagamentoPage";
import { PagamentoEquipePage } from "./pages/PagamentoEquipePage";
import { ExtratoBancarioPage } from "./pages/ExtratoBancarioPage";
import { DaschboardPage } from "./pages/DaschboardPage";
import { RelatoriosFinanceirosPage } from "./pages/financeiro/RelatoriosFinanceirosPage";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<MainLayout />}>
      <Route path="/" element={<DaschboardPage />} />
      {/* Páginas Modernizadas */}
      <Route path="/cliente" element={<ClientePage />} />
      {/* Páginas Legadas (Ainda funcionam dentro do layout novo!) */}
      <Route path="/veiculo" element={<VeiculoPage />} />
      <Route path="/ordem-de-servico" element={<OrdemDeServicoPage />} />
      <Route
        path="/ordem-de-servico/:id"
        element={<OrdemDeServicoDetalhePage />}
      />
      {/* Unified Registration Routes */}
      <Route path="/novo-cadastro" element={<CadastroUnificadoPage />} />
      <Route path="/cadastro/:clienteId" element={<CadastroUnificadoPage />} />
      <Route path="/pecas-estoque" element={<PecasEstoquePage />} />
      <Route path="/entrada-estoque" element={<EntradaEstoquePage />} />
      <Route path="/funcionario" element={<FuncionarioPage />} />
      <Route path="/pessoa" element={<PessoaPage />} />
      <Route path="/tipo" element={<TipoPage />} />
      <Route
        path="/fechamento-financeiro"
        element={<FechamentoFinanceiroPage />}
      />
      <Route
        path="/fechamento-financeiro/:id"
        element={<FechamentoFinanceiroDetalhePage />}
      />
      <Route path="/financeiro" element={<LivroCaixaPage />} />{" "}
      {/* Redirect old /financeiro to LivroCaixaPage */}
      <Route path="/financeiro/livro-caixa" element={<LivroCaixaPage />} />
      <Route
        path="/financeiro/pagamento-pecas"
        element={<PagamentoPecaPage />}
      />
      <Route path="/financeiro/contas-pagar" element={<ContasAPagarPage />} />
      <Route
        path="/financeiro/relatorios"
        element={<RelatoriosFinanceirosPage />}
      />
      <Route
        path="/financeiro/extrato/:idConta"
        element={<ExtratoBancarioPage />}
      />
      <Route path="/financeiro/equipe" element={<PagamentoEquipePage />} />{" "}
      {/* Nova Rota */}
      <Route path="/pagamento-equipe" element={<PagamentoEquipePage />} />
      <Route path="/pagamento-equipe/novo" element={<NovoPagamentoPage />} />
      <Route path="/fornecedor" element={<FornecedorPage />} />
      <Route path="/pagamento-peca" element={<PagamentoPecaPage />} />
      {/* Search Pages */}
      <Route path="/search-cliente" element={<SearchClientePage />} />
      <Route path="/search-veiculo" element={<SearchVeiculoPage />} />
      {/* Rota 404 para qualquer coisa não definida */}
      <Route path="*" element={<NotFoundPage />} />
    </Route>,
  ),
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
