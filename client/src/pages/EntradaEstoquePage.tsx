import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { PageLayout } from "../components/ui/PageLayout";
import { Modal } from "../components/ui/Modal";
import { FornecedorForm } from "../components/forms/FornecedorForm";
import { EntradaFornecedorForm } from "../components/estoque/EntradaFornecedorForm";
import { EntradaItensForm } from "../components/estoque/EntradaItensForm";
import { api } from "../services/api";
import { EstoqueService } from "../services/estoque.service";
import type {
  IItemEntrada,
  IEntradaEstoquePayload,
} from "../types/estoque.types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { CheckCircle, FileText } from "lucide-react";

export const EntradaEstoquePage = () => {
  // Header State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);

  // Items State
  const [items, setItems] = useState<IItemEntrada[]>([]);

  // Financial Modal State
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [enableFinancial, setEnableFinancial] = useState(true);
  const [finDesc, setFinDesc] = useState("");
  const [finValue, setFinValue] = useState("");
  const [finDueDate, setFinDueDate] = useState("");
  const [finPaid, setFinPaid] = useState(false);
  const [finPayDate, setFinPayDate] = useState("");

  // Load Suppliers
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    api
      .get("/fornecedor")
      .then((res) => setSuppliers(res.data))
      .catch(console.error);
  };

  const totalValue = items.reduce(
    (acc, i) => acc + i.quantidade * i.valor_custo,
    0,
  );

  const handlePreSubmit = () => {
    if (!selectedSupplierId) {
      toast.error("Selecione um Fornecedor.");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }

    // Pre-fill Financial Data
    const supplierObj = suppliers.find(
      (s) => s.id_fornecedor === Number(selectedSupplierId),
    );
    const supplierName =
      supplierObj?.nome_fantasia || supplierObj?.nome || "Fornecedor";
    setFinDesc(`Compra Estoque - NF ${invoice || "S/N"} - ${supplierName}`);
    setFinValue(totalValue.toFixed(2));
    setFinDueDate(date); // Default due date = purchase date
    setFinPayDate(new Date().toISOString().split("T")[0]); // Default pay date = today
    setFinPaid(false); // Default to Unpaid
    setEnableFinancial(true);

    setShowFinancialModal(true);
  };

  const handleFinalSubmit = async () => {
    try {
      const payload: IEntradaEstoquePayload = {
        id_fornecedor: Number(selectedSupplierId),
        nota_fiscal: invoice,
        data_compra: new Date(date),
        obs: obs,
        itens: items,
        financeiro: enableFinancial
          ? {
              descricao: finDesc,
              valor: Number(finValue),
              dt_vencimento: finDueDate,
              dt_pagamento: finPaid ? finPayDate : null,
              status: finPaid ? "PAGO" : "PENDENTE",
            }
          : undefined,
      };

      await EstoqueService.createEntry(payload);

      toast.success("Entrada Registrada com Sucesso!");
      setShowFinancialModal(false);

      // Clear All
      setItems([]);
      setInvoice("");
      setObs("");
    } catch (e: any) {
      console.error(e);
      toast.error(
        "Erro ao processar entrada: " + (e.response?.data?.error || e.message),
      );
    }
  };

  return (
    <PageLayout
      title="Nova Compra / Entrada de Estoque"
      subtitle="Registre novas aquisições de peças e atualize o estoque automaticamente."
    >
      <div className="space-y-6">
        <EntradaFornecedorForm
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          setSelectedSupplierId={setSelectedSupplierId}
          invoice={invoice}
          setInvoice={setInvoice}
          date={date}
          setDate={setDate}
          onNewSupplier={() => setShowNewSupplierModal(true)}
        />

        <EntradaItensForm
          items={items}
          setItems={setItems}
          onSubmit={handlePreSubmit}
          totalValue={totalValue}
        />

        {/* NEW FINANCIAL MODAL - Could also be extracted but kept here for now as it orchestrates final submit */}
        {showFinancialModal && (
          <Modal
            title="Financeiro da Compra"
            onClose={() => setShowFinancialModal(false)}
            className="max-w-2xl"
          >
            <div className="space-y-6 pt-2">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm text-blue-900 font-bold">
                    Confirmação de Contas a Pagar
                  </p>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    Um registro será criado em <strong>Contas a Pagar</strong>.
                    Se marcado como pago, o valor será debitado do{" "}
                    <strong>Livro Caixa</strong> automaticamente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <input
                  type="checkbox"
                  id="chkEnableFin"
                  checked={enableFinancial}
                  onChange={(e) => setEnableFinancial(e.target.checked)}
                  className="w-5 h-5 accent-primary-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="chkEnableFin"
                  className="font-bold text-neutral-700 cursor-pointer select-none text-sm"
                >
                  Lançar valor no Financeiro (Contas a Pagar)?
                </label>
              </div>

              {enableFinancial && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  <Input
                    label="Descrição do Lançamento"
                    value={finDesc}
                    onChange={(e) => setFinDesc(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Valor Total (R$)"
                      type="number"
                      value={finValue}
                      readOnly
                      className="bg-neutral-100 font-bold text-neutral-600"
                    />
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                        Vencimento
                      </label>
                      <input
                        type="date"
                        value={finDueDate}
                        onChange={(e) => setFinDueDate(e.target.value)}
                        className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-blue-500 font-medium h-[42px]"
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="chkPaid"
                        checked={finPaid}
                        onChange={(e) => setFinPaid(e.target.checked)}
                        className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <label
                        htmlFor="chkPaid"
                        className="font-bold text-neutral-700 cursor-pointer select-none text-sm"
                      >
                        Compra à vista / Já foi paga?
                      </label>
                    </div>

                    {finPaid && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">
                          Data do Pagamento
                        </label>
                        <input
                          type="date"
                          value={finPayDate}
                          onChange={(e) => setFinPayDate(e.target.value)}
                          className="w-full border p-2.5 rounded-xl outline-none focus:border-emerald-500 font-bold text-emerald-800 border-emerald-200 bg-emerald-50 h-[42px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 gap-3 border-t border-neutral-100 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowFinancialModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFinalSubmit}
                  icon={CheckCircle}
                >
                  Confirmar Lançamento
                </Button>
              </div>
            </div>
          </Modal>
        )}

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
                  toast.success("Fornecedor Cadastrado e Selecionado!");
                }
                setShowNewSupplierModal(false);
              }}
              onCancel={() => setShowNewSupplierModal(false)}
            />
          </Modal>
        )}
      </div>
    </PageLayout>
  );
};
