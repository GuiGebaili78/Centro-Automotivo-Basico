import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { formatCurrency } from "../utils/formatCurrency";

import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { IOrdemDeServico } from "../types/backend";
import {
  Plus,
  Trash2,
  Package,
  Wrench,
  CheckCircle,
  BadgeCheck,
  DollarSign,
  ArrowLeft,
  Save,
  Edit,
} from "lucide-react";

import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ActionButton } from "../components/ui/ActionButton";
import { PagamentoClienteForm } from "../components/forms/PagamentoClienteForm";
import { LaborManager } from "../components/os/LaborManager";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { toast } from "react-toastify";

export const OrdemDeServicoDetalhePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [os, setOs] = useState<IOrdemDeServico | null>(null);
  const [osItems, setOsItems] = useState<any[]>([]);
  const [laborServices, setLaborServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);

  const [isDirty, setIsDirty] = useState(false);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Items / Parts Management
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    id_pecas_estoque: "",
    quantidade: "1",
    valor_venda: "",
    descricao: "",
    codigo_referencia: "",
    id_fornecedor: "",
  });
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Refs
  const partInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Edit Item Modal
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editingItemData, setEditingItemData] = useState<any>(null);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [selectedStockInfo, setSelectedStockInfo] = useState<{
    qtd: number;
    reserved: number;
  } | null>(null);

  // --- LOADING ---
  const loadOsData = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/ordem-de-servico/${id}`);
      setOs(response.data);
      setOsItems(response.data.itens_os || []);
      setLaborServices(response.data.servicos_mao_de_obra || []);
    } catch (error) {
      toast.error("Erro ao carregar OS.");
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await api.get("/funcionario");
      setEmployees(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadParts = async () => {
    try {
      const response = await api.get("/pecas-estoque");
      setAvailableParts(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadOsItems = async (idOs: number) => {
    try {
      const response = await api.get(`/itens-os/os/${idOs}`);
      setOsItems(response.data);
    } catch (error) {
      toast.error("Erro ao carregar itens.");
    }
  };

  useEffect(() => {
    loadOsData();
    loadEmployees();
    loadParts();
  }, [id]);

  // --- HANDLERS ---

  const updateOSField = async (field: string, value: any) => {
    if (!os || os.status === "FINALIZADA" || os.status === "PAGA_CLIENTE")
      return;

    try {
      setOs((prev) => (prev ? { ...prev, [field]: value } : null));
      await api.put(`/ordem-de-servico/${os.id_os}`, { [field]: value });
      setIsDirty(false);
    } catch (error) {
      toast.error("Erro ao salvar alteração.");
    }
  };

  const handlePartSearch = async (val: string) => {
    setPartSearch(val);
    if (val.length < 2) {
      setPartResults([]);
      return;
    }
    try {
      const [stockRes, historyRes] = await Promise.all([
        api.get(`/pecas-estoque/search?q=${val}`),
        api.get(`/itens-os/search/desc?q=${val}`),
      ]);
      const historyFormatted = historyRes.data.map((h: any) => ({
        id_pecas_estoque: null,
        nome: h.descricao,
        valor_venda: h.valor_venda,
        fabricante: "Histórico",
        isHistory: true,
      }));
      const combined = [...stockRes.data, ...historyFormatted];
      const unique = combined.filter(
        (v, i, a) => a.findIndex((t) => t.nome === v.nome) === i,
      );
      setPartResults(unique);
    } catch (e) {
      console.error(e);
    }
  };

  const selectPart = async (p: any) => {
    // Basic update
    setNewItem((prev) => ({
      ...prev,
      id_pecas_estoque: p.id_pecas_estoque ? String(p.id_pecas_estoque) : "",
      valor_venda: p.valor_venda ? String(p.valor_venda) : "",
      descricao: p.nome,
    }));
    setPartSearch(p.nome);
    setPartResults([]);
    setHighlightIndex(-1);
    setIsDirty(true);

    // If it's a stock item, fetch latest availability
    if (p.id_pecas_estoque) {
      try {
        const res = await api.get(
          `/pecas-estoque/${p.id_pecas_estoque}/availability`,
        );
        const partDetails = res.data;

        setNewItem((prev) => ({
          ...prev,
          id_pecas_estoque: String(partDetails.id_pecas_estoque),
          valor_venda: Number(partDetails.valor_venda).toFixed(2),
          descricao: partDetails.nome,
        }));

        const freeStock =
          (partDetails.estoque_atual || 0) - (partDetails.reserved || 0);
        setSelectedStockInfo({
          qtd: freeStock,
          reserved: partDetails.reserved,
        });

        if (freeStock <= 0) {
          toast.error(
            `⚠️ Sem Estoque! (Reservado: ${partDetails.reserved || 0})`,
          );
        } else if (freeStock < 2) {
          toast.warn(`⚠️ Estoque Baixo! Disp: ${freeStock}`);
        } else {
          toast.success(`Item selecionado. Disp: ${freeStock}`);
        }
      } catch (e) {
        console.error("Erro ao checar disponibilidade", e);
      }
    } else {
      setSelectedStockInfo(null);
    }

    requestAnimationFrame(() => referenceInputRef.current?.focus());
  };

  const handleAddItem = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!os) return;
    try {
      const part = availableParts.find(
        (p) => p.id_pecas_estoque === Number(newItem.id_pecas_estoque),
      );
      const description = part
        ? part.nome
        : newItem.descricao || partSearch || "Item Diverso";
      const qtd = Number(newItem.quantidade);
      const val = Number(newItem.valor_venda);

      if (editingItemId) {
        await api.put(`/itens-os/${editingItemId}`, {
          descricao: description,
          quantidade: qtd,
          valor_venda: val,
          valor_total: qtd * val,
          codigo_referencia: newItem.codigo_referencia,
          id_fornecedor: newItem.id_fornecedor || null,
        });
        toast.success("Item adicionado/atualizado!");
      } else {
        await api.post("/itens-os", {
          id_os: os.id_os,
          id_pecas_estoque: newItem.id_pecas_estoque
            ? Number(newItem.id_pecas_estoque)
            : null,
          descricao: description,
          quantidade: qtd,
          valor_venda: val,
          valor_total: qtd * val,
          codigo_referencia: newItem.codigo_referencia,
          id_fornecedor: newItem.id_fornecedor || null,
        });
        toast.success("Item adicionado!");
      }
      setNewItem({
        id_pecas_estoque: "",
        quantidade: "1",
        valor_venda: "",
        descricao: "",
        codigo_referencia: "",
        id_fornecedor: "",
      });
      setSelectedStockInfo(null);
      setPartSearch("");
      setEditingItemId(null);
      loadOsItems(os.id_os);
      requestAnimationFrame(() => partInputRef.current?.focus());
      setTimeout(() => partInputRef.current?.focus(), 100);
    } catch (error) {
      toast.error("Erro ao salvar item.");
    }
  };

  // ... (handleDeleteItem, handleEditItem, handleSaveItemEdit unchanged except for toast)
  // Re-implementing handlers to ensure toast conversion is complete

  const handleDeleteItem = (itemId: number) => {
    if (!os) return;
    setConfirmModal({
      isOpen: true,
      title: "Excluir Item",
      message: "Deseja excluir este item?",
      onConfirm: async () => {
        await api.delete(`/itens-os/${itemId}`);
        loadOsItems(os.id_os);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleEditItem = (item: any) => {
    setEditingItemData({
      ...item,
      id_fornecedor: item.pagamentos_peca?.[0]?.id_fornecedor || "",
    });
    setEditItemModalOpen(true);
  };

  const handleSaveItemEdit = async () => {
    if (!editingItemData || !os) return;
    try {
      const qtd = Number(editingItemData.quantidade);
      const val = Number(editingItemData.valor_venda);
      await api.put(`/itens-os/${editingItemData.id_iten}`, {
        descricao: editingItemData.descricao,
        quantidade: qtd,
        valor_venda: val,
        valor_total: qtd * val,
        codigo_referencia: editingItemData.codigo_referencia,
        id_fornecedor: editingItemData.id_fornecedor
          ? Number(editingItemData.id_fornecedor)
          : null,
        id_pecas_estoque: editingItemData.id_pecas_estoque
          ? Number(editingItemData.id_pecas_estoque)
          : null,
      });
      loadOsItems(os.id_os);
      setEditItemModalOpen(false);
      setEditingItemData(null);
    } catch (e) {
      toast.error("Erro ao editar item.");
    }
  };

  // ... (getStatusStyle)
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "FINALIZADA":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
      case "PAGA_CLIENTE":
        return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
      case "PRONTO PARA FINANCEIRO":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
      case "ABERTA":
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
      case "EM_ANDAMENTO":
        return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
      default:
        return "bg-gray-50 text-gray-500 ring-1 ring-gray-200";
    }
  };

  const handleFinishService = async () => {
    if (!os) return;
    // ...
    // Using simple confirm for now, logic below
    setConfirmModal({
      isOpen: true,
      title: "Finalizar OS",
      message:
        "Deseja Finalizar a OS? Isso irá gerar o financeiro e mudar o status.",
      onConfirm: async () => executeFinish(),
    });
  };

  const executeFinish = async () => {
    if (!os) return;
    const totalItems = osItems.reduce(
      (acc, item) => acc + Number(item.valor_total),
      0,
    );

    const sumLaborServices = laborServices.reduce(
      (acc, l) => acc + Number(l.valor),
      0,
    );
    const finalLaborValue =
      laborServices.length > 0
        ? sumLaborServices
        : Number(os.valor_mao_de_obra || 0);

    try {
      await api.put(`/ordem-de-servico/${os.id_os}`, {
        valor_pecas: totalItems,
        valor_mao_de_obra: finalLaborValue,
        valor_total_cliente: totalItems + finalLaborValue,
        status: "PRONTO PARA FINANCEIRO",
        dt_entrega: os.dt_entrega
          ? new Date(os.dt_entrega).toISOString()
          : new Date().toISOString(),
      });
      toast.success("OS Finalizada! Enviada para Financeiro.");
      setIsDirty(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (e) {
      toast.error("Erro ao finalizar OS.");
    }
  };

  const handleSaveAndClose = async () => {
    if (!os) return;
    try {
      await api.put(`/ordem-de-servico/${os.id_os}`, {
        defeito_relatado: os.defeito_relatado,
        diagnostico: os.diagnostico,
        km_entrada: os.km_entrada,
      });
      setIsDirty(false);
      toast.success("Alterações Salvas!");
      setTimeout(() => navigate("/"), 500);
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: "Alterações Pendentes",
        message: "Deseja Salvar as alterações?",
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          handleSaveAndClose();
        },
      });
    } else {
      navigate("/");
    }
  };

  if (!os) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Carregando detalhes da OS...
      </div>
    );
  }

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-all text-neutral-500 hover:text-neutral-700 active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-700 leading-none m-0">
              OS #{os.id_os}
            </h1>
            <span className="h-6 w-px bg-neutral-300 mx-1"></span>
            <span
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(os.status)}`}
            >
              {os.status === "PRONTO PARA FINANCEIRO"
                ? "FINANCEIRO"
                : os.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      }
      subtitle="Gerencie os detalhes, peças e serviços desta Ordem de Serviço."
    >
      <div className="space-y-8">
        {/* Header Info - Using Card */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Coluna 1: Veículo */}
            <div className="md:col-span-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Veículo
                </p>
                <button
                  onClick={() =>
                    navigate(`/cadastro/${os.cliente?.id_cliente}`)
                  }
                  className="text-primary-600 hover:text-primary-700 p-0.5 hover:bg-primary-50 rounded transition-colors"
                  title="Editar Veículo"
                >
                  <Edit size={12} />
                </button>
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-neutral-700 leading-tight">
                  {os.veiculo?.modelo}
                </h3>
                <p className="text-sm font-bold text-neutral-500">
                  {os.veiculo?.cor || "Cor N/I"}
                </p>
                <div className="mt-1">
                  <span className="text-xs font-black text-white bg-neutral-600 px-2 py-0.5 rounded uppercase tracking-widest inline-block">
                    {os.veiculo?.placa}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna 2: Cliente */}
            <div className="md:col-span-4 flex flex-col md:border-l md:border-neutral-100 md:pl-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Cliente / Contato
                </p>
                <button
                  onClick={() =>
                    navigate(`/cadastro/${os.cliente?.id_cliente}`)
                  }
                  className="text-primary-600 hover:text-primary-700 p-0.5 hover:bg-primary-50 rounded transition-colors"
                  title="Editar Cliente"
                >
                  <Edit size={12} />
                </button>
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-lg text-neutral-600 leading-tight">
                  {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                    os.cliente?.pessoa_juridica?.razao_social}
                </p>
                <p className="text-sm font-medium text-neutral-500 flex items-center gap-1">
                  {os.cliente?.telefone_1 || "Sem telefone"}
                </p>
              </div>
            </div>

            {/* Coluna 3: Entrada */}
            <div className="md:col-span-2 flex flex-col md:border-l md:border-neutral-100 md:pl-6">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Data de Entrada
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-700 tabular-nums">
                  {new Date(os.dt_abertura).getDate()}
                </span>
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-bold text-neutral-500 capitalize">
                    {new Date(os.dt_abertura).toLocaleString("pt-BR", {
                      month: "long",
                    })}
                  </span>
                  <span className="text-[10px] font-medium text-neutral-400">
                    {new Date(os.dt_abertura).getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna 4: KM */}
            <div className="md:col-span-2 flex flex-col md:border-l md:border-neutral-100 md:pl-6">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                KM Atual
              </label>
              <div className="relative group w-full">
                <input
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-600 font-bold text-xl rounded-xl px-4 py-2 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all text-left"
                  type="number"
                  value={os.km_entrada}
                  onChange={(e) =>
                    setOs({ ...os, km_entrada: Number(e.target.value) })
                  }
                  onBlur={(e) =>
                    updateOSField("km_entrada", Number(e.target.value))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-300 group-focus-within:text-primary-500 uppercase tracking-wider">
                  KM
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* SPLIT LAYOUT: Defects/Diagnosis (Left) & Labor (Right) */}
        {/* SPLIT LAYOUT: Defects/Diagnosis (Smaller) & Labor (Larger) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL: Text Areas (1/3 width) */}
          <div className="space-y-4 lg:col-span-1">
            <Card className="space-y-4 p-4 h-full">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>{" "}
                  Defeito Relatado
                </label>
                <textarea
                  className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-32 outline-none focus:border-red-300 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm"
                  placeholder="Descreva o defeito..."
                  value={os.defeito_relatado || ""}
                  onChange={(e) => {
                    setOs({ ...os, defeito_relatado: e.target.value });
                    setIsDirty(true);
                  }}
                  onBlur={(e) =>
                    updateOSField("defeito_relatado", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{" "}
                  Diagnóstico Técnico
                </label>
                <textarea
                  className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-32 outline-none focus:border-neutral-200 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm"
                  placeholder="Insira o diagnóstico..."
                  value={os.diagnostico || ""}
                  onChange={(e) => {
                    setOs({ ...os, diagnostico: e.target.value });
                    setIsDirty(true);
                  }}
                  onBlur={(e) => updateOSField("diagnostico", e.target.value)}
                />
              </div>
            </Card>
          </div>

          {/* RIGHT COL: Labor Manager (2/3 width) - Now in Card */}
          <div className="w-full space-y-2 h-full lg:col-span-2">
            <Card className="h-full p-4 space-y-2">
              <h3 className="text-xs font-bold text-neutral-400  uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-neutral-50">
                <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                  <Wrench size={14} />
                </div>
                Mão de Obra
              </h3>
              <LaborManager
                mode="api"
                osId={os.id_os}
                initialData={laborServices}
                employees={employees}
                onChange={() => loadOsData()}
                readOnly={
                  os.status === "FINALIZADA" || os.status === "PAGA_CLIENTE"
                }
              />
            </Card>
          </div>
        </div>

        {/* ITENS (PEÇAS) - FULL WIDTH */}
        <div className="space-y-4 pt-4 border-t border-dashed border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-3 pb-2 border-b border-neutral-100">
            <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
              <Package size={16} />
            </div>
            Peças e Produtos
          </h3>
          {/* Form Add Item */}
          {/* Form Add Item */}
          {os.status !== "FINALIZADA" && os.status !== "PAGA_CLIENTE" && (
            <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm relative">
              <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package size={14} /> Adicionar Item / Buscar
              </h4>
              <form onSubmit={handleAddItem} className="space-y-3">
                <div className="relative group/search">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">
                    Descrição / Nome (Busca Automática)
                  </label>
                  <input
                    ref={partInputRef}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all placeholder:font-normal"
                    placeholder="Digite para buscar peças (ex: 'Oleo')..."
                    value={newItem.descricao}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewItem({ ...newItem, descricao: val });
                      handlePartSearch(val);
                      setHighlightIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (partResults.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightIndex((prev) =>
                          Math.min(prev + 1, partResults.length - 1),
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightIndex((prev) => Math.max(prev - 1, -1)); // -1 means input focus
                      } else if (e.key === "Enter") {
                        if (
                          highlightIndex >= 0 &&
                          partResults[highlightIndex]
                        ) {
                          e.preventDefault();
                          selectPart(partResults[highlightIndex]);
                          setHighlightIndex(-1);
                        }
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding to allow click
                      setTimeout(() => {
                        if (
                          !document.activeElement?.className.includes(
                            "search-result-item",
                          )
                        ) {
                          setPartResults([]);
                        }
                      }, 200);
                    }}
                  />

                  {/* SEARCH RESULTS DROPDOWN */}
                  {partResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 ring-4 ring-black/5">
                      {partResults.map((p, idx) => (
                        <button
                          key={`${p.id_pecas_estoque || "hist"}-${p.nome}-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault(); // Prevent form submit
                            selectPart(p);
                          }}
                          className={`w-full text-left p-3 text-sm font-medium border-b border-neutral-50 flex justify-between items-center group/item transition-colors search-result-item ${
                            idx === highlightIndex
                              ? "bg-blue-50 ring-1 ring-inset ring-blue-100 z-10"
                              : "hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-neutral-700 group-hover/item:text-blue-600 flex-1 flex flex-col">
                            <span className="font-bold">{p.nome}</span>
                            {p.isHistory && (
                              <span className="text-[10px] text-orange-400 uppercase font-bold tracking-wider">
                                Histórico
                              </span>
                            )}
                            {!p.isHistory && (
                              <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">
                                Estoque
                              </span>
                            )}
                          </span>

                          <div className="flex items-center gap-3">
                            {p.estoque_atual !== undefined && (
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded ${p.estoque_atual > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}
                              >
                                Qt: {p.estoque_atual}
                              </span>
                            )}
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              {formatCurrency(Number(p.valor_venda))}
                            </span>
                          </div>
                        </button>
                      ))}
                      <div className="p-2 text-[10px] text-center text-neutral-400 bg-neutral-50 border-t border-neutral-100 uppercase font-bold tracking-widest">
                        Use as setas para navegar e Enter para selecionar
                      </div>
                    </div>
                  )}

                  {newItem.id_pecas_estoque && (
                    <div className="absolute right-2 top-6 flex items-center gap-1">
                      {selectedStockInfo && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-200">
                          Disp: {selectedStockInfo.qtd}
                        </span>
                      )}
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-green-200">
                        Estoque
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">
                      Ref / Obs
                    </label>
                    <input
                      ref={referenceInputRef}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 font-bold text-sm outline-none focus:border-primary-500"
                      placeholder="..."
                      value={newItem.codigo_referencia}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          codigo_referencia: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="w-1/4">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">
                      Qtd
                    </label>
                    <input
                      ref={quantityInputRef}
                      type="number"
                      className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 font-bold text-center text-sm outline-none focus:border-primary-500"
                      placeholder="1"
                      value={newItem.quantidade}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantidade: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 font-bold text-right text-sm outline-none focus:border-primary-500"
                      placeholder="0.00"
                      value={newItem.valor_venda}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          valor_venda: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Total:{" "}
                    {formatCurrency(
                      Number(newItem.quantidade) *
                        Number(newItem.valor_venda || 0),
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-6 py-2 h-auto text-xs font-bold uppercase shadow-lg flex items-center gap-2"
                  >
                    <Plus size={16} /> Adicionar
                  </Button>
                </div>
              </form>
            </div>
          )}
          {/* List Items */}
          <Card className="p-0 overflow-hidden">
            <table className="tabela-limpa w-full">
              <thead>
                <tr>
                  <th className="w-[40%] text-left pl-6">Item</th>
                  <th className="w-[15%] text-left">Ref/Código</th>
                  <th className="w-[10%] text-center">Qtd</th>
                  <th className="w-[15%] text-right">Unit.</th>
                  <th className="w-[15%] text-right">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {osItems.map((item) => (
                  <tr
                    key={item.id_iten}
                    className="hover:bg-neutral-50 transition-colors group"
                  >
                    <td className="pl-6 py-3">
                      <div className="font-bold text-sm text-neutral-700 flex flex-wrap items-center gap-2">
                        {item.descricao}
                        {/* STATUS PAGO */}
                        {item.pagamentos_peca &&
                          item.pagamentos_peca.length > 0 &&
                          item.pagamentos_peca.some(
                            (pp: any) => pp.pago_ao_fornecedor,
                          ) && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-700 tracking-wider border border-green-200">
                              PAGO
                            </span>
                          )}
                        {/* STATUS ESTOQUE */}
                        {item.id_pecas_estoque && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700 tracking-wider border border-blue-200">
                            ESTOQUE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="text-[10px] text-neutral-400 font-medium font-mono px-2 py-0.5 rounded-md w-fit">
                        {item.codigo_referencia || "-"}
                      </div>
                    </td>
                    <td className="text-center font-bold text-neutral-600 text-xs py-3">
                      {item.quantidade}
                    </td>
                    <td className="text-right text-neutral-500 text-xs py-3">
                      {formatCurrency(Number(item.valor_venda))}
                    </td>
                    <td className="text-right font-bold text-neutral-600 text-xs py-3">
                      {formatCurrency(Number(item.valor_total))}
                    </td>
                    <td className="text-right pr-4 py-3">
                      {os.status !== "FINALIZADA" &&
                        os.status !== "PAGA_CLIENTE" && (
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Lock actions if paid */}
                            {item.pagamentos_peca &&
                            item.pagamentos_peca.length > 0 &&
                            item.pagamentos_peca.some(
                              (pp: any) => pp.pago_ao_fornecedor,
                            ) ? (
                              <span className="text-[9px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                                <DollarSign size={10} /> Pago
                              </span>
                            ) : (
                              <>
                                <ActionButton
                                  icon={Edit}
                                  label="Editar Item"
                                  onClick={() => handleEditItem(item)}
                                  variant="accent"
                                />
                                <ActionButton
                                  icon={Trash2}
                                  label="Excluir Item"
                                  onClick={() => handleDeleteItem(item.id_iten)}
                                  variant="danger"
                                />
                              </>
                            )}
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
                {osItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-neutral-300 text-xs italic"
                    >
                      Nenhum item adicionado à lista.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* SAVE & CLOSE BUTTON (New) */}
        {["ABERTA", "EM_ANDAMENTO"].includes(os.status) && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveAndClose}
              className="px-8 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl"
            >
              <Save size={18} /> Salvar e Fechar
            </Button>
          </div>
        )}

        {os.status !== "CANCELADA" && (
          <div className="mt-8 pt-8 border-t border-dashed border-red-200 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: "Cancelar Ordem de Serviço",
                  message:
                    "Tem certeza que deseja CANCELAR esta OS? Todos os itens serão devolvidos ao estoque automaticamente.",
                  onConfirm: async () => {
                    try {
                      await api.put(`/ordem-de-servico/${os.id_os}`, {
                        status: "CANCELADA",
                      });
                      toast.success("OS Cancelada e Estoque Estornado.");
                      loadOsData();
                    } catch (e) {
                      toast.error("Erro ao cancelar.");
                    }
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
              className="text-primary-500 font-bold text-xs uppercase hover:text-primary-700 flex items-center gap-2"
            >
              <Trash2 size={14} /> Apenas o Financeiro pode cancelar uma OS
            </button>
          </div>
        )}

        {/* Totals & Actions - Keep as is (below everything) */}
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-600 shadow-2xl">
          {/* Background Glow Effect */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative p-8 text-neutral-25 space-y-8">
            {/* Totals Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-neutral-600">
              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                    Peças
                  </p>
                  <p className="font-medium text-lg text-neutral-300">
                    {formatCurrency(
                      osItems.reduce(
                        (acc, i) => acc + Number(i.valor_total),
                        0,
                      ),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                    Mão de Obra
                  </p>
                  <p className="font-medium text-lg text-neutral-300">
                    {formatCurrency(
                      Number(
                        laborServices.length > 0
                          ? laborServices.reduce(
                              (acc, l) => acc + Number(l.valor),
                              0,
                            )
                          : os.valor_mao_de_obra || 0,
                      ),
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-success-500 uppercase tracking-widest mb-1">
                  VALOR TOTAL
                </p>
                <p className="font-bold text-5xl tracking-tighter text-white drop-shadow-2xl">
                  {formatCurrency(
                    osItems.reduce((acc, i) => acc + Number(i.valor_total), 0) +
                      (laborServices.length > 0
                        ? laborServices.reduce(
                            (acc, l) => acc + Number(l.valor),
                            0,
                          )
                        : Number(os.valor_mao_de_obra || 0)),
                  )}
                </p>
              </div>
            </div>

            {/* Footer Actions Row */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              {/* Payment Card - HIGH VISIBILITY REDESIGN */}
              <div className="w-full lg:w-auto flex-1 max-w-2xl bg-yellow-600/60 rounded-2xl p-2 pr-4 flex items-center justify-between border border-neutral-700/50 hover:bg-yellow-600/80 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="bg-grenn-400/20 border border-neutral-600 p-3 rounded-xl shadow-lg">
                    <DollarSign
                      className="text-success-500"
                      size={24}
                      strokeWidth={2.5}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Pagamentos Recebidos
                      </p>
                      {(() => {
                        const totalItemsVal = osItems.reduce(
                          (acc, i) => acc + Number(i.valor_total || 0),
                          0,
                        );
                        const totalLaborVal =
                          laborServices.length > 0
                            ? laborServices.reduce(
                                (acc, l) => acc + Number(l.valor || 0),
                                0,
                              )
                            : Number(os.valor_mao_de_obra || 0);
                        const totalOS = totalItemsVal + totalLaborVal;

                        const payments = os.pagamentos_cliente || [];
                        const totalPago = payments
                          .filter((p) => !p.deleted_at)
                          .reduce((acc, p) => acc + Number(p.valor), 0);

                        const isOk = totalOS - totalPago <= 0.05; // Margem de 5 centavos

                        return (
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider shadow-lg ${
                              isOk
                                ? "bg-emerald-500 text-white shadow-emerald-500/40"
                                : "bg-red-500 text-white shadow-red-500/40 animate-pulse"
                            }`}
                          >
                            {isOk ? "QUITADO" : "PENDENTE"}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="font-bold text-2xl text-neutral-25 tracking-tight">
                      {formatCurrency(
                        (os.pagamentos_cliente || [])
                          .filter((p) => !p.deleted_at)
                          .reduce((acc, p) => acc + Number(p.valor), 0),
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowPaymentModal(true)}
                  size="sm"
                  className="bg-neutral-700 text-neutral-200 border-none hover:bg-neutral-600 font-bold uppercase text-xs h-9 px-4 ml-4"
                >
                  Gerenciar
                </Button>
              </div>

              <div className="flex gap-4 w-full lg:w-auto justify-end">
                {["ABERTA", "EM_ANDAMENTO"].includes(os.status) ? (
                  <Button
                    onClick={handleFinishService}
                    variant="success"
                    className="w-full lg:w-auto px-8 py-5 h-auto text-lg font-bold uppercase tracking-widest shadow-xl shadow-success-500/20 hover:scale-105 transition-all flex-1 lg:flex-none justify-center"
                  >
                    <CheckCircle className="mr-3" size={24} strokeWidth={3} />{" "}
                    FINALIZAR OS
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    {(os.status === "PRONTO PARA FINANCEIRO" ||
                      os.status === "FINALIZADA") && (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            if (os.fechamento_financeiro) {
                              await api.delete(
                                `/fechamento-financeiro/${os.fechamento_financeiro.id_fechamento_financeiro}`,
                              );
                            }
                            await api.put(`/ordem-de-servico/${os.id_os}`, {
                              status: "ABERTA",
                            });
                            loadOsData();
                            toast.success("OS Reaberta com sucesso!");
                          } catch (e) {
                            toast.error("Erro ao reabrir OS.");
                          }
                        }}
                        className="bg-transparent border-2 border-dashed border-neutral-600 text-neutral-500 hover:text-neutral-25 hover:bg-neutral-600 hover:border-neutral-500 px-6 py-4 h-auto w-full sm:w-auto font-bold uppercase transition-all"
                      >
                        REABRIR OS
                      </Button>
                    )}
                    <div className="flex items-center justify-center gap-3 text-success-400 font-bold bg-success-500/10 px-8 py-4 rounded-xl border border-success-500/20 w-full sm:w-auto">
                      <BadgeCheck size={28} />
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] text-success-600/70 uppercase leading-none">
                          Status Atual
                        </span>
                        <span className="text-lg leading-none mt-1">
                          {os.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHARED MODALS */}
      {confirmModal.isOpen && (
        <Modal
          title={confirmModal.title}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <p className="mb-6">{confirmModal.message}</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setConfirmModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmModal.onConfirm}>
              Confirmar
            </Button>
          </div>
        </Modal>
      )}

      {editItemModalOpen && editingItemData && (
        <Modal title="Editar Item" onClose={() => setEditItemModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Descrição do Item
              </label>
              <input
                className="w-full border p-2 rounded text-sm font-medium"
                value={editingItemData.descricao}
                onChange={(e) =>
                  setEditingItemData({
                    ...editingItemData,
                    descricao: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Mais Informações (Código/Nota/Referência)
              </label>
              <input
                className="w-full border p-2 rounded text-sm font-medium"
                placeholder="Ex: Número da peça, código de referência..."
                value={editingItemData.codigo_referencia || ""}
                onChange={(e) =>
                  setEditingItemData({
                    ...editingItemData,
                    codigo_referencia: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm font-bold text-center"
                  value={editingItemData.quantidade}
                  onChange={(e) =>
                    setEditingItemData({
                      ...editingItemData,
                      quantidade: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  Valor Unit. (R$)
                </label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm font-bold text-right"
                  value={editingItemData.valor_venda}
                  onChange={(e) =>
                    setEditingItemData({
                      ...editingItemData,
                      valor_venda: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                Valor Total
              </p>
              <p className="text-xl font-bold text-primary-600">
                {formatCurrency(
                  Number(editingItemData.quantidade || 0) *
                    Number(editingItemData.valor_venda || 0),
                )}
              </p>
            </div>
            <Button onClick={handleSaveItemEdit} className="w-full mt-2">
              Salvar Alterações
            </Button>
          </div>
        </Modal>
      )}
      {showPaymentModal && os && (
        <Modal title="Pagamentos" onClose={() => setShowPaymentModal(false)}>
          {/* Lista de pagamentos existentes */}
          {os.pagamentos_cliente && os.pagamentos_cliente.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">
                Pagamentos Registrados
              </h4>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Método</th>
                      <th className="p-2 text-left">
                        Detalhes (Banco / Operadora)
                      </th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {os.pagamentos_cliente
                      .sort(
                        (a, b) =>
                          new Date(b.data_pagamento).getTime() -
                          new Date(a.data_pagamento).getTime(),
                      )
                      .map((pag) => {
                        const isDeleted = !!pag.deleted_at;
                        return (
                          <tr
                            key={pag.id_pagamento_cliente}
                            className={isDeleted ? "bg-red-50 opacity-60" : ""}
                          >
                            <td
                              className={`p-2 ${isDeleted ? "line-through" : ""}`}
                            >
                              {new Date(
                                pag.data_pagamento,
                              ).toLocaleDateString()}
                            </td>
                            <td
                              className={`p-2 font-bold ${isDeleted ? "line-through" : ""}`}
                            >
                              {pag.metodo_pagamento}
                            </td>
                            <td
                              className={`p-2 ${isDeleted ? "line-through" : ""}`}
                            >
                              {pag.metodo_pagamento === "PIX" ? (
                                pag.conta_bancaria ? (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                    {pag.conta_bancaria.nome}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )
                              ) : pag.metodo_pagamento === "CREDITO" ||
                                pag.metodo_pagamento === "DEBITO" ? (
                                <div className="flex flex-col">
                                  <span className="font-bold">
                                    {pag.operadora?.nome || "Operadora N/I"}
                                  </span>
                                  <span className="text-[10px] text-neutral-500">
                                    {pag.bandeira_cartao}{" "}
                                    {pag.qtd_parcelas > 1
                                      ? `(${pag.qtd_parcelas}x)`
                                      : ""}
                                  </span>
                                </div>
                              ) : pag.metodo_pagamento === "DINHEIRO" &&
                                pag.conta_bancaria ? (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                  {pag.conta_bancaria.nome}
                                </span>
                              ) : (
                                <span className="text-neutral-400">-</span>
                              )}
                              {pag.codigo_transacao && (
                                <div className="text-[9px] text-neutral-400 font-mono mt-0.5">
                                  ID: {pag.codigo_transacao}
                                </div>
                              )}
                            </td>
                            <td
                              className={`p-2 text-right font-bold ${isDeleted ? "line-through text-red-600" : "text-green-600"}`}
                            >
                              {formatCurrency(Number(pag.valor))}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-green-50">
                    <tr>
                      <td colSpan={3} className="p-2 font-bold text-green-700">
                        TOTAL PAGO
                      </td>
                      <td className="p-2 text-right font-bold text-green-700">
                        {formatCurrency(
                          os.pagamentos_cliente
                            .filter((p) => !p.deleted_at)
                            .reduce((acc, p) => acc + Number(p.valor), 0),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <PagamentoClienteForm
            osId={os.id_os}
            valorTotal={
              osItems.reduce((acc, i) => acc + Number(i.valor_total), 0) +
              laborServices.reduce((acc, l) => acc + Number(l.valor), 0) -
              (os.pagamentos_cliente || [])
                .filter((p) => !p.deleted_at)
                .reduce((acc, p) => acc + Number(p.valor), 0)
            }
            onSuccess={() => {
              setShowPaymentModal(false);
              loadOsData();
            }}
            onCancel={() => setShowPaymentModal(false)}
          />
        </Modal>
      )}
    </PageLayout>
  );
};
