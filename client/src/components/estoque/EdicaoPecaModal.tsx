import { useState, useEffect, type FormEvent } from "react";
import { toast } from "react-toastify";
import { CheckCircle, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EstoqueService } from "../../services/estoque.service";
import type { IPecasEstoque } from "../../types/estoque.types";

interface EdicaoPecaModalProps {
  isOpen: boolean;
  onClose: () => void;
  peca: IPecasEstoque | null;
  onSuccess: () => void;
  onDeleteRequest: (peca: IPecasEstoque) => void;
}

export const EdicaoPecaModal = ({
  isOpen,
  onClose,
  peca,
  onSuccess,
  onDeleteRequest,
}: EdicaoPecaModalProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    fabricante: "",
    descricao: "",
    unidade_medida: "UN",
    valor_custo: "",
    margem_lucro: "",
    valor_venda: "",
    estoque_atual: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (peca && isOpen) {
      let margin = "";
      if (Number(peca.valor_custo) > 0) {
        margin = (
          ((Number(peca.valor_venda) - Number(peca.valor_custo)) /
            Number(peca.valor_custo)) *
          100
        ).toFixed(2);
      }

      setFormData({
        nome: peca.nome,
        fabricante: peca.fabricante || "",
        descricao: peca.descricao || "",
        unidade_medida: peca.unidade_medida || "UN",
        valor_custo: Number(peca.valor_custo).toFixed(2),
        margem_lucro: margin,
        valor_venda: Number(peca.valor_venda).toFixed(2),
        estoque_atual: String(peca.estoque_atual),
      });
    }
  }, [peca, isOpen]);

  const handleRecalcMargin = (saleVal: string) => {
    setFormData((prev) => {
      const sale = Number(saleVal);
      const cost = Number(prev.valor_custo);
      let margin = prev.margem_lucro;
      if (cost > 0 && sale > 0) {
        margin = (((sale - cost) / cost) * 100).toFixed(2);
      }
      return { ...prev, valor_venda: saleVal, margem_lucro: margin };
    });
  };

  const handleRecalcSale = (marginVal: string) => {
    setFormData((prev) => {
      const margin = Number(marginVal);
      const cost = Number(prev.valor_custo);
      let sale = prev.valor_venda;
      if (cost > 0) {
        sale = (cost + cost * (margin / 100)).toFixed(2);
      }
      return { ...prev, margem_lucro: marginVal, valor_venda: sale };
    });
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!peca) return;

    setLoading(true);
    try {
      const payload = {
        nome: formData.nome,
        fabricante: formData.fabricante,
        descricao: formData.descricao,
        unidade_medida: formData.unidade_medida,
        valor_custo: Number(formData.valor_custo),
        valor_venda: Number(formData.valor_venda),
        estoque_atual: Number(formData.estoque_atual),
      };

      await EstoqueService.update(peca.id_pecas_estoque, payload);
      toast.success("Peça atualizada com sucesso!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data?.error ||
        "Erro ao atualizar peça. Verifique os dados.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !peca) return null;

  return (
    <Modal
      title={`Editar Item: ${peca.nome}`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <form onSubmit={handleUpdate} className="space-y-6 pt-2">
        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Nome do Item"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fabricante"
                value={formData.fabricante}
                onChange={(e) =>
                  setFormData({ ...formData, fabricante: e.target.value })
                }
                placeholder="Marca..."
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">
                  Unidade
                </label>
                <select
                  value={formData.unidade_medida}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unidade_medida: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-neutral-200 bg-white focus:bg-white outline-none focus:border-primary-500 font-medium text-sm transition-all h-[42px]"
                >
                  <option value="UN">Unidade (UN)</option>
                  <option value="L">Litro (L)</option>
                  <option value="KG">Quilo (KG)</option>
                  <option value="KIT">Kit</option>
                  <option value="PAR">Par</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">
                Descrição / Notas
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                className="w-full p-3 rounded-lg border border-neutral-200 bg-white focus:bg-white outline-none focus:border-primary-500 font-medium text-sm h-24 resize-none transition-all"
                placeholder="Detalhes adicionais..."
              />
            </div>
          </div>

          <div className="space-y-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">
              Valores e Estoque
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Estoque Atual"
                type="number"
                value={formData.estoque_atual}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estoque_atual: e.target.value,
                  })
                }
                className="text-center font-bold"
              />
              <Input
                label="Margem (%)"
                type="number"
                step="0.5"
                value={formData.margem_lucro}
                onChange={(e) => handleRecalcSale(e.target.value)}
                className="text-center font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Custo (R$)"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) =>
                  setFormData({ ...formData, valor_custo: e.target.value })
                }
                className="text-right font-medium text-neutral-600"
              />
              <Input
                label="Venda (R$)"
                type="number"
                step="0.01"
                value={formData.valor_venda}
                onChange={(e) => handleRecalcMargin(e.target.value)}
                className="text-right font-bold border-emerald-200 bg-emerald-50 text-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
          <Button
            type="button"
            onClick={() => onDeleteRequest(peca)}
            variant="danger"
            icon={Trash2}
            className="opacity-70 hover:opacity-100"
          >
            Excluir
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={CheckCircle}
              isLoading={loading}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
