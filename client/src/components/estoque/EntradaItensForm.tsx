import { useState, useEffect } from "react";
import { Package, Search, Plus, Trash2, Edit, Save } from "lucide-react";
import { toast } from "react-toastify";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ActionButton } from "../ui/ActionButton";
import { formatCurrency } from "../../utils/formatCurrency";
import { EstoqueService } from "../../services/estoque.service";
import type { IItemEntrada, IPecasEstoque } from "../../types/estoque.types";

interface EntradaItensFormProps {
  items: IItemEntrada[];
  setItems: (items: IItemEntrada[]) => void;
  onSubmit: () => void;
  totalValue: number;
}

export const EntradaItensForm = ({
  items,
  setItems,
  onSubmit,
  totalValue,
}: EntradaItensFormProps) => {
  // New Item Input State
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<IPecasEstoque[]>([]);
  const [selectedStockPart, setSelectedStockPart] =
    useState<IPecasEstoque | null>(null);
  const [isNewPart, setIsNewPart] = useState(false);

  // Row Inputs
  const [rowQtd, setRowQtd] = useState("");
  const [rowCost, setRowCost] = useState("");
  const [rowMargin, setRowMargin] = useState("");
  const [rowSale, setRowSale] = useState("");
  const [rowRef, setRowRef] = useState("");
  const [rowObs, setRowObs] = useState("");
  const [rowMinStock, setRowMinStock] = useState("");

  // New Part Fields (if isNewPart)
  const [newPartName, setNewPartName] = useState("");
  const [newPartDesc, setNewPartDesc] = useState("");
  const [newPartFab, setNewPartFab] = useState("");
  const [newPartUnit, setNewPartUnit] = useState("UN");

  // Price Calc Effect
  useEffect(() => {
    if (rowCost && rowMargin) {
      const cost = Number(rowCost);
      const margin = Number(rowMargin);
      const sale = cost + cost * (margin / 100);
      setRowSale(sale.toFixed(2));
    }
  }, [rowCost, rowMargin]);

  useEffect(() => {
    if (rowCost && rowSale && !rowMargin) {
      const cost = Number(rowCost);
      const sale = Number(rowSale);
      if (cost > 0) {
        const margin = ((sale - cost) / cost) * 100;
        setRowMargin(margin.toFixed(2));
      }
    }
  }, [rowSale, rowCost]);

  const handleRecalcMargin = (saleVal: string) => {
    setRowSale(saleVal);
    const cost = Number(rowCost);
    const sale = Number(saleVal);
    if (cost > 0 && sale > 0) {
      const m = ((sale - cost) / cost) * 100;
      setRowMargin(m.toFixed(2));
    }
  };

  const handleSearchPart = async (q: string) => {
    setPartSearch(q);
    if (q.length < 2) {
      setPartResults([]);
      return;
    }
    try {
      const results = await EstoqueService.searchParts(q);
      setPartResults(results);
    } catch (e) {
      console.error(e);
    }
  };

  const selectPart = (p: IPecasEstoque) => {
    setSelectedStockPart(p);
    setPartSearch(p.nome);
    setPartResults([]);
    setIsNewPart(false);

    setRowSale(Number(p.valor_venda || 0).toFixed(2));
    setRowCost(Number(p.valor_custo || 0).toFixed(2)); // Suggest last cost
  };

  const handleAddItem = () => {
    if (!selectedStockPart && !isNewPart) return;
    if (!rowQtd || !rowCost || !rowSale) {
      toast.error("Preencha quantidade, custo e venda.");
      return;
    }

    const newItem: IItemEntrada = {
      tempId: Date.now(),
      id_pecas_estoque: selectedStockPart
        ? selectedStockPart.id_pecas_estoque
        : null,
      new_part_data: isNewPart
        ? {
            nome: newPartName || partSearch,
            descricao: newPartDesc || newPartName || partSearch,
            fabricante: newPartFab,
            unidade_medida: newPartUnit,
            estoque_minimo: Number(rowMinStock) || 0,
          }
        : null,
      displayName: isNewPart
        ? newPartName || partSearch
        : selectedStockPart?.nome || "",
      quantidade: Number(rowQtd),
      valor_custo: Number(rowCost),
      margem_lucro: Number(rowMargin),
      valor_venda: Number(rowSale),
      ref_cod: rowRef,
      obs: rowObs,
    };

    setItems([...items, newItem]);

    // Reset Inputs
    setRowQtd("");
    setRowCost("");
    setRowMargin("");
    setRowSale("");
    setRowRef("");
    setRowObs("");
    setRowMinStock("");
    setSelectedStockPart(null);
    setPartSearch("");
    setIsNewPart(false);
    setNewPartName("");
    setNewPartDesc("");
    setNewPartFab("");
  };

  const handleRemoveItem = (tempId: number) => {
    setItems(items.filter((i) => i.tempId !== tempId));
  };

  const handleEditItem = (item: IItemEntrada) => {
    // Load item back into inputs
    if (item.new_part_data) {
      setIsNewPart(true);
      setPartSearch(item.new_part_data.nome);
      setNewPartName(item.new_part_data.nome);
      setNewPartFab(item.new_part_data.fabricante || "");
      setNewPartUnit(item.new_part_data.unidade_medida || "UN");
      setSelectedStockPart(null);
    } else {
      setIsNewPart(false);
      setPartSearch(item.displayName);
      if (item.id_pecas_estoque) {
        // We don't have the full object here, but we can mock it enough for selection
        // or just set the ID and display name.
        // For simplicity, we just won't re-select the stock part object fully from DB
        // but we'll set the ID so logic knows it's an existing part.
        // To be safe, try to fetch it or just rely on ID.
        // Let's rely on the fact we store ID.
        // Wait, selectPart expects IPecasEstoque.
        // We will just simulate it.
        setSelectedStockPart({
          id_pecas_estoque: item.id_pecas_estoque,
          nome: item.displayName,
          valor_custo: item.valor_custo,
          valor_venda: item.valor_venda,
        } as IPecasEstoque);
      }
    }

    setRowQtd(String(item.quantidade));
    setRowCost(String(item.valor_custo));
    setRowMargin(String(item.margem_lucro));
    setRowSale(String(item.valor_venda));
    setRowRef(item.ref_cod || "");
    setRowObs(item.obs || "");
    setRowMinStock(String(item.new_part_data?.estoque_minimo || 0));

    // Remove from list so it can be re-added
    handleRemoveItem(item.tempId);
  };

  return (
    <>
      {/* ITEM INPUT CARD */}
      <Card className="overflow-visible space-y-4">
        <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2 flex items-center gap-2">
          <Package size={16} className="text-primary-500" /> Adicionar Item
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Part Search / New Part Toggle */}
          <div className="relative z-20">
            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
              Buscar Peça ou Cadastrar Nova
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                size={18}
              />
              <input
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${selectedStockPart ? "border-primary-500 bg-primary-50 text-primary-700 font-bold" : "border-neutral-200 bg-white font-medium"} outline-none focus:border-primary-500 transition-all h-[46px]`}
                placeholder="Digite o nome da peça..."
                value={partSearch}
                onChange={(e) => {
                  handleSearchPart(e.target.value);
                  if (selectedStockPart) setSelectedStockPart(null);
                }}
              />
              {partResults.length > 0 && !selectedStockPart && (
                <div className="absolute w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                  {partResults.map((p) => (
                    <button
                      key={p.id_pecas_estoque}
                      onClick={() => selectPart(p)}
                      className="w-full text-left p-3 hover:bg-neutral-50 flex justify-between border-b border-neutral-50 last:border-0"
                    >
                      <span className="font-bold text-neutral-700">
                        {p.nome}
                      </span>
                      <span className="text-xs font-medium text-neutral-400">
                        {p.fabricante} • {p.estoque_atual} un
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setIsNewPart(true);
                      setNewPartName(partSearch);
                      setPartResults([]);
                      setSelectedStockPart(null);
                    }}
                    className="w-full text-left p-3 bg-primary-50 text-primary-700 font-bold hover:bg-primary-100 flex items-center gap-2"
                  >
                    <Plus size={16} /> Cadastrar Nova Peça: "{partSearch}"
                  </button>
                </div>
              )}
              {partResults.length === 0 &&
                partSearch.length > 2 &&
                !selectedStockPart &&
                !isNewPart && (
                  <div className="absolute w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-xl p-2 z-50">
                    <button
                      onClick={() => {
                        setIsNewPart(true);
                        setNewPartName(partSearch);
                        setPartResults([]);
                        setSelectedStockPart(null);
                      }}
                      className="w-full text-left p-3 bg-primary-50 text-primary-700 font-bold hover:bg-primary-100 flex items-center gap-2 rounded-lg"
                    >
                      <Plus size={16} /> Cadastrar Nova Peça: "{partSearch}"
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* If New Part: Extra Fields */}
          {isNewPart && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
              <div>
                <Input
                  label="Fabricante"
                  placeholder="Marca"
                  value={newPartFab}
                  onChange={(e) => setNewPartFab(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
                  Unidade
                </label>
                <select
                  className="w-full p-3 rounded-xl border border-neutral-200 bg-white font-medium h-[46px]"
                  value={newPartUnit}
                  onChange={(e) => setNewPartUnit(e.target.value)}
                >
                  <option value="UN">Unidade (UN)</option>
                  <option value="L">Litro (L)</option>
                  <option value="KG">Quilo (KG)</option>
                  <option value="KIT">Kit</option>
                  <option value="PAR">Par</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Values Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
          <div className="md:col-span-2">
            <Input
              label="Qtd"
              type="number"
              className="text-center font-bold"
              value={rowQtd}
              onChange={(e) => setRowQtd(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Custo (R$)"
              type="number"
              className="text-right font-medium"
              placeholder="0.00"
              value={rowCost}
              onChange={(e) => setRowCost(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Margem (%)"
              type="number"
              className="text-center font-medium"
              placeholder="%"
              value={rowMargin}
              onChange={(e) => setRowMargin(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Venda (R$)"
              type="number"
              className="text-right border-emerald-200 bg-emerald-50 text-emerald-800 font-bold"
              placeholder="0.00"
              value={rowSale}
              onChange={(e) => handleRecalcMargin(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Ref/Cod (Opc)"
              value={rowRef}
              onChange={(e) => setRowRef(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Aviso Est. (Opc)"
              type="number"
              className="text-center font-bold text-orange-600 border-orange-200"
              value={rowMinStock}
              onChange={(e) => setRowMinStock(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button
              onClick={handleAddItem}
              className="w-full"
              variant="primary"
              icon={Plus}
            >
              ADICIONAR
            </Button>
          </div>
        </div>
      </Card>

      {/* CART LIST */}
      <Card className="p-0 overflow-hidden border-neutral-200">
        <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest">
            Itens na Lista
          </h3>
          <span className="text-xs font-bold text-neutral-400">
            {items.length} itens
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="tabela-limpa w-full">
            <thead>
              <tr>
                <th className="w-[30%]">Produto</th>
                <th className="w-[10%] text-center">Qtd</th>
                <th className="w-[12%] text-right">Custo</th>
                <th className="w-[10%] text-right">Margem</th>
                <th className="w-[12%] text-right">Venda</th>
                <th className="w-[12%] text-right">Subtotal</th>
                <th className="w-[14%] text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.tempId}
                  className="hover:bg-neutral-50 transition-colors group"
                >
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-800">
                        {i.displayName}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {i.ref_cod}
                      </span>
                      {i.new_part_data && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 w-fit px-1 rounded uppercase font-bold mt-1">
                          NOVO CADASTRO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center font-bold text-neutral-700">
                    {i.quantidade}
                  </td>
                  <td className="text-right text-neutral-600">
                    {formatCurrency(i.valor_custo)}
                  </td>
                  <td className="text-right text-blue-600 font-medium">
                    {i.margem_lucro?.toFixed(1)}%
                  </td>
                  <td className="text-right font-bold text-neutral-800">
                    {formatCurrency(i.valor_venda)}
                  </td>
                  <td className="text-right text-neutral-500 font-mono">
                    {formatCurrency(i.quantidade * i.valor_custo)}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton
                        icon={Edit}
                        label="Editar"
                        variant="neutral"
                        onClick={() => handleEditItem(i)}
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Remover"
                        variant="danger"
                        onClick={() => handleRemoveItem(i.tempId)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-neutral-400 italic"
                  >
                    Nenhum item adicionado à lista de compra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-neutral-100 flex justify-end items-center gap-8 border-t border-neutral-200">
            <div className="text-right">
              <p className="text-xs font-bold text-neutral-500 uppercase">
                Total da Compra
              </p>
              <p className="text-3xl font-black text-neutral-800 tracking-tight">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <Button
              onClick={onSubmit}
              variant="primary"
              className="h-14 px-8 text-lg shadow-xl shadow-primary-500/20"
              icon={Save}
            >
              FINALIZAR ENTRADA
            </Button>
          </div>
        )}
      </Card>
    </>
  );
};
