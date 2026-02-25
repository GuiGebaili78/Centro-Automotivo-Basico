import { useState } from "react";
import type { FormEvent } from "react";
import { EstoqueService } from "../../services/estoque.service";
import { Button, Input } from "../ui";

interface PecasEstoqueFormProps {
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

export const PecasEstoqueForm = ({
  onSuccess,
  onCancel,
}: PecasEstoqueFormProps) => {
  const [loading, setLoading] = useState(false);

  // Form States
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const [unidadeMedida, setUnidadeMedida] = useState("");
  const [valorCusto, setValorCusto] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [estoqueAtual, setEstoqueAtual] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [custoUnitarioPadrao, setCustoUnitarioPadrao] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nome,
        descricao,
        unidade_medida: unidadeMedida,
        valor_custo: Number(valorCusto),
        valor_venda: Number(valorVenda),
        estoque_atual: Number(estoqueAtual),
        estoque_minimo: Number(estoqueMinimo) || 0,
        custo_unitario_padrao: custoUnitarioPadrao
          ? Number(custoUnitarioPadrao)
          : 0,
      };

      const newItem = await EstoqueService.create(payload);
      alert("Peça cadastrada com sucesso!");
      onSuccess(newItem);
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar peça.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input
            label="Nome da Peça *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
        <div className="col-span-2">
          <Input
            label="Descrição Detalhada *"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Unidade Medida"
            value={unidadeMedida}
            onChange={(e) => setUnidadeMedida(e.target.value)}
            placeholder="Ex: UN, KG, LT"
          />
        </div>

        <div>
          <Input
            label="Valor Custo (R$) *"
            type="number"
            step="0.01"
            value={valorCusto}
            onChange={(e) => setValorCusto(e.target.value)}
            required
          />
        </div>
        <div>
          <Input
            label="Valor Venda (R$) *"
            type="number"
            step="0.01"
            value={valorVenda}
            onChange={(e) => setValorVenda(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Estoque Atual *"
            type="number"
            value={estoqueAtual}
            onChange={(e) => setEstoqueAtual(e.target.value)}
            required
          />
        </div>
        <div>
          <span className="block text-xs font-bold text-orange-600 uppercase mb-1.5 tracking-widest leading-none">
            Aviso de Estoque Baixo *
          </span>
          <Input
            type="number"
            value={estoqueMinimo}
            onChange={(e) => setEstoqueMinimo(e.target.value)}
            className="border-orange-200"
            required
          />
        </div>
        <div>
          <Input
            label="Custo Padrão (Ref.)"
            type="number"
            step="0.01"
            value={custoUnitarioPadrao}
            onChange={(e) => setCustoUnitarioPadrao(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          type="button"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={loading}
          className="flex-1"
        >
          Salvar Peça
        </Button>
      </div>
    </form>
  );
};
