import { useState } from "react";
import type { FormEvent } from "react";
import { PessoaService } from "../../services/pessoa.service";
import { Button, Input, Select } from "../ui";

interface PessoaFormProps {
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const PessoaForm = ({ onSuccess, onCancel }: PessoaFormProps) => {
  const [loading, setLoading] = useState(false);

  // Schema: nome, genero?, dt_nascimento?, obs?
  const [nome, setNome] = useState("");
  const [genero, setGenero] = useState("");
  const [dtNascimento, setDtNascimento] = useState("");
  const [obs, setObs] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nome,
        genero: genero || null,
        dt_nascimento: dtNascimento ? new Date(dtNascimento) : null,
        obs: obs || null,
      };

      const newItem = await PessoaService.createPessoa(payload);
      alert("Pessoa cadastrada com sucesso!");
      onSuccess(newItem);
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar pessoa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input
            label="Nome Completo *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Digite o nome completo"
          />
        </div>

        <div>
          <Select
            label="Gênero"
            value={genero}
            onChange={(e) => setGenero(e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Outro">Outro</option>
          </Select>
        </div>

        <div>
          <Input
            label="Data Nascimento"
            type="date"
            value={dtNascimento}
            onChange={(e) => setDtNascimento(e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <Input
            label="Observações"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observações adicionais..."
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
          Salvar Pessoa
        </Button>
      </div>
    </form>
  );
};
