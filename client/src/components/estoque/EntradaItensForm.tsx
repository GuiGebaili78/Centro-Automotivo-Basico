import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Edit2, Package, X, RotateCcw, Save, Edit } from "lucide-react";
import { toast } from "react-toastify";
import { Input, Button, Card, Select } from "../ui";
import { ActionButton } from "../ui/ActionButton";
import { CategoriaCombobox } from "./CategoriaCombobox";
import { CategoriaEstoqueManagerModal } from "./CategoriaEstoqueManagerModal";
import { EstoqueService } from "../../services/estoque.service";
import { CategoriaEstoqueService, type ICategoriaEstoque } from "../../services/categoriaEstoque.service";
import type { IItemEntrada, IPecasEstoque } from "../../types/estoque.types";
import { normalizeStr } from "../../utils/normalize";
import { formatCurrency } from "../../utils/formatCurrency";

interface EntradaItensFormProps {
  items: IItemEntrada[];
  setItems: (items: IItemEntrada[]) => void;
  onSubmit: () => void;
  totalValue: number;
  /** Modo edição: exibe itens já salvos com badge e permite marcá-los para remoção */
  isEditMode?: boolean;
}

export const EntradaItensForm = ({
  items,
  setItems,
  onSubmit,
  totalValue,
  isEditMode = false,
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
  const [rowCondicao, setRowCondicao] = useState("NOVO");
  const [rowAplicacao, setRowAplicacao] = useState("");
  const [rowObs, setRowObs] = useState("");
  const [rowMinStock, setRowMinStock] = useState("");
  const [rowModelo, setRowModelo] = useState("");
  const [editingTempId, setEditingTempId] = useState<number | null>(null);

  // New Part Fields (if isNewPart)
  const [newPartName, setNewPartName] = useState("");
  const [newPartDesc, setNewPartDesc] = useState("");
  const [newPartFab, setNewPartFab] = useState("");
  const [newPartLoc, setNewPartLoc] = useState("");
  const [newPartUnit, setNewPartUnit] = useState("UN");
  
  // Categorias
  const [categorias, setCategorias] = useState<ICategoriaEstoque[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      const data = await CategoriaEstoqueService.getAll();
      setCategorias(data);
    } catch (error) {
      console.error("Erro ao carregar categorias", error);
    }
  };

  const handleCostChange = (val: string) => {
    setRowCost(val);
    const cost = Number(val);
    const margin = Number(rowMargin);
    if (cost > 0 && rowMargin !== "") {
      const sale = cost + cost * (margin / 100);
      setRowSale(sale.toFixed(2));
    }
  };

  const handleMarginChange = (val: string) => {
    setRowMargin(val);
    const cost = Number(rowCost);
    const margin = Number(val);
    if (cost > 0 && val !== "") {
      const sale = cost + cost * (margin / 100);
      setRowSale(sale.toFixed(2));
    }
  };

  const handleSaleChange = (val: string) => {
    setRowSale(val);
    const cost = Number(rowCost);
    const sale = Number(val);
    if (cost > 0 && val !== "") {
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
      const exactMatch = results.find(p => normalizeStr(p.nome) === normalizeStr(q));
      if (exactMatch) { selectPart(exactMatch); return; }
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

    const cost = Number(p.valor_custo || 0);
    const sale = Number(p.valor_venda || 0);
    setRowCost(cost.toFixed(2));
    setRowSale(sale.toFixed(2));

    if (cost > 0) {
      const m = ((sale - cost) / cost) * 100;
      setRowMargin(m.toFixed(2));
    } else {
      setRowMargin("");
    }
  };

  const handleAddItem = () => {
    const isActuallyNew = isNewPart || (!selectedStockPart && partSearch.trim().length > 0);
    if (!selectedStockPart && !isActuallyNew) return;
    if (!rowQtd || !rowCost || !rowSale) {
      toast.error("Preencha quantidade, custo e venda.");
      return;
    }

    const newItem: IItemEntrada = {
      tempId: Date.now(),
      id_pecas_estoque: selectedStockPart
        ? selectedStockPart.id_pecas_estoque
        : null,
      new_part_data: {
        nome: newPartName || partSearch || selectedStockPart?.nome || "",
        descricao: newPartDesc || newPartName || partSearch,
        fabricante: newPartFab,
        localizacao: newPartLoc,
        unidade_medida: newPartUnit,
        estoque_minimo: Number(rowMinStock) || 0,
        modelo: rowModelo,
        id_categoria: selectedCategoria,
        _update_master: editingTempId !== null && !isActuallyNew,
      },
      displayName: isActuallyNew
        ? newPartName || partSearch
        : selectedStockPart?.nome || "",
      quantidade: Number(rowQtd),
      valor_custo: Number(rowCost),
      margem_lucro: Number(rowMargin),
      valor_venda: Number(rowSale),
      condicao: rowCondicao,
      aplicacao: rowAplicacao,
      obs: rowObs,
      modelo: rowModelo,
      id_categoria: selectedCategoria,
    };

    if (editingTempId !== null) {
      setItems(
        items.map((i) => {
          if (i.tempId !== editingTempId) return i;
          return { ...newItem, tempId: i.tempId, _edited: true, _editing: false, id_item_entrada: i.id_item_entrada };
        })
      );
      setEditingTempId(null);
      toast.success("Item atualizado!");
    } else {
      setItems([...items, newItem]);
    }

    // Reset Inputs
    setRowQtd("");
    setRowCost("");
    setRowMargin("");
    setRowSale("");
    setRowCondicao("NOVO");
    setRowAplicacao("");
    setRowObs("");
    setRowMinStock("");
    setRowModelo("");
    setSelectedCategoria(null);
    setSelectedStockPart(null);
    setPartSearch("");
    setIsNewPart(false);
    setNewPartName("");
    setNewPartDesc("");
    setNewPartFab("");
    setNewPartLoc("");
  };

  /** Remove item novo (sem id_item_entrada) ou marca item salvo para exclusão */
  const handleRemoveItem = (tempId: number) => {
    setItems(
      items.map((i) => {
        if (i.tempId !== tempId) return i;
        // Item já salvo no banco: marcar como _delete em vez de remover
        if ((i as any).id_item_entrada) {
          return { ...i, _delete: true };
        }
        return { ...i, _markedForRemoval: true }; // novo item ainda não salvo
      }).filter((i) => !(i as any)._markedForRemoval),
    );
  };

  /** Desfaz a marcação de exclusão de um item salvo */
  const handleRestoreItem = (tempId: number) => {
    setItems(
      items.map((i) =>
        i.tempId === tempId ? { ...i, _delete: false } : i,
      ),
    );
  };

  const handleEditItem = (item: IItemEntrada) => {
    if (item.new_part_data) {
      setIsNewPart(true);
      setPartSearch(item.new_part_data.nome);
      setNewPartName(item.new_part_data.nome);
      setNewPartFab(item.new_part_data.fabricante || "");
      setNewPartLoc(item.new_part_data.localizacao || "");
      setNewPartUnit(item.new_part_data.unidade_medida || "UN");
      setSelectedStockPart(null);
    } else {
      setIsNewPart(false);
      setPartSearch(item.displayName);
      if (item.id_pecas_estoque) {
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
    setRowCondicao(item.condicao || "NOVO");
    setRowAplicacao(item.aplicacao || "");
    setRowObs(item.obs || "");
    setRowMinStock(String(item.new_part_data?.estoque_minimo || 0));
    setRowModelo(item.new_part_data?.modelo || item.modelo || "");
    setSelectedCategoria(item.new_part_data?.id_categoria || item.id_categoria || null);

    // Marcar item como "em edição" sem soft-delete prematuro
    setEditingTempId(item.tempId);
    setItems(items.map((i) => i.tempId === item.tempId ? { ...i, _editing: true } : i));
  };

  /** Cancela a edição em andamento sem modificar o item original no banco */
  const handleCancelEdit = () => {
    setItems(items.map((i) => i.tempId === editingTempId ? { ...i, _editing: false } : i));
    setEditingTempId(null);
    setRowQtd("");
    setRowCost("");
    setRowMargin("");
    setRowSale("");
    setRowCondicao("NOVO");
    setRowAplicacao("");
    setRowObs("");
    setRowMinStock("");
    setRowModelo("");
    setSelectedCategoria(null);
    setSelectedStockPart(null);
    setPartSearch("");
    setIsNewPart(false);
    setNewPartName("");
    setNewPartDesc("");
    setNewPartFab("");
    setNewPartLoc("");
  };

  // Itens visíveis para contagem no cabeçalho (exclui novos removidos)
  const activeItems = items.filter((i) => !i._delete);

  return (
    <>
      {/* ITEM INPUT CARD */}
      <Card className="overflow-visible space-y-4">
        <h3 className="text-sm font-medium text-gray-600 uppercase border-b border-neutral-100 pb-2 flex items-center gap-2">
          <Package size={16} className="text-primary-500" /> {editingTempId !== null ? "Editar Item da Transação" : "Adicionar Item"}
        </h3>

        {selectedStockPart && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-3 shadow-sm">
            <span className="font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] shrink-0">Modo Transação</span>
            <span>Para alterar o nome, localização ou dados mestres desta peça, acesse o <strong>Perfil da Peça no Catálogo</strong>. Nesta tela, apenas os valores da nota fiscal podem ser ajustados.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Part Search / New Part Toggle */}
          <div className="relative z-20">
            <Input
              label="Buscar Peça ou Cadastrar Nova"
              icon={Search}
              disabled={editingTempId !== null && !!selectedStockPart}
              className={`${selectedStockPart ? "border-primary-500 bg-primary-50 text-primary-700 font-bold" : "border-neutral-200 bg-white font-medium"} !h-[46px] !py-3`}
              placeholder="Digite o nome, referência ou localização (ex: Prateleira)..."
              value={partSearch}
              onChange={(e) => {
                handleSearchPart(e.target.value);
                if (selectedStockPart) setSelectedStockPart(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab" || e.key === "Enter") {
                  if (partSearch.trim().length > 0 && !selectedStockPart) {
                    setIsNewPart(true);
                    setNewPartName(partSearch);
                    setPartResults([]);
                    if (e.key === "Enter") e.preventDefault();
                  }
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (partSearch.trim().length > 0 && !selectedStockPart && !isNewPart) {
                    setIsNewPart(true);
                    setNewPartName(partSearch);
                    setPartResults([]);
                  }
                }, 200);
              }}
            />
              {partResults.length > 0 && !selectedStockPart && (
                <div className="absolute w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                  {partResults.map((p) => (
                    <button
                      key={p.id_pecas_estoque}
                      onClick={() => selectPart(p)}
                      className="w-full text-left p-3 hover:bg-neutral-50 flex flex-col gap-1 border-b border-neutral-100 last:border-0 transition-colors"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-neutral-800 uppercase text-sm">{p.nome}</span>
                        <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded uppercase ring-1 ring-neutral-200">
                          {p.estoque_atual} {p.unidade_medida || "UN"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 font-medium uppercase mt-1">
                        {p.fabricante && <span>Marca: {p.fabricante}</span>}
                        {p.ref_cod && <span>Ref: {p.ref_cod}</span>}
                        {p.localizacao && <span className="text-amber-600 font-semibold bg-amber-50 px-1 rounded">Loc: {p.localizacao}</span>}
                        {p.aplicacao && <span className="text-primary-600 font-semibold bg-primary-50 px-1 rounded">Aplica: {p.aplicacao}</span>}
                      </div>
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

          {/* New Part: Extra Fields Always Visible but Disabled if not new and not editing */}
          <div className="grid grid-cols-4 gap-2">
            {/* NOVO CAMPO: MODELO - Posicionado entre Busca e Fabricante */}
            <div>
              <Input
                label="Modelo"
                placeholder="Ex: Palio, Uno..."
                value={rowModelo}
                disabled={!!selectedStockPart}
                onChange={(e) => setRowModelo(e.target.value)}
              />
            </div>
            
            <div>
              <Input
                label="Fabricante"
                placeholder="Marca"
                value={newPartFab}
                disabled={!!selectedStockPart}
                onChange={(e) => setNewPartFab(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Localização"
                placeholder="Ex: Prateleira A"
                value={newPartLoc}
                disabled={!!selectedStockPart}
                onChange={(e) => setNewPartLoc(e.target.value)}
              />
            </div>
            <Select
              label="Unidade"
              className="!h-[46px] !p-3 bg-white"
              value={newPartUnit}
              disabled={!!selectedStockPart}
              onChange={(e: any) => setNewPartUnit(e.target.value)}
            >
              <option value="UN">Unidade (UN)</option>
              <option value="L">Litro (L)</option>
              <option value="KG">Quilo (KG)</option>
              <option value="KIT">Kit</option>
              <option value="PAR">Par</option>
            </Select>
          </div>
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
              onChange={(e) => handleCostChange(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Margem (%)"
              type="number"
              className="text-center font-medium"
              placeholder="%"
              value={rowMargin}
              onChange={(e) => handleMarginChange(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Venda (R$)"
              type="number"
              className="text-right border-emerald-200 bg-emerald-50 text-emerald-800 font-bold"
              placeholder="0.00"
              value={rowSale}
              disabled={!!selectedStockPart && editingTempId !== null}
              onChange={(e) => handleSaleChange(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 relative z-10">
            <CategoriaCombobox
              categorias={categorias}
              selectedId={selectedCategoria}
              onChange={setSelectedCategoria}
              onManageClick={() => setShowCatModal(true)}
              disabled={!!selectedStockPart}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Condição"
              className="!h-[46px] !p-3 bg-white"
              value={rowCondicao}
              onChange={(e: any) => setRowCondicao(e.target.value)}
            >
              <option value="NOVO">Novo</option>
              <option value="USADO">Usado</option>
              <option value="RECONDICIONADO">Recondicionado</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Aplicação (Opc)"
              placeholder="Ex: Gol G5 1.0"
              value={rowAplicacao}
              onChange={(e) => setRowAplicacao(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Aviso Est. (Opc)"
              type="number"
              className="text-center font-bold text-orange-600 border-orange-200"
              value={rowMinStock}
              disabled={!!selectedStockPart}
              onChange={(e) => setRowMinStock(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex flex-col justify-end">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className="text-xs text-neutral-500 font-medium">Total:</span>
              <span className="font-bold text-sm text-primary-700">
                {Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(rowQtd || 0) * Number(rowCost || 0))}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {editingTempId !== null && (
                <Button
                  onClick={handleCancelEdit}
                  className="w-full"
                  variant="ghost"
                  icon={RotateCcw}
                >
                  Cancelar Edição
                </Button>
              )}
              <Button
                onClick={handleAddItem}
                className="w-full"
                variant="primary"
                icon={editingTempId !== null ? Save : Plus}
              >
                {editingTempId !== null ? "ATUALIZAR ITEM" : "ADICIONAR"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* CART LIST */}
      <Card className="p-0 overflow-hidden border-neutral-200">
        <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-600 uppercase">
            Itens na Lista
          </h3>
          <span className="text-xs font-bold text-neutral-400">
            {activeItems.length} itens
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-fixed w-full tabela-limpa">
            <thead>
              <tr className="bg-neutral-50 text-sm font-medium text-gray-600">
                <th className="w-1/4 p-4 text-left">Produto</th>
                <th className="w-1/12 p-4 text-center">Qtd</th>
                <th className="w-[12%] p-4 text-right">Custo</th>
                <th className="w-[10%] p-4 text-right">Margem</th>
                <th className="w-[12%] p-4 text-right">Venda</th>
                <th className="w-[12%] p-4 text-right">Subtotal</th>
                <th className="w-1/6 p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const isDeleted = i._delete;
                const isSaved = !!i.id_item_entrada;

                return (
                  <tr
                    key={i.tempId}
                    className={`transition-colors group ${
                      isDeleted
                        ? "bg-red-50/60 opacity-60"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <td className="w-1/4 p-4 break-words">
                      <div className="flex flex-col">
                        <span
                          className={`text-base text-gray-900 font-medium ${isDeleted ? "line-through text-red-500" : ""}`}
                        >
                          {i.displayName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          {i.modelo && <span>Mod: {i.modelo}</span>}
                          {i.condicao && <span>Cond: {i.condicao}</span>}
                          {i.aplicacao && <span>Apli: {i.aplicacao}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {i.new_part_data && (
                            <span className="text-sm bg-blue-100 text-blue-700 w-fit px-1 rounded uppercase font-bold">
                              NOVO CADASTRO
                            </span>
                          )}
                          {isSaved && !isDeleted && !i._edited && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-200">
                              JÁ SALVO
                            </span>
                          )}

                          {i._edited && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase border border-purple-200">
                              EDITADO
                            </span>
                          )}

                          {i._editing && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200 animate-pulse">
                              EM EDIÇÃO...
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`w-1/12 p-4 text-center text-base text-gray-900 font-medium ${isDeleted ? "line-through text-red-400" : ""}`}>
                      {i.quantidade}
                    </td>
                    <td className={`w-[12%] p-4 text-right text-base text-gray-900 font-medium ${isDeleted ? "line-through text-red-400" : ""}`}>
                      {formatCurrency(i.valor_custo)}
                    </td>
                    <td className={`w-[10%] p-4 text-right text-base text-primary-600 font-medium ${isDeleted ? "opacity-50" : ""}`}>
                      {i.margem_lucro?.toFixed(1)}%
                    </td>
                    <td className={`w-[12%] p-4 text-right text-base text-gray-900 font-bold ${isDeleted ? "line-through text-red-400" : ""}`}>
                      {formatCurrency(i.valor_venda)}
                    </td>
                    <td className={`w-[12%] p-4 text-right text-base text-gray-500 font-medium ${isDeleted ? "line-through text-red-400" : ""}`}>
                      {formatCurrency(i.quantidade * i.valor_custo)}
                    </td>
                    <td className="w-1/6">
                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isDeleted ? (
                          // Botão para desfazer exclusão
                          <ActionButton
                            icon={RotateCcw}
                            label="Desfazer"
                            variant="neutral"
                            onClick={() => handleRestoreItem(i.tempId)}
                          />
                        ) : (
                          <>
                            <ActionButton
                              icon={Edit}
                              label="Editar"
                              variant="neutral"
                              onClick={() => handleEditItem(i)}
                              disabled={(editingTempId !== null && i.tempId !== editingTempId) || (i as any)._delete}
                            />

                            <ActionButton
                              icon={Trash2}
                              label="Remover"
                              variant="danger"
                              onClick={() => handleRemoveItem(i.tempId)}
                              disabled={(editingTempId !== null && i.tempId !== editingTempId) || (i as any)._delete}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
              <p className="text-sm font-medium text-gray-600 uppercase">
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
              {isEditMode ? "SALVAR ALTERAÇÕES" : "FINALIZAR ENTRADA"}
            </Button>
          </div>
        )}
      </Card>
      {/* MODAL DE CATEGORIAS */}
      <CategoriaEstoqueManagerModal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        onUpdate={loadCategorias}
      />
    </>
  );
};
