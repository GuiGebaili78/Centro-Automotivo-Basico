import { useState, useEffect, useCallback, useMemo } from "react";
import { OsService } from "../services/os.service";
import { OsItemsService } from "../services/osItems.service";
import { ColaboradorService } from "../services/colaborador.service";
import { toast } from "react-toastify";
import { OsStatus } from "../types/os.types";
import type { IOrdemDeServico } from "../types/backend";

export const useOrdemServico = (id: string | number | undefined) => {
  const [os, setOs] = useState<IOrdemDeServico | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadOsData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await OsService.getById(Number(id));
      setOs(data);
      if (data.itens_os) {
        setItems(data.itens_os);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar OS.");
      toast.error("Erro ao carregar OS.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadItems = useCallback(async () => {
    if (!id) return;
    try {
      const data = await OsItemsService.getByOsId(Number(id));
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar itens.");
    }
  }, [id]);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await ColaboradorService.getAll();
      setEmployees(data);
    } catch (error) {
      console.error("Erro ao carregar colaboradores");
    }
  }, []);

  useEffect(() => {
    loadOsData();
    loadEmployees();
  }, [loadOsData, loadEmployees]);

  const refetch = useCallback(async () => {
    await loadOsData();
    await loadItems();
  }, [loadOsData, loadItems]);

  // --- OS CORE ACTIONS ---
  const updateOSField = async (field: keyof IOrdemDeServico, value: any) => {
    if (!os) return;
    setOs((prev) => (prev ? { ...prev, [field]: value } : null));

    try {
      await OsService.update(os.id_os, { [field]: value });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar alteração.");
      loadOsData();
    }
  };

  // --- STATUS ACTIONS ---
  const finishOS = async (data: {
    valor_pecas: number;
    valor_mao_de_obra: number;
    valor_total_cliente: number;
    dt_entrega: string;
  }) => {
    if (!id) return false;
    try {
      await OsService.update(Number(id), {
        ...data,
        status: OsStatus.FINANCEIRO,
      });
      toast.success("OS Finalizada! Enviada para Financeiro.");
      await refetch();
      return true;
    } catch (e) {
      toast.error("Erro ao finalizar OS.");
      return false;
    }
  };

  const openOsNow = async () => {
    if (!id) return false;
    try {
      await OsService.updateStatus(Number(id), OsStatus.ABERTA);
      toast.success("OS Aberta com sucesso!");
      await refetch();
      return true;
    } catch (e) {
      toast.error("Erro ao abrir OS.");
      return false;
    }
  };

  const reopenOS = async (fechamentoId?: number) => {
    if (!id) return false;
    try {
      if (fechamentoId) {
        await OsService.deleteFinancialClosure(fechamentoId);
      }
      await OsService.updateStatus(Number(id), OsStatus.ABERTA);
      toast.success("OS Reaberta com sucesso!");
      await refetch();
      return true;
    } catch (e) {
      toast.error("Erro ao reabrir OS.");
      return false;
    }
  };

  const cancelOS = async () => {
    if (!id) return false;
    try {
      await OsService.updateStatus(Number(id), OsStatus.CANCELADA);
      toast.success("OS Cancelada e Estoque Estornado.");
      await refetch();
      return true;
    } catch (e) {
      toast.error("Erro ao cancelar OS.");
      return false;
    }
  };

  // --- ITEM ACTIONS ---
  const addItem = async (itemData: any) => {
    if (!id) return false;
    try {
      const payload = {
        id_os: Number(id),
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
      await loadItems();
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
      await loadItems();
      return true;
    } catch (e) {
      toast.error("Erro ao atualizar item.");
      return false;
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      await OsItemsService.delete(itemId);
      await loadItems();
      toast.success("Item removido.");
      return true;
    } catch (e) {
      toast.error("Erro ao remover item.");
      return false;
    }
  };

  // --- LABOR ACTIONS ---
  const addLabor = async (laborData: any) => {
    if (!id) return false;
    try {
      await OsService.addLabor({
        id_os: Number(id),
        ...laborData,
      });
      toast.success("Mão de obra adicionada!");
      await loadOsData();
      return true;
    } catch (error) {
      toast.error("Erro ao adicionar mão de obra.");
      return false;
    }
  };

  const updateLabor = async (laborId: number | string, laborData: any) => {
    try {
      await OsService.updateLabor(laborId, laborData);
      toast.success("Mão de obra atualizada!");
      await loadOsData();
      return true;
    } catch (error) {
      toast.error("Erro ao atualizar mão de obra.");
      return false;
    }
  };

  const deleteLabor = async (laborId: number | string) => {
    try {
      await OsService.deleteLabor(Number(laborId));
      toast.success("Mão de obra removida.");
      await loadOsData();
      return true;
    } catch (error) {
      toast.error("Erro ao remover mão de obra.");
      return false;
    }
  };

  // --- MODAL / UI STATE ---
  const [activeTab, setActiveTab] = useState("items");
  const [editingItemData, setEditingItemData] = useState<any>(null);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleEditItem = (item: any) => {
    setEditingItemData({
      ...item,
      valor_venda: item.valor_total / item.quantidade,
    });
    setEditItemModalOpen(true);
  };

  const handleSaveItemEdit = async () => {
    if (!editingItemData) return;
    const success = await updateItem(editingItemData.id_iten, editingItemData);
    if (success) {
      setEditItemModalOpen(false);
      setEditingItemData(null);
    }
  };

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

  const checkStockAvailability = async (stockId: string | number) => {
    try {
      return await OsItemsService.checkAvailability(Number(stockId));
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const isLocked = useMemo(() => {
    if (!os) return true;
    return (
      os.status === OsStatus.FINALIZADA ||
      os.status === "CANCELADA" ||
      os.status === "PAGA_CLIENTE"
    );
  }, [os]);

  const totals = useMemo(() => {
    const totalParts = items.reduce(
      (acc, i) => acc + Number(i.valor_total || 0),
      0,
    );

    const laborList = os?.servicos_mao_de_obra || [];
    const totalLabor =
      laborList.length > 0
        ? laborList.reduce(
            (acc: number, l: any) => acc + Number(l.valor || 0),
            0,
          )
        : Number(os?.valor_mao_de_obra || 0);

    return {
      parts: totalParts,
      labor: totalLabor,
      general: totalParts + totalLabor,
    };
  }, [items, os?.servicos_mao_de_obra, os?.valor_mao_de_obra]);

  return {
    os,
    items,
    employees,
    loading,
    error,
    isLocked,
    totals,
    updateOSField,
    refetch,
    // Status Actions
    finishOS,
    openOsNow,
    reopenOS,
    cancelOS,
    // Item Actions
    addItem,
    updateItem,
    deleteItem,
    addLabor,
    updateLabor,
    deleteLabor,
    // UI state
    activeTab,
    setActiveTab,
    editingItemData,
    setEditingItemData,
    editItemModalOpen,
    setEditItemModalOpen,
    paymentModalOpen,
    setPaymentModalOpen,
    shareModalOpen,
    setShareModalOpen,
    handleEditItem,
    handleSaveItemEdit,
    // Search
    searchParts,
    partSearchResults,
    setPartSearchResults,
    isSearching,
    checkStockAvailability,
    // Calculated
    totalPaid:
      items.length >= 0
        ? (os?.pagamentos_cliente || [])
            .filter((p) => !p.deleted_at)
            .reduce((acc, p) => acc + Number(p.valor), 0)
        : 0,
    totalPending:
      items.length >= 0
        ? totals.general -
          (os?.pagamentos_cliente || [])
            .filter((p) => !p.deleted_at)
            .reduce((acc, p) => acc + Number(p.valor), 0)
        : 0,
  };
};
