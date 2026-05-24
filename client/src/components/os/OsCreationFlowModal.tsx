import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Loader2,
  User,
  Car,
  Wrench,
  ChevronLeft,
  Plus,
  Save,
} from "lucide-react";
import { ActionButton } from "../ui/ActionButton";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ClienteService } from "../../services/cliente.service";
import { EquipamentoService } from "../../services/equipamento.service";
import { VeiculoForm } from "../veiculos/Forms/VeiculoForm";
import {
  EquipamentoFormSection,
  type EquipamentoFormSectionRef,
} from "../clientes/Forms/EquipamentoFormSection";
import type { ICliente, IVeiculo, IEquipamentoCliente } from "../../types/backend";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type FlowStep = "search" | "select-asset";

/** Item genérico para a lista do STEP 2 (veículo ou equipamento unificados). */
interface AssetItem {
  kind: "vehicle" | "equipment";
  id: number;
  label: string;
  sublabel?: string;
  raw: IVeiculo | IEquipamentoCliente;
}

export interface OsCreationFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOs: (
    clientId: number,
    vehicleId?: number,
    equipamentoId?: number
  ) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getClientName(c: ICliente): string {
  return (
    c.pessoa_fisica?.pessoa?.nome ||
    c.pessoa_juridica?.nome_fantasia ||
    c.pessoa_juridica?.razao_social ||
    "Cliente"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FLOW MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function OsCreationFlowModal({
  isOpen,
  onClose,
  onOpenOs,
}: OsCreationFlowModalProps) {
  const navigate = useNavigate();

  // ── Flow state ──
  const [step, setStep] = useState<FlowStep>("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ICliente[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ICliente | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);

  // ── Keyboard navigation: índice ativo na lista corrente ──
  const [activeIndex, setActiveIndex] = useState(-1);

  // ── Quick modals ──
  const [quickModal, setQuickModal] = useState<"vehicle" | "equipment" | null>(null);
  const [isSavingEquip, setIsSavingEquip] = useState(false);
  const equipFormRef = useRef<EquipamentoFormSectionRef>(null);

  // ── Refs ──
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fecha apenas o flow modal ──
  const closeFlowModal = useCallback(() => {
    setStep("search");
    setSearchTerm("");
    setSearchResults([]);
    setSelectedClient(null);
    setQuickModal(null);
    setActiveIndex(-1);
    onClose();
  }, [onClose]);

  // ── Dispara onOpenOs e reseta o flow (sem chamar onClose) ──
  const triggerOs = useCallback(
    (clientId: number, vehicleId?: number, equipamentoId?: number) => {
      onOpenOs(clientId, vehicleId, equipamentoId);
      setStep("search");
      setSearchTerm("");
      setSearchResults([]);
      setSelectedClient(null);
      setQuickModal(null);
      setActiveIndex(-1);
    },
    [onOpenOs]
  );

  // ── Foco automático e reset ao abrir ──
  useEffect(() => {
    if (isOpen) {
      setStep("search");
      setSearchTerm("");
      setSearchResults([]);
      setSelectedClient(null);
      setQuickModal(null);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Reset do activeIndex quando a lista muda ──
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchResults, selectedClient, step]);

  // ── Scroll automático do item ativo para a view ──
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Busca com debounce 300ms ──
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await ClienteService.search(val.trim());
        setSearchResults(raw as unknown as ICliente[]);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // ── Carga do cliente completo (com veículos + equipamentos) ──
  const handleClientSelect = async (clientePartial: ICliente) => {
    setIsLoadingClient(true);
    try {
      const full = await ClienteService.getById(clientePartial.id_cliente);
      setSelectedClient(full);
      setStep("select-asset");
    } catch {
      setSelectedClient(clientePartial);
      setStep("select-asset");
    } finally {
      setIsLoadingClient(false);
    }
  };

  // ── Lista unificada de ativos do STEP 2 ──
  const assetItems: AssetItem[] = selectedClient
    ? [
        ...(selectedClient.veiculos ?? []).map((v): AssetItem => ({
          kind: "vehicle",
          id: v.id_veiculo,
          label: `${v.modelo || "Modelo N/I"}${v.cor ? ` — ${v.cor}` : ""}`,
          sublabel: [v.placa, v.marca, v.ano_modelo].filter(Boolean).join(" • "),
          raw: v,
        })),
        ...(selectedClient.equipamentos ?? []).map((eq): AssetItem => ({
          kind: "equipment",
          id: eq.id_equipamento,
          label: eq.nome_peca,
          sublabel: eq.fabricante || undefined,
          raw: eq,
        })),
      ]
    : [];

  // ── Seleciona um ativo da lista unificada ──
  const selectAsset = (item: AssetItem) => {
    if (item.kind === "vehicle") {
      triggerOs(selectedClient!.id_cliente, item.id, undefined);
    } else {
      triggerOs(selectedClient!.id_cliente, undefined, item.id);
    }
  };

  // ── VeiculoForm onSuccess ──
  const handleVehicleFormSuccess = (novoVeiculo: IVeiculo) => {
    setQuickModal(null);
    triggerOs(selectedClient!.id_cliente, novoVeiculo.id_veiculo, undefined);
  };

  // ── Equipamento: submit via ref ──
  const handleEquipamentoSave = async () => {
    if (!equipFormRef.current || !selectedClient) return;
    const data = equipFormRef.current.getData();

    if (!data.nome_peca.trim()) {
      toast.error("O nome da peça é obrigatório.");
      return;
    }

    const clientId = selectedClient.id_cliente;
    setIsSavingEquip(true);
    try {
      const novo = await EquipamentoService.create({
        id_cliente: clientId,
        nome_peca: data.nome_peca.trim(),
        fabricante: data.fabricante.trim() || undefined,
        numeracao: data.numeracao.trim() || undefined,
        observacoes: data.observacoes.trim() || undefined,
      });
      setQuickModal(null);
      triggerOs(clientId, undefined, novo.id_equipamento);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao cadastrar peça. Tente novamente.";
      toast.error(msg);
    } finally {
      setIsSavingEquip(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NAVEGAÇÃO POR TECLADO
  // Gerenciada no nível do input (STEP 1) e do painel (STEP 2).
  // ─────────────────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Sub-modais abertos: ignora (eles gerenciam o próprio teclado)
    if (quickModal) return;

    if (step === "search") {
      const list = searchResults;
      if (list.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 >= list.length ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 < 0 ? list.length - 1 : prev - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleClientSelect(list[activeIndex]);
      }
    }

    if (step === "select-asset") {
      if (assetItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev + 1 >= assetItems.length ? 0 : prev + 1
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev - 1 < 0 ? assetItems.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        selectAsset(assetItems[activeIndex]);
      } else if (e.key === "Backspace" || e.key === "Escape") {
        // ESC no STEP 2 volta para a busca (antes de fechar o modal)
        if (e.key === "Escape") {
          e.stopPropagation(); // evita fechar o modal inteiro
          setStep("search");
        }
      }
    }
  };

  // ── ESC fecha o flow (apenas quando não há sub-modal aberto) ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !quickModal && step === "search") {
        closeFlowModal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, quickModal, step, closeFlowModal]);

  if (!isOpen) return null;

  const selectedClientName = selectedClient ? getClientName(selectedClient) : "";

  // Separa os ativos por tipo para exibir em seções distintas
  const vehicleItems = assetItems.filter((a) => a.kind === "vehicle");
  const equipItems = assetItems.filter((a) => a.kind === "equipment");

  // Offset do activeIndex dentro da lista unificada para cada seção
  const vehicleOffset = 0;
  const equipOffset = vehicleItems.length;

  return createPortal(
    <>
      {/* ══════════════════════════════════════════════════════════════
          MODAL PRINCIPAL
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        style={{ zIndex: 50 }}
        onClick={(e) => e.target === e.currentTarget && closeFlowModal()}
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
            <div className="flex items-center gap-3">
              {step === "select-asset" && (
                <button
                  onClick={() => setStep("search")}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
                  aria-label="Voltar para busca"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <h2 className="text-lg font-black text-neutral-900">
                  {step === "search"
                    ? "Nova Ordem de Serviço"
                    : "Selecionar Veículo ou Peça"}
                </h2>
                {step === "search" && (
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">
                    Passo 1 de 2 — Busque o cliente
                  </p>
                )}
                {step === "select-asset" && (
                  <p className="text-xs text-neutral-500 font-medium mt-0.5 truncate max-w-[260px] sm:max-w-xs">
                    Cliente:{" "}
                    <span className="font-black text-neutral-700">
                      {selectedClientName}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <ActionButton
              icon={X}
              label="Fechar"
              onClick={closeFlowModal}
              variant="neutral"
            />
          </div>

          {/* ── Body scrollável ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">

            {/* ═══ STEP 1: Busca de cliente ═══ */}
            {step === "search" && (
              <div className="p-5 space-y-4">
                {/* Input de busca — captura as setas e Enter aqui */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    {isSearching || isLoadingClient ? (
                      <Loader2 size={18} className="animate-spin text-primary-500" />
                    ) : (
                      <Search size={18} className="text-neutral-400" />
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    className="block w-full pl-10 pr-9 h-[44px] border-2 border-neutral-200 rounded-xl bg-white placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-semibold text-neutral-800 text-sm"
                    placeholder="Nome do cliente ou telefone..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    aria-activedescendant={
                      activeIndex >= 0 ? `client-option-${activeIndex}` : undefined
                    }
                    aria-autocomplete="list"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSearchResults([]);
                        setActiveIndex(-1);
                        inputRef.current?.focus();
                      }}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                      aria-label="Limpar busca"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Dica de navegação teclado (aparece quando há resultados) */}
                {searchResults.length > 0 && (
                  <p className="text-[11px] text-neutral-400 font-medium px-1 -mt-1">
                    ↑↓ navegar &nbsp;·&nbsp; Enter selecionar
                  </p>
                )}

                {/* Aguardando digitação */}
                {searchTerm.length < 2 && !isSearching && (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User size={26} className="text-primary-400" />
                    </div>
                    <p className="text-sm font-bold text-neutral-600">
                      Digite o nome ou telefone do cliente
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Mínimo de 2 caracteres para iniciar a busca
                    </p>
                  </div>
                )}

                {/* Buscando */}
                {isSearching && searchTerm.length >= 2 && (
                  <div className="text-center py-10">
                    <Loader2 size={28} className="animate-spin text-primary-400 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400 font-medium">Buscando clientes...</p>
                  </div>
                )}

                {/* Resultados */}
                {!isSearching && searchResults.length > 0 && (
                  <ul
                    ref={listRef}
                    role="listbox"
                    className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden"
                  >
                    {searchResults.map((c, idx) => {
                      const name = getClientName(c);
                      const phone = (c as any).telefone_1 || "";
                      const isActive = idx === activeIndex;
                      return (
                        <li
                          id={`client-option-${idx}`}
                          key={c.id_cliente}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleClientSelect(c)}
                          className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors group
                            ${isActive
                              ? "bg-primary-50 ring-2 ring-inset ring-primary-400"
                              : "hover:bg-primary-50"
                            }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform
                              ${isActive
                                ? "bg-primary-500 text-white scale-105"
                                : "bg-emerald-100 text-emerald-600 group-hover:scale-105"
                              }`}
                          >
                            <User size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-bold truncate transition-colors
                                ${isActive ? "text-primary-700" : "text-neutral-900 group-hover:text-primary-700"}`}
                            >
                              {name}
                            </p>
                            {phone && (
                              <p className="text-xs text-neutral-500 mt-0.5 font-medium">{phone}</p>
                            )}
                          </div>
                          <ChevronLeft
                            size={16}
                            className={`rotate-180 shrink-0 transition-colors
                              ${isActive ? "text-primary-400" : "text-neutral-300 group-hover:text-primary-400"}`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Sem resultados */}
                {!isSearching && searchResults.length === 0 && searchTerm.length >= 2 && (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search size={24} className="text-amber-400" />
                    </div>
                    <p className="text-sm font-bold text-neutral-700 mb-1">Nenhum cliente encontrado</p>
                    <p className="text-xs text-neutral-400 mb-5">Tente outro nome ou cadastre um novo cliente.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={() => { closeFlowModal(); navigate("/novo-cadastro"); }}
                    >
                      Novo Cadastro
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ STEP 2: Seleção de veículo / equipamento ═══ */}
            {step === "select-asset" && selectedClient && (
              <div
                className="p-5 space-y-5 outline-none"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                // Recebe foco automaticamente para capturar setas
                ref={(el) => {
                  if (el && step === "select-asset") setTimeout(() => el.focus(), 50);
                }}
              >
                {/* Dica de navegação */}
                {assetItems.length > 0 && (
                  <p className="text-[11px] text-neutral-400 font-medium">
                    ↑↓ navegar pelos itens &nbsp;·&nbsp; Enter selecionar
                  </p>
                )}

                {/* Banner do cliente */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Cliente Selecionado</p>
                    <p className="text-sm font-black text-neutral-800 truncate">{selectedClientName}</p>
                  </div>
                </div>

                {/* ── Veículos ── */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Car size={13} /> Veículos
                    </h4>
                    <span className="text-xs text-neutral-400 font-medium">
                      {vehicleItems.length} cadastrado(s)
                    </span>
                  </div>

                  {vehicleItems.length > 0 ? (
                    <ul
                      ref={step === "select-asset" ? listRef : undefined}
                      role="listbox"
                      className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden"
                    >
                      {vehicleItems.map((item, idx) => {
                        const globalIdx = vehicleOffset + idx;
                        const isActive = globalIdx === activeIndex;
                        const v = item.raw as IVeiculo;
                        return (
                          <li
                            key={item.id}
                            role="option"
                            aria-selected={isActive}
                            onClick={() => selectAsset(item)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group
                              ${isActive
                                ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                                : "hover:bg-blue-50"
                              }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform
                                ${isActive
                                  ? "bg-blue-500 text-white scale-105"
                                  : "bg-blue-100 text-blue-600 group-hover:scale-105"
                                }`}
                            >
                              <Car size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate transition-colors
                                ${isActive ? "text-blue-700" : "text-neutral-800 group-hover:text-blue-700"}`}>
                                {item.label}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {v.placa && (
                                  <span className="px-1.5 py-0.5 bg-neutral-900 text-white rounded text-[10px] tracking-[0.12em] font-mono font-bold">
                                    {v.placa}
                                  </span>
                                )}
                                {v.marca && <span className="text-xs text-neutral-400 font-medium">{v.marca}</span>}
                                {v.ano_modelo && <span className="text-xs text-neutral-400 font-medium">{v.ano_modelo}</span>}
                              </div>
                            </div>
                            <ChevronLeft
                              size={16}
                              className={`rotate-180 shrink-0 transition-colors
                                ${isActive ? "text-blue-400" : "text-neutral-300 group-hover:text-blue-400"}`}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="border border-dashed border-neutral-200 rounded-xl py-5 text-center">
                      <p className="text-xs text-neutral-400 font-medium">Nenhum veículo cadastrado para este cliente.</p>
                    </div>
                  )}
                </div>

                {/* ── Equipamentos / Peças ── */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Wrench size={13} /> Peças / Equipamentos
                    </h4>
                    <span className="text-xs text-neutral-400 font-medium">
                      {equipItems.length} cadastrado(s)
                    </span>
                  </div>

                  {equipItems.length > 0 ? (
                    <ul
                      role="listbox"
                      className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden"
                    >
                      {equipItems.map((item, idx) => {
                        const globalIdx = equipOffset + idx;
                        const isActive = globalIdx === activeIndex;
                        return (
                          <li
                            key={item.id}
                            role="option"
                            aria-selected={isActive}
                            onClick={() => selectAsset(item)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group
                              ${isActive
                                ? "bg-amber-50 ring-2 ring-inset ring-amber-400"
                                : "hover:bg-amber-50"
                              }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform
                                ${isActive
                                  ? "bg-amber-500 text-white scale-105"
                                  : "bg-amber-100 text-amber-600 group-hover:scale-105"
                                }`}
                            >
                              <Wrench size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate transition-colors
                                ${isActive ? "text-amber-700" : "text-neutral-800 group-hover:text-amber-700"}`}>
                                {item.label}
                              </p>
                              {item.sublabel && (
                                <p className="text-xs text-neutral-400 font-medium mt-0.5">{item.sublabel}</p>
                              )}
                            </div>
                            <ChevronLeft
                              size={16}
                              className={`rotate-180 shrink-0 transition-colors
                                ${isActive ? "text-amber-400" : "text-neutral-300 group-hover:text-amber-400"}`}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="border border-dashed border-neutral-200 rounded-xl py-5 text-center">
                      <p className="text-xs text-neutral-400 font-medium">Nenhuma peça/equipamento cadastrado para este cliente.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer (só no STEP 2) ── */}
          {step === "select-asset" && selectedClient && (
            <div className="shrink-0 px-5 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="outline"
                size="sm"
                icon={Car}
                className="flex-1 justify-center"
                onClick={() => setQuickModal("vehicle")}
              >
                Novo Veículo
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Wrench}
                className="flex-1 justify-center"
                onClick={() => setQuickModal("equipment")}
              >
                Nova Peça Avulsa
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SUB-MODAL: NOVO VEÍCULO
      ══════════════════════════════════════════════════════════════ */}
      {quickModal === "vehicle" && selectedClient && (
        <Modal
          title="Novo Veículo"
          onClose={() => setQuickModal(null)}
          className="max-w-2xl"
          zIndex={60}
        >
          <VeiculoForm
            clientId={selectedClient.id_cliente}
            onSuccess={handleVehicleFormSuccess}
            onCancel={() => setQuickModal(null)}
          />
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUB-MODAL: NOVA PEÇA AVULSA
      ══════════════════════════════════════════════════════════════ */}
      {quickModal === "equipment" && selectedClient && (
        <Modal
          title="Nova Peça / Equipamento"
          onClose={() => setQuickModal(null)}
          className="max-w-md"
          zIndex={60}
        >
          <div className="space-y-5">
            <EquipamentoFormSection ref={equipFormRef} />
            <div className="flex gap-3 pt-2 border-t border-neutral-100">
              <Button
                variant="ghost"
                onClick={() => setQuickModal(null)}
                disabled={isSavingEquip}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon={Save}
                isLoading={isSavingEquip}
                onClick={handleEquipamentoSave}
                className="flex-1"
              >
                Salvar e Abrir OS
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>,
    document.body
  );
}
