import { useState } from "react";
import type { FormEvent } from "react";
import { OsItemsService } from "../../services/osItems.service";
import { Button, Input } from "../ui";

interface ItensOsFormProps {
  osId: number;
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const ItensOsForm = ({
  osId,
  onSuccess,
  onCancel,
}: ItensOsFormProps) => {
  const [loading, setLoading] = useState(false);

  // Schema: id_os, id_pecas_estoque?, descricao, quantidade, valor_venda, valor_total
  const [idPecasEstoque, setIdPecasEstoque] = useState("");
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorVenda, setValorVenda] = useState("");
  const [valorTotal, setValorTotal] = useState("");

  // Auto-calculate valor_total when quantidade or valor_venda changes
  const handleQuantidadeChange = (value: string) => {
    setQuantidade(value);
    if (valorVenda) {
      const total = Number(value) * Number(valorVenda);
      setValorTotal(total.toFixed(2));
    }
  };

  const handleValorVendaChange = (value: string) => {
    setValorVenda(value);
    if (quantidade) {
      const total = Number(quantidade) * Number(value);
      setValorTotal(total.toFixed(2));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        id_os: osId,
        id_pecas_estoque: idPecasEstoque ? Number(idPecasEstoque) : null,
        descricao,
        quantidade: Number(quantidade),
        valor_venda: Number(valorVenda),
        valor_total: Number(valorTotal),
      };

      const newItem = await OsItemsService.create(payload);
      alert("Item adicionado à OS com sucesso!");
      onSuccess(newItem);
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar item à OS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100">
        <strong>OS Nº {osId}</strong> - Adicionando item/peça/serviço
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="ID Peça Estoque (Opcional)"
            type="number"
            value={idPecasEstoque}
            onChange={(e) => setIdPecasEstoque(e.target.value)}
            placeholder="Deixe vazio para serviço"
          />
        </div>

        <div className="col-span-2">
          <Input
            label="Descrição *"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            placeholder="Ex: Troca de óleo, Filtro de ar..."
          />
        </div>

        <div>
          <Input
            label="Quantidade *"
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => handleQuantidadeChange(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Valor Unitário (R$) *"
            type="number"
            step="0.01"
            value={valorVenda}
            onChange={(e) => handleValorVendaChange(e.target.value)}
            required
          />
        </div>

        <div className="col-span-2">
          <Input
            label="Valor Total (R$)"
            type="number"
            step="0.01"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className="font-bold text-lg"
            required
            readOnly
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
          Adicionar Item
        </Button>
      </div>
    </form>
  );
};
