import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { StatusBanner } from "../components/ui/StatusBanner";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { FornecedorForm } from "../components/forms/FornecedorForm";
import { Plus, Search, Trash2, Save, ShoppingCart, Edit } from "lucide-react";

export const EntradaEstoquePage = () => {
  // Header State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);

  // Items Logic
  const [items, setItems] = useState<any[]>([]);

  // New Item Input State
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<any[]>([]);
  const [selectedStockPart, setSelectedStockPart] = useState<any | null>(null);
  const [isNewPart, setIsNewPart] = useState(false);

  // Row Inputs
  const [rowQtd, setRowQtd] = useState("");
  const [rowCost, setRowCost] = useState("");
  const [rowMargin, setRowMargin] = useState("");
  const [rowSale, setRowSale] = useState("");
  const [rowRef, setRowRef] = useState("");
  const [rowObs, setRowObs] = useState("");

  // New Part Fields (if isNewPart)
  const [newPartName, setNewPartName] = useState("");
  const [newPartDesc, setNewPartDesc] = useState("");
  const [newPartFab, setNewPartFab] = useState("");
  const [newPartUnit, setNewPartUnit] = useState("UN");

  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // Load Suppliers
  useEffect(() => {
    api
      .get("/fornecedor")
      .then((res) => setSuppliers(res.data))
      .catch(console.error);
  }, []);

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
      const res = await api.get(`/pecas-estoque/search?q=${q}`);
      setPartResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const selectPart = (p: any) => {
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
      setStatusMsg({
        type: "error",
        text: "Preencha quantidade, custo e venda.",
      });
      return;
    }

    const newItem = {
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
          }
        : null,
      displayName: isNewPart
        ? newPartName || partSearch
        : selectedStockPart.nome,
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

  const handleEditItem = (item: any) => {
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
      setSelectedStockPart({
        id_pecas_estoque: item.id_pecas_estoque,
        nome: item.displayName,
        valor_custo: item.valor_custo,
        valor_venda: item.valor_venda,
      });
    }

    setRowQtd(String(item.quantidade));
    setRowCost(String(item.valor_custo));
    setRowMargin(String(item.margem_lucro));
    setRowSale(String(item.valor_venda));
    setRowRef(item.ref_cod || "");
    setRowObs(item.obs || "");

    // Remove from list so it can be re-added
    handleRemoveItem(item.tempId);
  };

  // --- FINANCIAL MODAL STATE ---
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [finDesc, setFinDesc] = useState("");
  const [finValue, setFinValue] = useState("");
  const [finDueDate, setFinDueDate] = useState("");
  const [finPaid, setFinPaid] = useState(false);
  const [finPayDate, setFinPayDate] = useState("");

  const handlePreSubmit = () => {
    if (!selectedSupplierId) {
      setStatusMsg({ type: "error", text: "Selecione um Fornecedor." });
      return;
    }
    if (items.length === 0) {
      setStatusMsg({ type: "error", text: "Adicione pelo menos um item." });
      return;
    }

    // Pre-fill Financial Data
    const supplierObj = suppliers.find(
      (s) => s.id_fornecedor === Number(selectedSupplierId),
    );
    const supplierName =
      supplierObj?.nome_fantasia || supplierObj?.nome || "Fornecedor";
    setFinDesc(`Compra Estoque - NF ${invoice || "S/N"} - ${supplierName}`);
    const total = items.reduce(
      (acc, i) => acc + i.quantidade * i.valor_custo,
      0,
    );
    setFinValue(total.toFixed(2));
    setFinDueDate(date); // Default due date = purchase date
    setFinPayDate(new Date().toISOString().split("T")[0]); // Default pay date = today
    setFinPaid(false); // Default to Unpaid as per user request

    setShowFinancialModal(true);
  };

  const handleFinalSubmit = async () => {
    try {
      const payload = {
        id_fornecedor: Number(selectedSupplierId),
        nota_fiscal: invoice,
        data_compra: new Date(date),
        obs: obs,
        itens: items,
        financeiro: {
          descricao: finDesc,
          valor: Number(finValue),
          dt_vencimento: finDueDate,
          dt_pagamento: finPaid ? finPayDate : null,
          status: finPaid ? "PAGO" : "PENDENTE",
        },
      };

      await api.post("/pecas-estoque/entry", payload);

      setStatusMsg({
        type: "success",
        text: "Entrada e Financeiro Registrados com Sucesso!",
      });
      setShowFinancialModal(false);

      // Clear All
      setItems([]);
      setInvoice("");
      setObs("");
    } catch (e) {
      console.error(e);
      setStatusMsg({ type: "error", text: "Erro ao processar entrada." });
    }
  };

  return (
    <div className="w-full mx-auto px-4 md:px-8 py-6 space-y-6">
      {statusMsg.text && (
        <div className="fixed bottom-8 right-8 z-50">
          <StatusBanner
            msg={statusMsg}
            onClose={() => setStatusMsg({ type: null, text: "" })}
          />
        </div>
      )}

      {/* NEW FINANCIAL MODAL */}
      {showFinancialModal && (
        <Modal
          title="Registrar Contas a Pagar / Pagamento"
          onClose={() => setShowFinancialModal(false)}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
              <p className="text-sm text-blue-800 font-bold">
                Confirme os dados financeiros desta compra.
              </p>
              <p className="text-xs text-blue-600">
                Isso irá gerar um registro em Contas a Pagar e, se pago, no
                Livro Caixa.
              </p>
            </div>

            <div>
              <Input
                label="Descrição"
                value={finDesc}
                onChange={(e) => setFinDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Valor Total (R$)"
                  type="number"
                  value={finValue}
                  readOnly
                  className="bg-neutral-100 font-bold text-neutral-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={finDueDate}
                  onChange={(e) => setFinDueDate(e.target.value)}
                  className="w-full border border-neutral-200 p-3 rounded-xl outline-none focus:border-blue-500 font-medium h-[46px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border border-neutral-100 rounded-xl bg-neutral-50">
              <input
                type="checkbox"
                id="chkPaid"
                checked={finPaid}
                onChange={(e) => setFinPaid(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
              <label
                htmlFor="chkPaid"
                className="font-bold text-neutral-700 cursor-pointer select-none"
              >
                Á vista / Já Pago?
              </label>
            </div>

            {finPaid && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={finPayDate}
                  onChange={(e) => setFinPayDate(e.target.value)}
                  className="w-full border p-3 rounded-xl outline-none focus:border-green-500 font-medium border-green-200 bg-green-50 h-[46px]"
                />
              </div>
            )}

            <div className="flex justify-end pt-4 gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowFinancialModal(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleFinalSubmit}>
                CONFIRMAR
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <ShoppingCart className="text-primary-600" /> Nova Compra / Entrada de
          Estoque
        </h1>
        <p className="text-neutral-500">
          Registre novas aquisições de peças e atualize o estoque
          automaticamente.
        </p>
      </div>

      {/* HEADER CARD */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <div className="flex justify-between items-baseline mb-1">
            <label className="block text-xs font-bold text-neutral-400 uppercase">
              Fornecedor
            </label>
            <button
              onClick={() => setShowNewSupplierModal(true)}
              className="text-[10px] font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 uppercase bg-primary-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              <Plus size={10} /> Novo Fornecedor
            </button>
          </div>
          <select
            className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500 transition-all h-[46px]"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {suppliers.map((s) => (
              <option key={s.id_fornecedor} value={s.id_fornecedor}>
                {s.nome_fantasia || s.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">
            Data Compra
          </label>
          <input
            type="date"
            className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500 h-[46px]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Nota Fiscal / Recibo"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="Nº NF"
          />
        </div>
      </div>

      {/* ITEM INPUT CARD */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 relative overflow-visible">
        <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2">
          Adicionar Item à Compra
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
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${selectedStockPart ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 bg-neutral-50"} font-bold outline-none focus:border-primary-500 transition-all h-[46px]`}
                placeholder="Digite o nome da peça..."
                value={partSearch}
                onChange={(e) => {
                  handleSearchPart(e.target.value);
                  if (selectedStockPart) setSelectedStockPart(null); // Clear selection if typing again
                  // If unknown, allow switch to new
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
          <div>
            <Input
              label="Quantidade"
              type="number"
              className="text-center font-bold"
              value={rowQtd}
              onChange={(e) => setRowQtd(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Custo Unit (R$)"
              type="number"
              className="text-right font-medium"
              placeholder="0.00"
              value={rowCost}
              onChange={(e) => setRowCost(e.target.value)}
            />
          </div>
          <div className="relative">
            <Input
              label="Margem (%)"
              type="number"
              className="text-center font-medium"
              placeholder="%"
              value={rowMargin}
              onChange={(e) => setRowMargin(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Venda Unit (R$)"
              type="number"
              className="text-right border-primary-200 bg-primary-50 text-primary-800 font-bold"
              placeholder="0.00"
              value={rowSale}
              onChange={(e) => handleRecalcMargin(e.target.value)}
            />
          </div>
          <div className="flex items-end">
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

        {/* Extra Details Row */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Código Ref/Fabricante (Opcional)"
            value={rowRef}
            onChange={(e) => setRowRef(e.target.value)}
          />
          <Input
            placeholder="Observações do item (Opcional)"
            value={rowObs}
            onChange={(e) => setRowObs(e.target.value)}
          />
        </div>
      </div>

      {/* CART LIST */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest">
            Itens na Lista
          </h3>
          <span className="text-xs font-bold text-neutral-400">
            {items.length} itens
          </span>
        </div>

        <table className="w-full text-left">
          <thead className="bg-neutral-50 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3 text-center">Qtd</th>
              <th className="p-3 text-right">Custo</th>
              <th className="p-3 text-right">Margem</th>
              <th className="p-3 text-right">Venda</th>
              <th className="p-3 text-right">Total Custo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {items.map((i) => (
              <tr
                key={i.tempId}
                className="hover:bg-neutral-50 transition-colors"
              >
                <td className="p-3">
                  <div className="font-bold text-neutral-800">
                    {i.displayName}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {i.ref_cod} {i.obs}
                  </div>
                  {i.new_part_data && (
                    <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded uppercase font-bold">
                      NOVO CADASTRO
                    </span>
                  )}
                </td>
                <td className="p-3 text-center font-bold text-neutral-700">
                  {i.quantidade}
                </td>
                <td className="p-3 text-right text-neutral-600">
                  {formatCurrency(i.valor_custo)}
                </td>
                <td className="p-3 text-right text-blue-600 font-medium">
                  {i.margem_lucro?.toFixed(1)}%
                </td>
                <td className="p-3 text-right font-bold text-neutral-800">
                  {formatCurrency(i.valor_venda)}
                </td>
                <td className="p-3 text-right text-neutral-500">
                  {formatCurrency(i.quantidade * i.valor_custo)}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleEditItem(i)}
                    className="text-primary-400 hover:text-primary-600 p-1 mr-2 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleRemoveItem(i.tempId)}
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-neutral-400 italic"
                >
                  Nenhum item adicionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {items.length > 0 && (
          <div className="p-4 bg-neutral-100 flex justify-end items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-bold text-neutral-500 uppercase">
                Total da Compra
              </p>
              <p className="text-2xl font-bold text-neutral-800">
                {formatCurrency(
                  items.reduce(
                    (acc, i) => acc + i.quantidade * i.valor_custo,
                    0,
                  ),
                )}
              </p>
            </div>
            <Button
              onClick={handlePreSubmit}
              variant="primary"
              className="h-12 px-8 text-lg shadow-xl shadow-primary-500/20"
              icon={Save}
            >
              FINALIZAR ENTRADA
            </Button>
          </div>
        )}
      </div>

      {/* NEW SUPPLIER MODAL */}
      {showNewSupplierModal && (
        <Modal
          title="Novo Fornecedor"
          onClose={() => setShowNewSupplierModal(false)}
          className="max-w-5xl"
        >
          <FornecedorForm
            onSuccess={(newSupplier) => {
              if (newSupplier) {
                setSuppliers((prev) => [...prev, newSupplier]);
                setSelectedSupplierId(String(newSupplier.id_fornecedor));
                setStatusMsg({
                  type: "success",
                  text: "Fornecedor Cadastrado e Selecionado!",
                });
              } else {
                // Fallback reload if no data returned
                api
                  .get("/fornecedor")
                  .then((res) => setSuppliers(res.data))
                  .catch(console.error);
              }
              setShowNewSupplierModal(false);
            }}
            onCancel={() => setShowNewSupplierModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};
