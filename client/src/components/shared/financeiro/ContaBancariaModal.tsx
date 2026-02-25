import React, { useState, useEffect } from "react";
import { FinanceiroService } from "../../../services/financeiro.service";
import type { IContaBancaria } from "../../../types/backend";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { toast } from "react-toastify";

interface ContaBancariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAccount: IContaBancaria | null;
}

export const ContaBancariaModal: React.FC<ContaBancariaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingAccount,
}) => {
  const [formData, setFormData] = useState<Partial<IContaBancaria>>({
    nome: "",
    banco: "",
    agencia: "",
    conta: "",
    saldo_atual: 0,
    ativo: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        nome: editingAccount.nome,
        banco: editingAccount.banco || "",
        agencia: editingAccount.agencia || "",
        conta: editingAccount.conta || "",
        saldo_atual: Number(editingAccount.saldo_atual),
        ativo: editingAccount.ativo,
      });
    } else {
      setFormData({
        nome: "",
        banco: "",
        agencia: "",
        conta: "",
        saldo_atual: 0,
        ativo: true,
      });
    }
  }, [editingAccount, isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editingAccount) {
        await FinanceiroService.updateContaBancaria(
          editingAccount.id_conta,
          formData,
        );
        toast.success("Conta atualizada com sucesso!");
      } else {
        await FinanceiroService.createContaBancaria(formData);
        toast.success("Conta criada com sucesso!");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar conta.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={editingAccount ? "Editar Conta" : "Nova Conta"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <Input
            label="Nome / Apelido"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Nubank, Caixa Gaveta..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Banco (Opcional)"
              value={formData.banco || ""}
              onChange={(e) =>
                setFormData({ ...formData, banco: e.target.value })
              }
            />
          </div>
          <div>
            <Input
              label="Saldo Inicial (R$)"
              type="number"
              step="0.01"
              disabled={!!editingAccount}
              value={formData.saldo_atual}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  saldo_atual: Number(e.target.value),
                })
              }
            />
            {editingAccount && (
              <p className="text-[10px] text-neutral-400 mt-1">
                Ajuste via Movimentações.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Agência"
              value={formData.agencia || ""}
              onChange={(e) =>
                setFormData({ ...formData, agencia: e.target.value })
              }
            />
          </div>
          <div>
            <Input
              label="Conta"
              value={formData.conta || ""}
              onChange={(e) =>
                setFormData({ ...formData, conta: e.target.value })
              }
            />
          </div>
        </div>

        {!editingAccount && (
          <div className="p-4 bg-yellow-50 text-yellow-800 text-xs rounded-xl font-medium">
            Atenção: O saldo inicial será registrado como primeira movimentação
            se for maior que zero.
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            isLoading={loading}
            className="shadow-lg shadow-primary-500/20"
          >
            {editingAccount ? "Salvar" : "Criar Conta"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
