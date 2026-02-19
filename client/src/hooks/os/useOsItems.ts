import { useState, useEffect, useCallback } from "react";
import { OsItemsService } from "../../services/osItems.service";
import { toast } from "react-toastify";

export interface NewItemState {
  id_pecas_estoque: string;
  quantidade: string;
  valor_venda: string;
  descricao: string;
  codigo_referencia: string;
  id_fornecedor: string;
}

export const useOsItems = (osId: string | undefined) => {
  const [items, setItems] = useState<any[]>([]); // Using 'any' compatible with current codebase structure, ideally IItensOs
  const [loading, setLoading] = useState(false);

  // Search
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadItems = useCallback(async () => {
    if (!osId) return;
    setLoading(true);
    try {
      const data = await OsItemsService.getByOsId(Number(osId));
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar itens.");
    } finally {
      setLoading(false);
    }
  }, [osId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const searchParts = async (query: string) => {
    if (query.length < 2) {
      setPartSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const [stockRes, historyRes] = await Promise.all([
        OsItemsService.searchStock(query),
        OsItemsService.search(query),
      ]);

      const historyFormatted = historyRes.map((h: any) => ({
        id_pecas_estoque: null,
        nome: h.descricao,
        valor_venda: h.valor_venda,
        fabricante: "Histórico",
        isHistory: true,
      }));

      const combined = [...stockRes, ...historyFormatted];
      // Dedup
      const unique = combined.filter(
        (v, i, a) => a.findIndex((t) => t.nome === v.nome) === i,
      );
      setPartSearchResults(unique);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const addItem = async (itemData: any) => {
    if (!osId) return false;
    try {
      // Logic from original handleAddItem
      const payload = {
        id_os: Number(osId),
        id_pecas_estoque: itemData.id_pecas_estoque
          ? Number(itemData.id_pecas_estoque)
          : null,
        descricao: itemData.descricao,
        quantidade: Number(itemData.quantidade),
        valor_venda: Number(itemData.valor_venda),
        valor_total: Number(itemData.quantidade) * Number(itemData.valor_venda),
        codigo_referencia: itemData.codigo_referencia,
        id_fornecedor: itemData.id_fornecedor
          ? Number(itemData.id_fornecedor)
          : null,
      };

      await OsItemsService.create(payload);
      toast.success("Item adicionado!");
      loadItems();
      return true;
    } catch (error) {
      toast.error("Erro ao adicionar item.");
      return false;
    }
  };

  const updateItem = async (itemId: number, itemData: any) => {
    try {
      await OsItemsService.update(itemId, {
        descricao: itemData.descricao,
        quantidade: Number(itemData.quantidade),
        valor_venda: Number(itemData.valor_venda),
        valor_total: Number(itemData.quantidade) * Number(itemData.valor_venda),
        codigo_referencia: itemData.codigo_referencia,
        id_fornecedor: itemData.id_fornecedor
          ? Number(itemData.id_fornecedor)
          : null,
        id_pecas_estoque: itemData.id_pecas_estoque
          ? Number(itemData.id_pecas_estoque)
          : null,
      });
      toast.success("Item atualizado!");
      loadItems();
      return true;
    } catch (e) {
      toast.error("Erro ao atualizar item.");
      return false;
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      await OsItemsService.delete(itemId);
      loadItems();
      toast.success("Item removido.");
      return true;
    } catch (e) {
      toast.error("Erro ao remover item.");
      return false;
    }
  };

  const checkStockAvailability = async (id_pecas_estoque: string | number) => {
    try {
      const data = await OsItemsService.checkAvailability(
        Number(id_pecas_estoque),
      );
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  return {
    items,
    loading,
    partSearchResults,
    setPartSearchResults,
    searchParts,
    addItem,
    updateItem,
    deleteItem,
    checkStockAvailability,
    refetch: loadItems,
    isSearching,
  };
};
