/**
 * UnifiedSearch
 *
 * Campo de busca dinâmica da Dashboard (Monitor).
 * Busca por: nome do cliente, telefone, placa, modelo de veículo,
 * nome da peça/equipamento e fabricante.
 *
 * Suporta navegação por teclado: ↑↓ para mover, Enter para selecionar, ESC para fechar.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Car, Wrench, Plus, Loader2, X } from "lucide-react";
import { api } from "../../services/api";
import { Button } from "../ui";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SearchResultType = "veiculo" | "equipamento" | "cliente" | "os";

export interface SearchResult {
  type: SearchResultType;
  display: string;
  subtext: string;
  id_cliente: number;
  id_veiculo?: number;
  id_equipamento?: number;
  id_os?: number;
  /** Exibida no badge direito para veículos. */
  placa?: string;
}

interface UnifiedSearchProps {
  onSelect: (result: SearchResult) => void;
  onNewRecord: () => void;
  placeholder?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function clientDisplayName(c: any): string {
  return (
    c.pessoa_fisica?.pessoa?.nome ||
    c.pessoa_juridica?.nome_fantasia ||
    c.pessoa_juridica?.razao_social ||
    "Cliente"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const UnifiedSearch = ({
  onSelect,
  onNewRecord,
  placeholder = "Buscar por cliente, placa, modelo ou peça avulsa...",
}: UnifiedSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fechar ao clicar fora ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Scroll automático do item ativo ──
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li[data-selectable]");
    (items[activeIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Reset do activeIndex quando a lista muda ──
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // ── Busca com debounce 250ms ──
  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data: allOs } = await api.get("/ordem-servico", {
          params: { search: val, status: "ABERTA,ORCAMENTO", take: 10 }
        });
        
        const matches: SearchResult[] = [];

        allOs.forEach((os: any) => {
          const clientName = clientDisplayName(os.cliente || {});
          const itemDesc = os.veiculo ? `${os.veiculo.modelo} (${os.veiculo.placa})` : os.equipamento ? os.equipamento.nome_peca : "Sem Veículo/Peça";
          
          matches.push({
            type: "os",
            display: `OS #${os.id_os} — ${clientName}`,
            subtext: `${itemDesc} • Status: ${os.status}`,
            id_cliente: os.id_cliente,
            id_veiculo: os.id_veiculo,
            id_equipamento: os.id_equipamento,
            id_os: os.id_os,
            placa: os.veiculo?.placa,
          });
        });

        setResults(matches);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  // ── Seleciona o item ativo ou o resultado clicado ──
  const selectResult = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      setIsOpen(false);
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    },
    [onSelect]
  );

  // ── Navegação por teclado ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") {
        setQuery("");
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 >= results.length ? 0 : prev + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev - 1 < 0 ? results.length - 1 : prev - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0) {
          selectResult(results[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
        setResults([]);
        break;
    }
  };

  // ── Ícone e cor por tipo de resultado ──
  const typeConfig: Record<
    SearchResultType,
    { icon: React.ReactNode; bg: string; text: string; badge: string }
  > = {
    veiculo: {
      icon: <Car size={17} />,
      bg: "bg-blue-100",
      text: "text-blue-600",
      badge: "Veículo",
    },
    equipamento: {
      icon: <Wrench size={17} />,
      bg: "bg-amber-100",
      text: "text-amber-600",
      badge: "Peça",
    },
    cliente: {
      icon: <User size={17} />,
      bg: "bg-emerald-100",
      text: "text-emerald-600",
      badge: "Cliente",
    },
    os: {
      icon: <Search size={17} />,
      bg: "bg-purple-100",
      text: "text-purple-600",
      badge: "OS",
    },
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* ── Input ── */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-primary-500 transition-colors">
          {loading ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <Search size={19} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-20 h-[44px] border-2 border-neutral-200 rounded-xl bg-white placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-semibold text-neutral-800 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `search-option-${activeIndex}` : undefined
          }
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                setResults([]);
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[10px] font-bold text-neutral-400 tracking-wide">
            ESC
          </kbd>
        </div>
      </div>

      {/* ── Dropdown de resultados ── */}
      {isOpen && (
        <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-neutral-200 overflow-hidden max-h-[420px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 z-50">
          {results.length > 0 ? (
            <>
              {/* Cabeçalho com contagem */}
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">
                  {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium hidden sm:block">
                  ↑↓ navegar · Enter selecionar
                </p>
              </div>

              <ul ref={listRef} role="listbox">
                {results.map((result, idx) => {
                  const cfg = typeConfig[result.type];
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      id={`search-option-${idx}`}
                      key={`${result.id_cliente}-${result.id_veiculo ?? ""}-${result.id_equipamento ?? ""}-${idx}`}
                      data-selectable
                      role="option"
                      aria-selected={isActive}
                      className={`px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors group
                        ${isActive ? "bg-primary-50" : "hover:bg-primary-50"}`}
                      onClick={() => selectResult(result)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 transition-transform ${cfg.bg} ${cfg.text}
                            ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                        >
                          {cfg.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-bold text-sm truncate transition-colors
                              ${isActive ? "text-primary-700" : "text-neutral-900 group-hover:text-primary-700"}`}
                          >
                            {result.display}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5 font-medium truncate">
                            {result.subtext}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {result.placa && (
                            <span className="px-1.5 py-0.5 bg-neutral-900 text-white rounded text-[10px] tracking-[0.12em] font-mono font-bold">
                              {result.placa}
                            </span>
                          )}
                          <span
                            className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.badge}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : loading ? (
            <div className="p-6 text-center">
              <Loader2 size={24} className="animate-spin text-primary-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-400 font-medium">Buscando...</p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-neutral-600 font-bold text-sm mb-1">
                Nenhum resultado encontrado
              </p>
              <p className="text-xs text-neutral-400 mb-4">
                Tente outro nome, placa ou peça — ou cadastre um novo cliente.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                className="w-full justify-center"
                onClick={() => {
                  onNewRecord();
                  setIsOpen(false);
                }}
              >
                Cadastrar Novo Cliente / Veículo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
