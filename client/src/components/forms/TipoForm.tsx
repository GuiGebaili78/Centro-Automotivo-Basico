import { useState } from "react";
import type { FormEvent } from "react";
import { PessoaService } from "../../services/pessoa.service";

interface TipoFormProps {
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const TipoForm = ({ onSuccess, onCancel }: TipoFormProps) => {
  const [loading, setLoading] = useState(false);

  // Schema: funcao?
  const [funcao, setFuncao] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        funcao: funcao || null,
      };

      const newItem = await PessoaService.createTipo(payload);
      alert("Tipo cadastrado com sucesso!");
      onSuccess(newItem);
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar tipo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
          Função / Tipo
        </label>
        <input
          value={funcao}
          onChange={(e) => setFuncao(e.target.value)}
          className="w-full border p-2 rounded border-gray-300"
          placeholder="Ex: Cliente, Fornecedor, Parceiro..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Define a função/categoria da pessoa ou empresa.
        </p>
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
          className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Tipo"}
        </button>
      </div>
    </form>
  );
};
