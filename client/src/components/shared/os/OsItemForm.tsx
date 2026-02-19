import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "../../ui/Button";
import { formatCurrency } from "../../../utils/formatCurrency";
import { toast } from "react-toastify";
import { api } from "../../../services/api"; // For direct availability check if needed, or pass via props

interface OsItemFormProps {
  onAdd: (item: any) => Promise<boolean>;
  onSearch: (query: string) => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;
}

export const OsItemForm = ({
  onAdd,
  onSearch,
  searchResults,
  setSearchResults,
}: OsItemFormProps) => {
  const [newItem, setNewItem] = useState({
    id_pecas_estoque: "",
    quantidade: "1",
    valor_venda: "",
    descricao: "",
    codigo_referencia: "",
    id_fornecedor: "",
  });

  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [selectedStockInfo, setSelectedStockInfo] = useState<{
    qtd: number;
    reserved: number;
  } | null>(null);

  const partInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPart = async (p: any) => {
    // Basic update
    setNewItem((prev) => ({
      ...prev,
      id_pecas_estoque: p.id_pecas_estoque ? String(p.id_pecas_estoque) : "",
      valor_venda: p.valor_venda ? String(p.valor_venda) : "",
      descricao: p.nome,
    }));

    // Clear search results
    setSearchResults([]);
    setHighlightIndex(-1);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await onAdd(newItem);
    if (success) {
      setNewItem({
        id_pecas_estoque: "",
        quantidade: "1",
        valor_venda: "",
        descricao: "",
        codigo_referencia: "",
        id_fornecedor: "",
      });
      setSelectedStockInfo(null);
      requestAnimationFrame(() => partInputRef.current?.focus());
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm relative">
      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Package size={14} /> Adicionar Item / Buscar
      </h4>
      <form onSubmit={handleSubmit} className="space-y-3">
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
              onSearch(val);
              setHighlightIndex(-1);
            }}
            onKeyDown={(e) => {
              if (searchResults.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  Math.min(prev + 1, searchResults.length - 1),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((prev) => Math.max(prev - 1, -1));
              } else if (e.key === "Enter") {
                if (highlightIndex >= 0 && searchResults[highlightIndex]) {
                  e.preventDefault();
                  handleSelectPart(searchResults[highlightIndex]);
                }
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                if (
                  !document.activeElement?.className.includes(
                    "search-result-item",
                  )
                ) {
                  setSearchResults([]);
                }
              }, 200);
            }}
          />

          {/* SEARCH RESULTS DROPDOWN */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 ring-4 ring-black/5">
              {searchResults.map((p, idx) => (
                <button
                  key={`${p.id_pecas_estoque || "hist"}-${p.nome}-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectPart(p);
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

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3">
            <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">
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
          <div className="col-span-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 text-center">
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
          <div className="col-span-4">
            <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 text-center">
              Valor (R$)
            </label>
            <input
              type="number"
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 font-bold text-center text-sm outline-none focus:border-primary-500"
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
          <div className="col-span-3">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 h-[42px] text-xs font-bold uppercase shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
