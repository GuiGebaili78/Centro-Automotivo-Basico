import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ClientePage } from './pages/ClientePage'; 

// Importe suas páginas antigas aqui enquanto não refatora todas
import { VeiculoPage } from './pages/VeiculoPage';
import { OrdemDeServicoPage } from './pages/OrdemDeServicoPage';
import { PecasEstoquePage } from './pages/PecasEstoquePage';
import { FuncionarioPage } from './pages/FuncionarioPage';
import { PessoaPage } from './pages/PessoaPage';
import { TipoPage } from './pages/TipoPage';
import { FechamentoFinanceiroPage } from './pages/FechamentoFinanceiroPage';

import { FornecedorPage } from './pages/FornecedorPage';
import { PagamentoPecaPage } from './pages/PagamentoPecaPage';
import { LivroCaixaPage } from './pages/LivroCaixaPage';
import { ContasAPagarPage } from './pages/ContasAPagarPage';
import { SearchClientePage } from './pages/SearchClientePage';
import { SearchVeiculoPage } from './pages/SearchVeiculoPage';
import { PagamentoEquipePage } from './pages/PagamentoEquipePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Principal com Layout (Sidebar + Conteúdo) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          
          {/* Páginas Modernizadas */}
          <Route path="/cliente" element={<ClientePage />} />

          {/* Páginas Legadas (Ainda funcionam dentro do layout novo!) */}
          <Route path="/veiculo" element={<VeiculoPage />} />
          <Route path="/ordem-de-servico" element={<OrdemDeServicoPage />} />
          <Route path="/pecas-estoque" element={<PecasEstoquePage />} />
          <Route path="/funcionario" element={<FuncionarioPage />} />
          <Route path="/pessoa" element={<PessoaPage />} />
          <Route path="/tipo" element={<TipoPage />} />
          <Route path="/fechamento-financeiro" element={<FechamentoFinanceiroPage />} />
          <Route path="/financeiro" element={<LivroCaixaPage />} /> {/* Redirect old /financeiro to LivroCaixaPage */}
          <Route path="/financeiro/livro-caixa" element={<LivroCaixaPage />} />
          <Route path="/financeiro/pagamento-pecas" element={<PagamentoPecaPage />} />
          <Route path="/financeiro/contas-pagar" element={<ContasAPagarPage />} />
          <Route path="/financeiro/equipe" element={<PagamentoEquipePage />} /> {/* Nova Rota */}

          <Route path="/fornecedor" element={<FornecedorPage />} />
          <Route path="/pagamento-peca" element={<PagamentoPecaPage />} />
          
          {/* Search Pages */}
          <Route path="/search-cliente" element={<SearchClientePage />} />
          <Route path="/search-veiculo" element={<SearchVeiculoPage />} />
          
          {/* Rota 404 para qualquer coisa não definida */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;