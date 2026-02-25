import React, { useState, useEffect } from "react";
import { FinanceiroService } from "../../../services/financeiro.service";
import { CreditCard } from "lucide-react";
import type { IOperadoraCartao, IContaBancaria } from "../../../types/backend";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { Select } from "../../ui/Select";
import { Checkbox } from "../../ui/Checkbox";
import { toast } from "react-toastify";

interface OperadoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOp: IOperadoraCartao | null;
  contas: IContaBancaria[];
}

export const OperadoraModal: React.FC<OperadoraModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingOp,
  contas,
}) => {
  const [formData, setFormData] = useState<Partial<IOperadoraCartao>>({
    nome: "",
    taxa_debito: 0,
    prazo_debito: 1,
    taxa_credito_vista: 0,
    prazo_credito_vista: 30,
    taxa_credito_parc: 0,
    prazo_credito_parc: 30,
    taxa_antecipacao: 0,
    antecipacao_auto: false,
    id_conta_destino: 0,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingOp) {
      setFormData({
        ...editingOp,
        taxa_debito: Number(editingOp.taxa_debito),
        taxa_credito_vista: Number(editingOp.taxa_credito_vista),
        taxa_credito_parc: Number(editingOp.taxa_credito_parc),
        taxa_antecipacao: Number(editingOp.taxa_antecipacao),
        taxas_cartao: editingOp.taxas_cartao || [],
      });
    } else {
      setFormData({
        nome: "",
        taxa_debito: 0,
        prazo_debito: 1,
        taxa_credito_vista: 0,
        prazo_credito_vista: 30,
        taxa_credito_parc: 0,
        prazo_credito_parc: 30,
        taxa_antecipacao: 0,
        antecipacao_auto: false,
        id_conta_destino: contas.length > 0 ? contas[0].id_conta : 0,
        taxas_cartao: [],
      });
    }
    setIsDirty(false);
  }, [editingOp, contas, isOpen]);

  const handleModalClose = () => {
    if (isDirty) {
      if (window.confirm("Deseja sair sem salvar as alterações?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleChange = (newFormData: Partial<IOperadoraCartao>) => {
    setFormData(newFormData);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id_conta_destino || formData.id_conta_destino <= 0) {
      toast.error("Selecione uma conta bancária de destino.");
      return;
    }

    setLoading(true);
    try {
      if (editingOp) {
        await FinanceiroService.updateOperadoraCartao(
          editingOp.id_operadora,
          formData,
        );
        toast.success("Operadora atualizada!");
      } else {
        await FinanceiroService.createOperadoraCartao(formData);
        toast.success("Operadora cadastrada!");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar operadora.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={editingOp ? "Editar Operadora" : "Nova Operadora"}
      onClose={handleModalClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Nome da Maquininha"
            required
            value={formData.nome || ""}
            onChange={(e) =>
              handleChange({ ...formData, nome: e.target.value })
            }
            placeholder="Ex: Stone, PagSeguro..."
            icon={CreditCard}
          />
          <Select
            label="Conta Bancária de Destino"
            required
            value={formData.id_conta_destino || 0}
            onChange={(e) =>
              handleChange({
                ...formData,
                id_conta_destino: Number(e.target.value),
              })
            }
          >
            <option value={0} disabled>
              Selecione uma conta...
            </option>
            {contas.map((c) => (
              <option key={c.id_conta} value={c.id_conta}>
                {c.nome} - {c.banco}
              </option>
            ))}
          </Select>
        </div>

        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 space-y-4">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">
            Configuração de Taxas e Prazos
          </h3>

          <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2 text-center">
            <div className="col-span-3 text-left">Modalidade</div>
            <div className="col-span-3">Taxa (%)</div>
            <div className="col-span-3">Prazo (Dias)</div>
            <div className="col-span-3">Ant. (%)</div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 text-xs font-bold text-neutral-700">
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-[9px] uppercase tracking-wider mr-2">
                DÉB
              </span>
              Débito
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_debito || 0}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    taxa_debito: Number(e.target.value),
                  })
                }
                className="text-center font-bold"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={formData.prazo_debito || 1}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    prazo_debito: Number(e.target.value),
                  })
                }
                className="text-center font-bold"
              />
            </div>
            <div className="col-span-3 opacity-20 text-center text-xs">—</div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 text-xs font-bold text-neutral-700">
              <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-[9px] uppercase tracking-wider mr-2">
                CRÉ
              </span>
              Crédito 1x
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_credito_vista || 0}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    taxa_credito_vista: Number(e.target.value),
                  })
                }
                className="text-center font-bold text-emerald-600"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={formData.prazo_credito_vista || 30}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    prazo_credito_vista: Number(e.target.value),
                  })
                }
                className="text-center font-bold"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_antecipacao || 0}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    taxa_antecipacao: Number(e.target.value),
                  })
                }
                className="text-center font-bold text-primary-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-3 text-xs font-bold text-neutral-700">
              <span className="bg-violet-100 text-violet-600 px-2 py-1 rounded-md text-[9px] uppercase tracking-wider mr-2">
                PAR
              </span>
              Parcelado
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_credito_parc || 0}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    taxa_credito_parc: Number(e.target.value),
                  })
                }
                className="text-center font-bold text-violet-600"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={formData.prazo_credito_parc || 30}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    prazo_credito_parc: Number(e.target.value),
                  })
                }
                className="text-center font-bold"
              />
            </div>
            <div className="col-span-3 opacity-20 text-center text-xs">—</div>
          </div>
        </div>

        <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 flex items-center justify-between">
          <div>
            <Checkbox
              label="Antecipação Automática"
              id="auto_antecipa"
              checked={formData.antecipacao_auto || false}
              onChange={(e) =>
                handleChange({
                  ...formData,
                  antecipacao_auto: (e.target as HTMLInputElement).checked,
                })
              }
            />
            <p className="text-xs text-primary-600/70 ml-8 mt-1 font-medium">
              Ative para receber o valor das vendas no dia seguinte ao
              pagamento.
            </p>
          </div>
          {formData.antecipacao_auto && (
            <div className="w-32">
              <Input
                label="Taxa Extra (%)"
                type="number"
                step="0.01"
                value={formData.taxa_antecipacao || 0}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    taxa_antecipacao: Number(e.target.value),
                  })
                }
                className="font-bold text-primary-700"
              />
            </div>
          )}
        </div>

        <div className="pt-8 flex justify-end gap-4">
          <Button variant="ghost" type="button" onClick={handleModalClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            className="px-10 shadow-xl shadow-primary-500/20"
          >
            {editingOp ? "Salvar Alterações" : "Cadastrar Operadora"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
