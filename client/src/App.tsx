import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { PessoaTestPage } from './pages/PessoaTestPage';
import { TipoTestPage } from './pages/TipoTestPage';
import { PessoaFisicaTestPage } from './pages/PessoaFisicaTestPage';
import { PessoaJuridicaTestPage } from './pages/PessoaJuridicaTestPage';
import { ClienteTestPage } from './pages/ClienteTestPage';
import { FuncionarioTestPage } from './pages/FuncionarioTestPage';
import { PecasEstoqueTestPage } from './pages/PecasEstoqueTestPage';
import { VeiculoTestPage } from './pages/VeiculoTestPage';
import { OrdemDeServicoTestPage } from './pages/OrdemDeServicoTestPage';
import { ItensOsTestPage } from './pages/ItensOsTestPage';
import { FinalizacaoTestPage } from './pages/FinalizacaoTestPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="container mx-auto p-4">
        <nav className="mb-4 text-center">
            <h1 className="text-3xl font-bold mb-4">Centro Automotivo - Teste CRUD</h1>
            <div className="flex flex-wrap justify-center gap-2">
                <Link to="/pessoa" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Pessoa</Link>
                <Link to="/tipo" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Tipo</Link>
                <Link to="/pessoa-fisica" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Pessoa Física</Link>
                <Link to="/pessoa-juridica" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Pessoa Jurídica</Link>
                <Link to="/cliente" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Cliente</Link>
                <Link to="/funcionario" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Funcionário</Link>
                <Link to="/pecas-estoque" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Peças</Link>
                <Link to="/veiculo" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Veículo</Link>
                <Link to="/ordem-de-servico" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">OS</Link>
                <Link to="/itens-os" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Itens OS</Link>
                <Link to="/finalizacao" className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Finalização</Link>
                {/* Other links will go here */}
            </div>
        </nav>

        <Routes>
            <Route path="/" element={<div className="text-center">Selecione uma entidade no menu acima.</div>} />
            <Route path="/pessoa" element={<PessoaTestPage />} />
            <Route path="/tipo" element={<TipoTestPage />} />
            <Route path="/pessoa-fisica" element={<PessoaFisicaTestPage />} />
            <Route path="/pessoa-juridica" element={<PessoaJuridicaTestPage />} />
            <Route path="/cliente" element={<ClienteTestPage />} />
            <Route path="/funcionario" element={<FuncionarioTestPage />} />
            <Route path="/pecas-estoque" element={<PecasEstoqueTestPage />} />
            <Route path="/veiculo" element={<VeiculoTestPage />} />
            <Route path="/ordem-de-servico" element={<OrdemDeServicoTestPage />} />
            <Route path="/itens-os" element={<ItensOsTestPage />} />
            <Route path="/finalizacao" element={<FinalizacaoTestPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
