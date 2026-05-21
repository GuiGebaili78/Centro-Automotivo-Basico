import { useState } from "react";
import type { FormEvent } from "react";
import { PessoaService } from "../../../services/pessoa.service";
import { Button, Input } from "../../ui";

interface PessoaFisicaFormProps {
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const PessoaFisicaForm = ({
  onSuccess,
  onCancel,
}: PessoaFisicaFormProps) => {
  const [loading, setLoading] = useState(false);

  // Schema: id_pessoa, cpf?
  const [idPessoa, setIdPessoa] = useState("");
  const [cpf, setCpf] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        id_pessoa: Number(idPessoa),
        cpf: cpf || null,
      };

      const newItem = await PessoaService.createPessoaFisica(payload);
      alert("Pessoa Física cadastrada com sucesso!");
      onSuccess(newItem);
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar. Verifique se o ID da Pessoa existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100">
        <strong>Pré-requisito:</strong> A Pessoa base deve estar cadastrada
        primeiro.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="ID Pessoa *"
            type="number"
            value={idPessoa}
            onChange={(e) => setIdPessoa(e.target.value)}
            required
            placeholder="Ex: 10"
          />
        </div>

        <div>
          <Input
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            maxLength={11}
            placeholder="Somente números"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={loading}
          className="flex-1"
        >
          Salvar Pessoa Física
        </Button>
      </div>
    </form>
  );
};
