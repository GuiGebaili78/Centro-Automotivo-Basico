import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { formatCurrency } from "../utils/formatCurrency";

import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { IOrdemDeServico } from "../types/backend";
import {
  Search,
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

import { StatusBanner } from "../components/ui/StatusBanner";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ActionButton } from "../components/ui/ActionButton";
import { PagamentoClienteForm } from "../components/forms/PagamentoClienteForm";
import { LaborManager } from "../components/os/LaborManager";

export const OrdemDeServicoDetalhePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [os, setOs] = useState<IOrdemDeServico | null>(null);
  const [osItems, setOsItems] = useState<any[]>([]);
  const [laborServices, setLaborServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });
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
      setStatusMsg({ type: "error", text: "Erro ao carregar OS." });
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
      setStatusMsg({ type: "error", text: "Erro ao carregar itens." });
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
      setStatusMsg({ type: "error", text: "Erro ao salvar alteração." });
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

  const selectPart = (p: any) => {
    setNewItem({
      ...newItem,
      id_pecas_estoque: String(p.id_pecas_estoque),
      valor_venda: String(p.valor_venda),
      descricao: p.nome,
    });
    setPartSearch(p.nome);
    setPartResults([]);
    setHighlightIndex(-1);
    setIsDirty(true);
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
        setStatusMsg({ type: "success", text: "Item adicionado/atualizado!" });
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
        setStatusMsg({ type: "success", text: "Item adicionado!" });
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
      setTimeout(() => setStatusMsg({ type: null, text: "" }), 1500);
      requestAnimationFrame(() => partInputRef.current?.focus());
      setTimeout(() => partInputRef.current?.focus(), 100);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao salvar item." });
    }
  };

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
      setStatusMsg({ type: "error", text: "Erro ao editar item." });
    }
  };

  const handleFinishService = async () => {
    if (!os) return;

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
      setStatusMsg({
        type: "success",
        text: "OS Finalizada! Enviada para Financeiro.",
      });
      setIsDirty(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      setTimeout(() => {
        setStatusMsg({ type: null, text: "" });
        navigate("/ordem-de-servico");
      }, 1000);
    } catch (e) {
      setStatusMsg({ type: "error", text: "Erro ao finalizar OS." });
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
      setStatusMsg({ type: "success", text: "Alterações Salvas!" });
      setTimeout(() => navigate("/ordem-de-servico"), 500);
    } catch (e) {
      setStatusMsg({ type: "error", text: "Erro ao salvar." });
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
      navigate("/ordem-de-servico");
    }
  };

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

  if (!os) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Carregando detalhes da OS...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {statusMsg.text && (
        <div className="fixed bottom-8 right-8 z-60">
          <StatusBanner
            msg={statusMsg}
            onClose={() => setStatusMsg({ type: null, text: "" })}
          />
        </div>
      )}

      {/* HEADER with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-600"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-neutral-600 tracking-tight">
              OS #{os.id_os}
            </h1>
            <span
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${getStatusStyle(os.status)}`}
            >
              {os.status === "PRONTO PARA FINANCEIRO"
                ? "FINANCEIRO"
                : os.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-neutral-25 rounded-2xl border border-neutral-200 items-center shadow-sm">
          {/* Coluna 1: Veículo */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Veículo
            </p>
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-neutral-600 leading-none tracking-tight">
                {os.veiculo?.modelo} - {os.veiculo?.cor || "Cor N/I"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-neutral-600 uppercase tracking-widest  px-2 py-0.5 rounded-md">
                  {os.veiculo?.placa}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Cliente */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Cliente / Contato
            </p>
            <div className="flex flex-col">
              <p className="font-bold text-lg text-neutral-600 leading-tight">
                {os.cliente?.pessoa_fisica?.pessoa?.nome ||
                  os.cliente?.pessoa_juridica?.razao_social}
              </p>
              <p className="text-sm font-medium text-neutral-600 flex items-center gap-1">
                {os.cliente?.telefone_1 || "Sem telefone"}
              </p>
            </div>
          </div>

          {/* Coluna 3: Entrada */}
          <div className="flex flex-col gap-1 border-l-2 border-neutral-200 pl-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Data de Entrada
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-neutral-700 tabular-nums">
                {new Date(os.dt_abertura).getDate()}
              </span>
              <span className="text-sm font-medium text-neutral-500 capitalize">
                {new Date(os.dt_abertura).toLocaleString("pt-BR", {
                  month: "long",
                })}
              </span>
              <span className="text-sm font-normal text-neutral-400">
                {new Date(os.dt_abertura).getFullYear()}
              </span>
            </div>
          </div>

          {/* Coluna 4: KM */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              KM Atual
            </label>
            <div className="relative group">
              <input
                className="w-full bg-neutral-50 border border-neutral-200 text-neutral-600 font-bold text-xl rounded-xl px-4 py-2 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all"
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

        {/* SPLIT LAYOUT: Defects/Diagnosis (Left) & Labor (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT COL: Text Areas */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>{" "}
                Defeito Relatado
              </label>
              <textarea
                className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-24 outline-none focus:border-red-300 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm"
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
                className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-24 outline-none focus:border-neutral-200 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm"
                placeholder="Insira o diagnóstico..."
                value={os.diagnostico || ""}
                onChange={(e) => {
                  setOs({ ...os, diagnostico: e.target.value });
                  setIsDirty(true);
                }}
                onBlur={(e) => updateOSField("diagnostico", e.target.value)}
              />
            </div>
          </div>

          {/* RIGHT COL: Labor Manager */}
          <div className="w-full space-y-2 h-full">
            <h3 className="text-xs font-bold text-neutral-400  uppercase tracking-widest flex items-center gap-2 pl-1">
              <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                <Wrench size={14} />
              </div>
              Mão de Obra
            </h3>
            <div className="h-full neutral-25bg-neutral-25 rounded-xl  overflow-hidden">
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
            </div>
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
          {os.status !== "FINALIZADA" && os.status !== "PAGA_CLIENTE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LEFT: MANUAL FORM / SELECTED ITEM */}
              <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm relative">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package size={14} /> Item a Inserir
                </h4>
                <form onSubmit={handleAddItem} className="space-y-3">
                  <div className="relative">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">
                      Descrição / Nome
                    </label>
                    <input
                      ref={partInputRef}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all"
                      placeholder="Nome do Item ou Serviço"
                      value={newItem.descricao}
                      onChange={(e) =>
                        setNewItem({ ...newItem, descricao: e.target.value })
                      }
                    />
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

              {/* RIGHT: STOCK SEARCH */}
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 shadow-sm relative">
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Search size={14} /> Buscar no Estoque
                </h4>
                <div className="relative group">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-500 transition-colors"
                    size={18}
                  />
                  <input
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-100 bg-neutral-25 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 font-bold text-sm text-blue-600 transition-all shadow-sm placeholder:text-blue-200"
                    placeholder="Digite para buscar peças..."
                    value={partSearch}
                    onChange={(e) => {
                      handlePartSearch(e.target.value);
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
                  />
                  {partResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-neutral-25 border border-blue-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                      {partResults.map((p, idx) => (
                        <button
                          key={p.id_pecas_estoque || p.nome}
                          onClick={async () => {
                            // Custom Select Logic for Stock Items
                            try {
                              const res = await api.get(
                                `/pecas-estoque/${p.id_pecas_estoque}/availability`,
                              );
                              const partDetails = res.data;

                              setNewItem({
                                ...newItem,
                                id_pecas_estoque: String(
                                  partDetails.id_pecas_estoque,
                                ),
                                valor_venda: Number(
                                  partDetails.valor_venda,
                                ).toFixed(2),
                                descricao: partDetails.nome,
                                codigo_referencia: "",
                              });

                              const freeStock =
                                (partDetails.estoque_atual || 0) -
                                (partDetails.reserved || 0);
                              setSelectedStockInfo({
                                qtd: freeStock,
                                reserved: partDetails.reserved,
                              }); // Store stock info

                              if (freeStock < 2) {
                                setStatusMsg({
                                  type: "error",
                                  text: `⚠️ Estoque Baixo! Disp: ${freeStock} (Reservado: ${partDetails.reserved || 0})`,
                                });
                              } else if (partDetails.reserved > 0) {
                                setStatusMsg({
                                  type: "success",
                                  text: `Item selecionado. Disp: ${freeStock} (Reservado em outras OS: ${partDetails.reserved})`,
                                });
                              } else {
                                setStatusMsg({
                                  type: "success",
                                  text: `Item selecionado do estoque.`,
                                });
                                setTimeout(
                                  () => setStatusMsg({ type: null, text: "" }),
                                  1500,
                                );
                              }

                              setPartSearch("");
                              setPartResults([]);
                              requestAnimationFrame(() =>
                                referenceInputRef.current?.focus(),
                              );
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`w-full text-left p-3 text-sm font-medium border-b border-neutral-50 flex justify-between group/item transition-colors ${idx === highlightIndex ? "bg-blue-50 ring-1 ring-inset ring-blue-100 z-10" : "hover:bg-neutral-50"}`}
                        >
                          <span className="text-neutral-700 group-hover/item:text-blue-600 flex-1">
                            {p.nome}
                          </span>
                          {p.estoque_atual !== undefined && (
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded mr-2">
                              Qt: {p.estoque_atual}
                            </span>
                          )}
                          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {formatCurrency(Number(p.valor_venda))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-[9px] text-blue-400 font-medium">
                  Use as setas para navegar e Enter para selecionar.
                </div>
              </div>
            </div>
          )}
          {/* List Items */}
          <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-25 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="p-3 pl-4 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    Item
                  </th>
                  <th className="p-3 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    Ref/Código
                  </th>
                  <th className="p-3 text-[10px] uppercase font-bold text-neutral-400 tracking-wider text-center">
                    Qtd
                  </th>
                  <th className="p-3 text-[10px] uppercase font-bold text-neutral-400 tracking-wider text-right">
                    Unit.
                  </th>
                  <th className="p-3 text-[10px] uppercase font-bold text-neutral-400 tracking-wider text-right">
                    Total
                  </th>
                  <th className="p-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 bg-primary-100">
                {osItems.map((item) => (
                  <tr
                    key={item.id_iten}
                    className="hover:bg-neutral-50/50 transition-colors group"
                  >
                    <td className="p-3 pl-4">
                      <div className="font-bold text-sm text-neutral-700">
                        {item.descricao}
                        {/* STATUS PAGO */}
                        {item.pagamentos_peca &&
                          item.pagamentos_peca.length > 0 &&
                          item.pagamentos_peca.some(
                            (pp: any) => pp.pago_ao_fornecedor,
                          ) && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-700 tracking-wider border border-green-200">
                              PAGO
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-[10px] text-neutral-400 font-medium font-mono px-2 py-0.5 rounded-md w-fit">
                        {item.codigo_referencia || "-"}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-neutral-600 text-xs">
                      {item.quantidade}
                    </td>
                    <td className="p-3 text-right text-neutral-500 text-xs">
                      {formatCurrency(Number(item.valor_venda))}
                    </td>
                    <td className="p-3 text-right font-bold text-neutral-600 text-xs">
                      {formatCurrency(Number(item.valor_total))}
                    </td>
                    <td className="p-3 text-right pr-4">
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
          </div>
        </div>

        {/* SAVE & CLOSE BUTTON (New) */}
        {["ABERTA", "EM_ANDAMENTO"].includes(os.status) && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveAndClose}
              className="bg-neutral-600 text-neutral-200 border border-neutral-700 hover:bg-neutral-600 shadow-lg px-8 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2"
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
                      setStatusMsg({
                        type: "success",
                        text: "OS Cancelada e Estoque Estornado.",
                      });
                      loadOsData();
                    } catch (e) {
                      setStatusMsg({
                        type: "error",
                        text: "Erro ao cancelar.",
                      });
                    }
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }}
              className="text-red-500 font-bold text-xs uppercase hover:text-red-700 flex items-center gap-2"
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
                <p className="font-bold text-5xl tracking-tighter text-neutral-25 drop-shadow-lg">
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
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isOk ? "bg-success-500/20 text-success-400" : "bg-red-500/70 text-neutral-400"}`}
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
                            setStatusMsg({
                              type: "success",
                              text: "OS Reaberta com sucesso!",
                            });
                          } catch (e) {
                            setStatusMsg({
                              type: "error",
                              text: "Erro ao reabrir OS.",
                            });
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
            <Button variant="danger" onClick={confirmModal.onConfirm}>
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
    </div>
  );
};
