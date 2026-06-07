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
  nfsPendentes: any[];
  nfNumero: string;
  setNfNumero: (val: string) => void;
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
  nfsPendentes,
  nfNumero,
  setNfNumero,
}: EntradaFornecedorFormProps) => {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5 relative">
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
            value={selectedSupplierId || ""}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {suppliers.map((s) => (
              <option key={s.id_fornecedor} value={String(s.id_fornecedor)}>
                {s.nome_fantasia || s.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-2">
          <Input
            label="Data Compra"
            type="date"
            icon={Calendar}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Nota Fiscal / Recibo"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="Nº NF"
            icon={FileText}
          />
        </div>

        <div className="md:col-span-3">
          <Select
            label="NF Sincronização (Contas a Pagar)"
            value={nfNumero}
            onChange={(e) => {
              const val = e.target.value;
              setNfNumero(val);
              // Auto-fill invoice if empty
              if (val && !invoice) {
                setInvoice(val);
              }
            }}
            labelClassName="text-amber-800 font-semibold"
            className="border-amber-300 focus:border-amber-500 focus:ring-amber-100 bg-amber-50/10 text-amber-900 font-medium"
          >
            <option value="">Sem Sincronização (Livre)</option>
            {nfsPendentes.map((nf) => {
              const isExcedente = nf.matchPercent > 100 && nf.nf_numero !== nfNumero;
              return (
                <option 
                  key={`${nf.nf_numero}_${nf.id_fornecedor || 'null'}`} 
                  value={nf.nf_numero}
                  disabled={isExcedente}
                >
                  {nf.nf_numero} ({nf.credor || "Sem Credor"}) {isExcedente ? "(Excedeu o Valor)" : ""}
                </option>
              );
            })}
          </Select>
        </div>
      </div>
    </Card>
  );
};
