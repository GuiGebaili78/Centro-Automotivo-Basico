import { Plus, Calendar, FileText } from "lucide-react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import type { IFornecedor } from "../../types/backend";

interface EntradaFornecedorFormProps {
  suppliers: IFornecedor[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  invoice: string;
  setInvoice: (val: string) => void;
  date: string;
  setDate: (val: string) => void;
  onNewSupplier: () => void;
}

export const EntradaFornecedorForm = ({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  invoice,
  setInvoice,
  date,
  setDate,
  onNewSupplier,
}: EntradaFornecedorFormProps) => {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-6 relative">
          <div className="flex justify-between items-baseline mb-1">
            <label className="block text-xs font-bold text-neutral-400 uppercase">
              Fornecedor
            </label>
            <button
              onClick={onNewSupplier}
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

        <div className="md:col-span-3">
          <label className="text-xs font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1">
            <Calendar size={12} /> Data Compra
          </label>
          <input
            type="date"
            className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-700 outline-none focus:border-primary-500 h-[46px]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="md:col-span-3 pb-0.5">
          <Input
            label="Nota Fiscal / Recibo"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="Nº NF"
            icon={FileText}
          />
        </div>
      </div>
    </Card>
  );
};
