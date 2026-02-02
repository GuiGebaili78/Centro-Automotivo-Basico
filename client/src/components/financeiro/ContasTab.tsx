import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { Plus, Landmark, Eye, EyeOff, FileText, Edit } from "lucide-react";
import type { IContaBancaria } from "../../types/backend";
import { StatusBanner } from "../ui/StatusBanner";
import { Button } from "../ui/Button";
import { Input } from "../ui/input";
import { Modal } from "../ui/Modal";
import { ActionButton } from "../ui/ActionButton";

export const ContasTab = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<IContaBancaria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<IContaBancaria | null>(
    null,
  );
  const [formData, setFormData] = useState<Partial<IContaBancaria>>({
    nome: "",
    banco: "",
    agencia: "",
    conta: "",
    saldo_atual: 0,
    ativo: true,
  });
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });
  const [showBalance, setShowBalance] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.get("/conta-bancaria");
      setAccounts(res.data);
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: "Erro ao carregar contas bancárias.",
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData({
      nome: "",
      banco: "",
      agencia: "",
      conta: "",
      saldo_atual: 0,
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: IContaBancaria) => {
    setEditingAccount(acc);
    setFormData({
      nome: acc.nome,
      banco: acc.banco || "",
      agencia: acc.agencia || "",
      conta: acc.conta || "",
      saldo_atual: Number(acc.saldo_atual),
      ativo: acc.ativo,
    });
    setIsModalOpen(true);
  };

  const handleOpenStatement = (acc: IContaBancaria) => {
    navigate(`/financeiro/extrato/${acc.id_conta}`);
  };

  const handleSubmit = async () => {
    try {
      if (editingAccount) {
        await api.put(`/conta-bancaria/${editingAccount.id_conta}`, formData);
        setStatusMsg({
          type: "success",
          text: "Conta atualizada com sucesso!",
        });
      } else {
        await api.post("/conta-bancaria", formData);
        setStatusMsg({ type: "success", text: "Conta criada com sucesso!" });
      }
      setIsModalOpen(false);
      loadAccounts();
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao salvar conta." });
    }
  };

  const toggleDelete = async (acc: IContaBancaria) => {
    if (
      !window.confirm(
        `Tem certeza que deseja ${acc.ativo ? "desativar" : "ativar"} esta conta?`,
      )
    )
      return;
    try {
      await api.put(`/conta-bancaria/${acc.id_conta}`, { ativo: !acc.ativo });
      loadAccounts();
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao alterar status da conta." });
    }
  };

  const toggleBalanceVisibility = (id: number) => {
    setShowBalance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

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
                  onClick={() => toggleDelete(acc)}
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

      {/* MODAL EDIT/CREATE */}
      {isModalOpen && (
        <Modal
          title={editingAccount ? "Editar Conta" : "Nova Conta"}
          onClose={() => setIsModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <Input
                label="Nome / Apelido"
                required
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
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
                Atenção: O saldo inicial será registrado como primeira
                movimentação se for maior que zero.
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                variant="primary"
                className="shadow-lg shadow-primary-500/20"
              >
                {editingAccount ? "Salvar" : "Criar Conta"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
