import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../services/api";

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

      const response = await api.post("/itens-os", payload);
      alert("Item adicionado à OS com sucesso!");
      onSuccess(response.data);
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
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            ID Peça Estoque (Opcional)
          </label>
          <input
            type="number"
            value={idPecasEstoque}
            onChange={(e) => setIdPecasEstoque(e.target.value)}
            className="w-full border p-2 rounded border-gray-300"
            placeholder="Deixe vazio para serviço"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Descrição *
          </label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full border p-2 rounded border-gray-300"
            required
            placeholder="Ex: Troca de óleo, Filtro de ar..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Quantidade *
          </label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => handleQuantidadeChange(e.target.value)}
            className="w-full border p-2 rounded border-gray-300"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Valor Unitário (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            value={valorVenda}
            onChange={(e) => handleValorVendaChange(e.target.value)}
            className="w-full border p-2 rounded border-gray-300"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Valor Total (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className="w-full border p-2 rounded border-gray-300 bg-gray-50 font-bold text-lg"
            required
            readOnly
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Adicionando..." : "Adicionar Item"}
        </button>
      </div>
    </form>
  );
};
