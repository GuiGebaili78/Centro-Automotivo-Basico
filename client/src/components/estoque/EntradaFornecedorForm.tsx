import { Plus, Calendar, FileText } from "lucide-react";
import { Card, Button, Input, Select } from "../ui";
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
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
              Fornecedor
            </span>
            <Button
              onClick={onNewSupplier}
              variant="ghost"
              size="sm"
              icon={Plus}
              className="text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100"
            >
              Novo Fornecedor
            </Button>
          </div>
          <Select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {suppliers.map((s) => (
              <option key={s.id_fornecedor} value={s.id_fornecedor}>
                {s.nome_fantasia || s.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-3">
          <Input
            label="Data Compra"
            type="date"
            icon={Calendar}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="md:col-span-3">
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
