import { useState, useEffect } from 'react';

export interface ProdutoCatalogo {
  id_produto: number;
  nome: string;
  modelo: string;
  fabricante: string;
  aplicacao_equivalencia: string;
  localizacao: string;
  preco_custo_atual: number;
  preco_venda_atual: number;
  saldo_atual: number;
}

export function useBuscaProduto(delay = 300) {
  const [query, setQuery] = useState('');
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setProdutos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/estoque/buscar?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar produtos no catálogo.');
        }
        const data: ProdutoCatalogo[] = await response.json();
        setProdutos(data);
      } catch (error: any) {
        setErro(error.message || 'Erro na pesquisa de peças.');
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return {
    query,
    setQuery,
    produtos,
    loading,
    erro,
    clearSearch: () => {
      setQuery('');
      setProdutos([]);
    }
  };
}
