import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../services/api";
import { Button, Input, Checkbox } from "../ui";

interface PagamentoPecaFormProps {
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const PagamentoPecaForm = ({
  onSuccess,
  onCancel,
}: PagamentoPecaFormProps) => {
  const [loading, setLoading] = useState(false);

  // Schema: id_item_os, id_fornecedor, custo_real, data_compra, data_pagamento_fornecedor?, pago_ao_fornecedor
  const [idItemOs, setIdItemOs] = useState("");
  const [idFornecedor, setIdFornecedor] = useState("");
  const [custoReal, setCustoReal] = useState("");
  const [dataCompra, setDataCompra] = useState("");
  const [dataPagamentoFornecedor, setDataPagamentoFornecedor] = useState("");
  const [pagoAoFornecedor, setPagoAoFornecedor] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        id_item_os: Number(idItemOs),
        id_fornecedor: Number(idFornecedor),
        custo_real: Number(custoReal),
        data_compra: new Date(dataCompra).toISOString(),
        data_pagamento_fornecedor: dataPagamentoFornecedor
          ? new Date(dataPagamentoFornecedor).toISOString()
          : null,
        pago_ao_fornecedor: pagoAoFornecedor,
      };

      const response = await api.post("/pagamento-peca", payload);
      alert("Pagamento de peça registrado com sucesso!");
      onSuccess(response.data);
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar pagamento de peça.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-orange-50 p-3 rounded text-sm text-orange-800 border border-orange-100">
        <strong>Rastreio de Custo Real:</strong> Registre o custo efetivo pago
        ao fornecedor.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="ID Item OS *"
            type="number"
            value={idItemOs}
            onChange={(e) => setIdItemOs(e.target.value)}
            required
            placeholder="ID do item da OS"
          />
        </div>

        <div>
          <Input
            label="ID Fornecedor *"
            type="number"
            value={idFornecedor}
            onChange={(e) => setIdFornecedor(e.target.value)}
            required
            placeholder="ID do fornecedor"
          />
        </div>

        <div>
          <Input
            label="Custo Real (R$) *"
            type="number"
            step="0.01"
            value={custoReal}
            onChange={(e) => setCustoReal(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Data da Compra *"
            type="date"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Data Pagamento Fornecedor"
            type="date"
            value={dataPagamentoFornecedor}
            onChange={(e) => setDataPagamentoFornecedor(e.target.value)}
          />
        </div>

        <div className="flex items-center pt-6">
          <Checkbox
            label="Pago ao Fornecedor"
            checked={pagoAoFornecedor}
            onChange={(e) => setPagoAoFornecedor(e.target.checked)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={loading}
          variant="primary"
          className="flex-1"
        >
          Registrar Pagamento
        </Button>
      </div>
    </form>
  );
};
