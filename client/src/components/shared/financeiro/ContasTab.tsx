import { useState, useEffect } from "react";
import { formatCurrency } from "../../../utils/formatCurrency";
import { useNavigate } from "react-router-dom";
import { FinanceiroService } from "../../../services/financeiro.service";
import { Plus, Landmark, Eye, EyeOff, FileText, Edit } from "lucide-react";
import type { IContaBancaria } from "../../../types/backend";
import { Button } from "../../ui/Button";
import { ActionButton } from "../../ui/ActionButton";
import { ConfirmModal } from "../../ui/ConfirmModal";
import { toast } from "react-toastify";
import { ContaBancariaModal } from "./ContaBancariaModal";

export const ContasTab = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<IContaBancaria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<IContaBancaria | null>(
    null,
  );

  const [showBalance, setShowBalance] = useState<Record<number, boolean>>({});

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [accountToToggle, setAccountToToggle] = useState<IContaBancaria | null>(
    null,
  );

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await FinanceiroService.getContasBancarias();
      setAccounts(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar contas bancárias.");
    }
  };

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: IContaBancaria) => {
    setEditingAccount(acc);
    setIsModalOpen(true);
  };

  const handleOpenStatement = (acc: IContaBancaria) => {
    navigate(`/financeiro/extrato/${acc.id_conta}`);
  };

  const handleToggleClick = (acc: IContaBancaria) => {
    setAccountToToggle(acc);
    setIsConfirmOpen(true);
  };

  const confirmToggle = async () => {
    if (!accountToToggle) return;
    try {
      await FinanceiroService.updateContaBancaria(accountToToggle.id_conta, {
        ativo: !accountToToggle.ativo,
      });
      loadAccounts();
    } catch (error) {
      toast.error("Erro ao alterar status da conta.");
    } finally {
      setIsConfirmOpen(false);
      setAccountToToggle(null);
    }
  };

  const toggleBalanceVisibility = (id: number) => {
    setShowBalance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">
            Contas Bancárias e Caixas
          </h2>
          <p className="text-neutral-500 text-sm">
            Gerencie onde o dinheiro entra e sai.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          icon={Plus}
          className="shadow-lg shadow-primary-500/20"
        >
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div
            key={acc.id_conta}
            className={`bg-surface p-6 rounded-xl border ${acc.ativo ? "border-neutral-200" : "border-neutral-100 opacity-60"} shadow-sm relative group hover:border-blue-200 transition-all`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-neutral-100 p-3 rounded-xl text-neutral-600">
                <Landmark size={24} />
              </div>
              <div className="flex gap-2">
                <ActionButton
                  onClick={() => handleOpenEdit(acc)}
                  icon={Edit}
                  label="Editar"
                  className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"
                  variant="neutral"
                />
                <ActionButton
                  onClick={() => handleToggleClick(acc)}
                  icon={acc.ativo ? EyeOff : Eye}
                  variant={acc.ativo ? "danger" : "primary"}
                  label={acc.ativo ? "Desativar" : "Ativar"}
                  className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"
                />
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-lg text-neutral-900 truncate">
                {acc.nome}
              </h3>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                {acc.banco || "Caixa Físico"}
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Saldo Atual
                </span>
                <button
                  onClick={() => toggleBalanceVisibility(acc.id_conta)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  {showBalance[acc.id_conta] ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </button>
              </div>
              <div
                className={`text-2xl font-black ${Number(acc.saldo_atual) < 0 ? "text-red-600" : "text-neutral-900"}`}
              >
                {showBalance[acc.id_conta]
                  ? formatCurrency(Number(acc.saldo_atual))
                  : "----"}
              </div>
            </div>

            <Button
              onClick={() => handleOpenStatement(acc)}
              variant="secondary"
              className="w-full"
              icon={FileText}
            >
              Ver Extrato
            </Button>

            {!acc.ativo && (
              <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                Inativo
              </div>
            )}
          </div>
        ))}

        {/* Empty State Card */}
        <button
          onClick={handleOpenCreate}
          className="border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-neutral-400 hover:border-neutral-300 hover:bg-neutral-50 transition-all min-h-[250px] group"
        >
          <div className="bg-neutral-100 p-4 rounded-full group-hover:bg-neutral-200 transition-colors">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm">Adicionar Conta</span>
        </button>
      </div>

      <ContaBancariaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAccounts}
        editingAccount={editingAccount}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmToggle}
        title={accountToToggle?.ativo ? "Desativar Conta" : "Ativar Conta"}
        description={`Tem certeza que deseja ${
          accountToToggle?.ativo ? "desativar" : "ativar"
        } a conta "${accountToToggle?.nome}"?`}
        confirmText={accountToToggle?.ativo ? "Desativar" : "Ativar"}
        variant={accountToToggle?.ativo ? "danger" : "primary"}
      />
    </div>
  );
};
