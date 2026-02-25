import { useState, useEffect } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { Plus, CreditCard, Trash2, Edit } from "lucide-react";
import type { IOperadoraCartao, IContaBancaria } from "../../types/backend";

import { PageLayout } from "../../components/ui/PageLayout";
import { Button } from "../../components/ui/Button";
import { ActionButton } from "../../components/ui/ActionButton";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import { OperadoraModal } from "../../components/shared/financeiro/OperadoraModal";

export const OperadoraCartaoPage = () => {
  const [operadoras, setOperadoras] = useState<IOperadoraCartao[]>([]);
  const [contas, setContas] = useState<IContaBancaria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<IOperadoraCartao | null>(null);
  const [opToDelete, setOpToDelete] = useState<IOperadoraCartao | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [operadorasData, contasData] = await Promise.all([
        FinanceiroService.getOperadorasCartao(),
        FinanceiroService.getContasBancarias(),
      ]);
      setOperadoras(operadorasData);
      setContas(contasData.filter((c: IContaBancaria) => c.ativo));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    }
  };

  const handleOpenCreate = () => {
    setEditingOp(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (op: IOperadoraCartao) => {
    setEditingOp(op);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (op: IOperadoraCartao) => {
    setOpToDelete(op);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!opToDelete) return;
    try {
      await FinanceiroService.deleteOperadoraCartao(opToDelete.id_operadora);
      toast.success("Operadora removida.");
      setIsDeleteModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir operadora (possui vínculo?).");
    }
  };

  return (
    <PageLayout
      title="Operadoras de Cartão"
      subtitle="Configure taxas e prazos das suas maquininhas."
      actions={
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          icon={Plus}
          className="shadow-lg shadow-primary-500/20"
        >
          Nova Operadora
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {operadoras.map((op) => (
          <div
            key={op.id_operadora}
            className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-primary-200 transition-all"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-neutral-200 group-hover:bg-primary-500 transition-colors"></div>

            <div className="flex justify-between items-start mb-6 pl-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-neutral-900 tracking-tight">
                    {op.nome}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">
                    Conta Destino:{" "}
                    {contas.find((c) => c.id_conta === op.id_conta_destino)
                      ?.nome || "Não definida"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <ActionButton
                  onClick={() => handleOpenEdit(op)}
                  icon={Edit}
                  variant="neutral"
                  label="Editar"
                />
                <ActionButton
                  onClick={() => handleOpenDelete(op)}
                  icon={Trash2}
                  variant="danger"
                  label="Excluir"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pl-4">
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                  Débito
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-lg text-neutral-900">
                    {op.taxa_debito}
                  </span>
                  <span className="text-xs font-bold text-neutral-400">%</span>
                </div>
                <p className="text-[10px] font-bold text-neutral-500 mt-1 bg-neutral-100 w-fit px-1.5 py-0.5 rounded">
                  D+{op.prazo_debito}
                </p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                  Créd. Vista
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-lg text-neutral-900">
                    {op.taxa_credito_vista}
                  </span>
                  <span className="text-xs font-bold text-neutral-400">%</span>
                </div>
                <p className="text-[10px] font-bold text-neutral-500 mt-1 bg-neutral-100 w-fit px-1.5 py-0.5 rounded">
                  D+{op.prazo_credito_vista}
                </p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                  Créd. Parc
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-lg text-neutral-900">
                    {op.taxa_credito_parc}
                  </span>
                  <span className="text-xs font-bold text-neutral-400">%</span>
                </div>
                <p className="text-[10px] font-bold text-neutral-500 mt-1 bg-neutral-100 w-fit px-1.5 py-0.5 rounded">
                  D+{op.prazo_credito_parc}
                </p>
              </div>
            </div>

            {op.antecipacao_auto && (
              <div className="mt-5 pl-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-700 bg-primary-50 w-fit px-3 py-1.5 rounded-full border border-primary-100">
                <span className="flex items-center gap-1.5">
                  Antecipação Automática: {op.taxa_antecipacao}%
                </span>
              </div>
            )}
          </div>
        ))}

        {operadoras.length === 0 && (
          <div className="md:col-span-2 py-20 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-center">
            <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
              <CreditCard size={40} className="text-neutral-300" />
            </div>
            <h3 className="text-lg font-bold text-neutral-600">
              Nenhuma operadora cadastrada
            </h3>
            <p className="text-neutral-400 text-sm max-w-xs mt-1">
              Cadastre suas maquininhas de cartão para controlar as taxas e
              recebíveis.
            </p>
            <Button
              onClick={handleOpenCreate}
              variant="primary"
              className="mt-6"
              icon={Plus}
            >
              Cadastrar Agora
            </Button>
          </div>
        )}
      </div>

      <OperadoraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        editingOp={editingOp}
        contas={contas}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Operadora"
        description={`Tem certeza que deseja remover a operadora "${opToDelete?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        variant="danger"
      />
    </PageLayout>
  );
};
