import { useState, useEffect } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { Plus, CreditCard, Trash2, Edit, Wifi, ArrowRightLeft } from "lucide-react";
import type { IOperadoraCartao, IContaBancaria } from "../../types/backend";
import { Button, ActionButton, ConfirmModal } from "../ui";
import { toast } from "react-toastify";
import { OperadoraModal } from "./OperadoraModal";

// Helper to get taxa from array
const getTaxa = (taxas: any[], modalidade: string, parcela = 1) =>
  taxas?.find((t: any) => t.modalidade === modalidade && t.parcela === parcela);

export const OperadorasTab = () => {
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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Operadoras de Cartão</h2>
          <p className="text-gray-500 text-sm">
            Configure taxas de PIX, Débito, Crédito e Parcelamento por operadora.
          </p>
        </div>
        <Button
          onClick={() => { setEditingOp(null); setIsModalOpen(true); }}
          variant="primary"
          icon={Plus}
          className="shadow-lg shadow-primary-500/20"
        >
          Nova Operadora
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {operadoras.map((op) => {
          const contaDestino = contas.find((c) => c.id_conta === op.id_conta_destino);

          return (
            <div
              key={op.id_operadora}
              className="bg-surface p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-primary-200 hover:shadow-md transition-all"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-neutral-200 group-hover:bg-primary-500 transition-colors" />

              {/* Nome + Ações */}
              <div className="flex justify-between items-start mb-5 pl-4">
                <div className="flex items-center gap-3">
                  <div className="bg-neutral-100 p-2.5 rounded-xl text-neutral-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{op.nome}</h3>
                    <p className="text-xs text-gray-500">
                      Conta: {contaDestino?.nome || "N/I"} · {contaDestino?.banco || ""}
                    </p>
                    {op.antecipacao_auto && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1">
                        <Wifi size={10} /> Antecipação {op.taxa_antecipacao}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => { setEditingOp(op); setIsModalOpen(true); }}
                    icon={Edit}
                    variant="neutral"
                    label="Editar"
                  />
                  <ActionButton
                    onClick={() => { setOpToDelete(op); setIsDeleteModalOpen(true); }}
                    icon={Trash2}
                    variant="danger"
                    label="Excluir"
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal de Criar/Editar */}
      <OperadoraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        editingOp={editingOp}
        contas={contas}
      />

      {/* Modal de Confirmar Exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Excluir Operadora`}
        description={`Você deseja excluir a operadora "${opToDelete?.nome}"? O histórico financeiro será mantido.`}
        confirmText="Confirmar Exclusão"
        variant="danger"
      />
    </div>
  );
};
