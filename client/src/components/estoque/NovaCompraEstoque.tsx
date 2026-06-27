import React, { useState } from 'react';
import { useBuscaProduto, type ProdutoCatalogo } from '../../hooks/useBuscaProduto';

interface ItemLote {
  produto_id: number;
  nome: string;
  modelo: string;
  fabricante: string;
  quantidade: number;
  custo_unitario: number;
  preco_venda: number;
  aplicacao_equivalencia: string;
  localizacao: string;
  categoria: string;
}

export const NovaCompraEstoque: React.FC = () => {
  // Hook de busca com debounce
  const { query, setQuery, produtos, loading, erro, clearSearch } = useBuscaProduto(300);

  // Estado do item atualmente selecionado/editado no formulário
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCatalogo | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [custoUnitario, setCustoUnitario] = useState<number>(0);
  const [precoVenda, setPrecoVenda] = useState<number>(0);
  const [aplicacaoEquivalencia, setAplicacaoEquivalencia] = useState<string>('');
  const [localizacao, setLocalizacao] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('PEÇAS_GERAIS');

  // Estado do lote (lista de itens na tabela)
  const [itensLote, setItensLote] = useState<ItemLote[]>([]);
  
  // Estado Financeiro / Documental (Exclusividade de vínculo)
  const [notaFiscalId, setNotaFiscalId] = useState<string>('');
  const [dataPagamentoPrevisto, setDataPagamentoPrevisto] = useState<string>('');
  const [fornecedorId, setFornecedorId] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Status da requisição final
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagemFinal, setMensagemFinal] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Manipulador ao selecionar um produto do dropdown de busca
  const handleSelecionarProduto = (prod: ProdutoCatalogo) => {
    setProdutoSelecionado(prod);
    setCustoUnitario(prod.preco_custo_atual || 0);
    setPrecoVenda(prod.preco_venda_atual || 0);
    setAplicacaoEquivalencia(prod.aplicacao_equivalencia || '');
    setLocalizacao(prod.localizacao || '');
    setQuantidade(1);
    clearSearch();
  };

  // Adicionar o item atual à tabela de lote
  const handleAdicionarAoLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Por favor, pesquise e selecione uma peça do catálogo primeiro.');
      return;
    }
    if (quantidade <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }

    const novoItem: ItemLote = {
      produto_id: produtoSelecionado.id_produto,
      nome: produtoSelecionado.nome,
      modelo: produtoSelecionado.modelo,
      fabricante: produtoSelecionado.fabricante,
      quantidade: Number(quantidade),
      custo_unitario: Number(custoUnitario),
      preco_venda: Number(precoVenda),
      aplicacao_equivalencia: aplicacaoEquivalencia,
      localizacao,
      categoria,
    };

    setItensLote([...itensLote, novoItem]);

    // Limpar o formulário de entrada
    setProdutoSelecionado(null);
    setQuantidade(1);
    setCustoUnitario(0);
    setPrecoVenda(0);
    setAplicacaoEquivalencia('');
    setLocalizacao('');
  };

  // Remover item da tabela de lote
  const handleRemoverDoLote = (index: number) => {
    setItensLote(itensLote.filter((_, i) => i !== index));
  };

  // Enviar o lote consolidado para a API (Bulk Insert)
  const handleFinalizarCompra = async () => {
    if (itensLote.length === 0) {
      alert('Adicione pelo menos um item ao lote antes de finalizar a compra.');
      return;
    }

    if (notaFiscalId && dataPagamentoPrevisto) {
      alert('Inconsistência Contábil: Preencha a Nota Fiscal OU a Data de Pagamento Previsto (compra sem nota), nunca ambos.');
      return;
    }

    setSalvando(true);
    setMensagemFinal(null);

    const payload = {
      itens: itensLote.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario,
        preco_venda: item.preco_venda,
      })),
      nota_fiscal_id: notaFiscalId ? Number(notaFiscalId) : undefined,
      data_pagamento_previsto: dataPagamentoPrevisto ? dataPagamentoPrevisto : undefined,
      id_fornecedor: fornecedorId ? Number(fornecedorId) : undefined,
      obs: observacoes,
      origem: 'Tela de Nova Compra (Frontend)',
    };

    try {
      const response = await fetch('/api/estoque/repom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Falha ao processar a reposição de estoque.');
      }

      setMensagemFinal({
        tipo: 'sucesso',
        texto: `Compra finalizada com sucesso! ${itensLote.length} item(ns) processado(s) no estoque e financeiro consolidado.`,
      });

      // Limpar todo o estado
      setItensLote([]);
      setNotaFiscalId('');
      setDataPagamentoPrevisto('');
      setFornecedorId('');
      setObservacoes('');
    } catch (error: any) {
      setMensagemFinal({
        tipo: 'erro',
        texto: error.message || 'Erro ao comunicar com o servidor.',
      });
    } finally {
      setSalvando(false);
    }
  };

  const valorTotalCompra = itensLote.reduce((acc, item) => acc + (item.quantidade * item.custo_unitario), 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Nova Compra / Reposição de Estoque</h1>

        {/* MENSAGEM DE SUCESSO / ERRO */}
        {mensagemFinal && (
          <div className={`p-4 mb-6 rounded-lg font-medium ${mensagemFinal.tipo === 'sucesso' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {mensagemFinal.texto}
          </div>
        )}

        {/* PARTE 1: BUSCA E AUTOCOMPLETE */}
        <div className="mb-8 relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pesquisar Peça no Catálogo (Nome, Fabricante ou Aplicação)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 shadow-sm transition"
            placeholder="Comece a digitar para buscar peças existentes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <span className="absolute right-4 top-10 text-sm text-gray-500 italic">Buscando...</span>}
          {erro && <span className="text-sm text-red-600 mt-1 block">{erro}</span>}

          {/* DROPDOWN RESULTADOS */}
          {produtos.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100">
              {produtos.map((prod) => (
                <li
                  key={prod.id_produto}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition"
                  onClick={() => handleSelecionarProduto(prod)}
                >
                  <div>
                    <p className="font-bold text-gray-800">{prod.nome}</p>
                    <p className="text-xs text-gray-500">Modelo: {prod.modelo} | Fabricante: {prod.fabricante} | Aplicação: {prod.aplicacao_equivalencia}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-700 border">Saldo atual: {prod.saldo_atual}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* PARTE 2: FORMULÁRIO COM BLOQUEIO DE IMUTÁVEIS E GRID EXPANSIVA */}
        <form onSubmit={handleAdicionarAoLote} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Dados do Item (Seleção e Transação)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* CAMPOS IMUTÁVEIS (BLOQUEADOS) */}
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome da Peça (Imutável)</label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed font-semibold"
                value={produtoSelecionado ? produtoSelecionado.nome : 'Nenhuma peça selecionada'}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Modelo (Imutável)</label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed font-semibold"
                value={produtoSelecionado ? produtoSelecionado.modelo : ''}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Fabricante (Imutável)</label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed font-semibold"
                value={produtoSelecionado ? produtoSelecionado.fabricante : ''}
              />
            </div>

            {/* CAMPOS MUTÁVEIS / TRANSAÇÃO */}
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-bold text-blue-700 mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 font-bold shadow-sm"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Custo Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                value={custoUnitario}
                onChange={(e) => setCustoUnitario(Number(e.target.value))}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(Number(e.target.value))}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Localização no Estoque</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                placeholder="Ex: Corredor B, Estante 4"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
              />
            </div>

            {/* AJUSTES DE GRID: LARGURA EXPANDIDA PARA CATEGORIA E APLICAÇÃO */}
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria (Texto Expandido)</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
            </div>
            <div className="col-span-12 md:col-span-8">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Aplicação / Equivalência (Texto Expandido para buscas)</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                placeholder="Lista completa de veículos compatíveis e códigos de equivalência..."
                value={aplicacaoEquivalencia}
                onChange={(e) => setAplicacaoEquivalencia(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition flex items-center gap-2"
            >
              <span>+ Adicionar à Lista de Compra</span>
            </button>
          </div>
        </form>

        {/* PARTE 3: TABELA HTML DO LOTE (BULK INSERT) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Lista de Peças da Nota / Lote ({itensLote.length} item(ns))</h2>
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm font-bold border-b border-gray-200">
                  <th className="p-4">Peça</th>
                  <th className="p-4">Fabricante</th>
                  <th className="p-4">Qtd</th>
                  <th className="p-4">Custo Unit.</th>
                  <th className="p-4">Subtotal</th>
                  <th className="p-4">Aplicação</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm text-gray-700">
                {itensLote.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 italic">
                      Nenhum item adicionado à compra ainda. Pesquise e adicione peças acima.
                    </td>
                  </tr>
                ) : (
                  itensLote.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-bold text-gray-900">{item.nome} <span className="text-xs font-normal text-gray-500">({item.modelo})</span></td>
                      <td className="p-4">{item.fabricante}</td>
                      <td className="p-4 font-bold text-blue-600">{item.quantidade}</td>
                      <td className="p-4">R$ {item.custo_unitario.toFixed(2)}</td>
                      <td className="p-4 font-bold text-gray-800">R$ {(item.quantidade * item.custo_unitario).toFixed(2)}</td>
                      <td className="p-4 max-w-xs truncate" title={item.aplicacao_equivalencia}>{item.aplicacao_equivalencia}</td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoverDoLote(idx)}
                          className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 font-semibold rounded transition text-xs"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {itensLote.length > 0 && (
            <div className="mt-4 text-right text-lg font-bold text-gray-800">
              Valor Total Estimado: <span className="text-green-600">R$ {valorTotalCompra.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* PARTE 4: DADOS DOCUMENTAIS / FINANCEIROS (EXCLUSIVIDADE DE VÍNCULO) */}
        <div className="bg-blue-50/50 border border-blue-200 p-6 rounded-xl mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-4">Informações Fiscais e Financeiras (Ponte Contábil)</h2>
          <p className="text-xs text-blue-700 mb-4 font-medium">
            * ATENÇÃO: De acordo com as regras de governança contábil, preencha o número da Nota Fiscal OU a Data de Pagamento Previsto (em caso de compra sem nota no fim de semana).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">ID / Número da Nota Fiscal (NF)</label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                placeholder="Ex: 55421"
                value={notaFiscalId}
                onChange={(e) => setNotaFiscalId(e.target.value)}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Pagamento Previsto (Sem NF)</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                value={dataPagamentoPrevisto}
                onChange={(e) => setDataPagamentoPrevisto(e.target.value)}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">ID Fornecedor (Opcional)</label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                placeholder="Ex: 12"
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
              />
            </div>
            <div className="col-span-12">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Observações da Compra</label>
              <textarea
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 shadow-sm"
                rows={2}
                placeholder="Observações operacionais ou logísticas sobre este lote de entrada..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* BOTÃO FINAL DE SUBMISSÃO */}
        <div className="border-t pt-6 flex justify-end">
          <button
            type="button"
            onClick={handleFinalizarCompra}
            disabled={salvando || itensLote.length === 0}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg transition flex items-center gap-3"
          >
            {salvando ? (
              <span>Processando Lote no Servidor...</span>
            ) : (
              <span>✓ Finalizar Compra e Consolidar Passivo</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
