import { useState } from "react";
import type { FormEvent } from "react";
import { PessoaService } from "../../services/pessoa.service";
import { Button, Input } from "../ui";

interface PessoaJuridicaFormProps {
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const PessoaJuridicaForm = ({
  onSuccess,
  onCancel,
}: PessoaJuridicaFormProps) => {
  const [loading, setLoading] = useState(false);

  // Schema: id_pessoa, razao_social, nome_fantasia?, cnpj?, inscricao_estadual?
  const [idPessoa, setIdPessoa] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        id_pessoa: Number(idPessoa),
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null,
        cnpj: cnpj || null,
        inscricao_estadual: inscricaoEstadual || null,
      };

      const newItem = await PessoaService.createPessoaJuridica(payload);
      alert("Pessoa Jurídica cadastrada com sucesso!");
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
      <div className="bg-purple-50 p-3 rounded text-sm text-purple-800 border border-purple-100">
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

        <div className="col-span-2">
          <Input
            label="Razão Social *"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            required
          />
        </div>

        <div className="col-span-2">
          <Input
            label="Nome Fantasia"
            value={nomeFantasia}
            onChange={(e) => setNomeFantasia(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            maxLength={14}
            placeholder="Somente números"
          />
        </div>

        <div>
          <Input
            label="Inscrição Estadual"
            value={inscricaoEstadual}
            onChange={(e) => setInscricaoEstadual(e.target.value)}
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
          Salvar Pessoa Jurídica
        </Button>
      </div>
    </form>
  );
};
