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
          const taxas = op.taxas_cartao || [];
          const taxaPix = getTaxa(taxas, "PIX", 1);
          const taxaDebito = getTaxa(taxas, "DEBITO", 1);
          const taxaAvista = getTaxa(taxas, "CREDITO_AVISTA", 1);
          const parceladas = taxas.filter((t: any) => t.modalidade === "CREDITO");
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

              {/* Seção A: Taxas imediatas */}
              <div className="grid grid-cols-3 gap-2 pl-4 mb-4">
                <div className="bg-violet-50 border border-violet-100 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-violet-500 uppercase mb-1 flex items-center gap-1">
                    <Wifi size={10} /> PIX Máquina
                  </p>
                  <p className="text-sm font-bold text-violet-700">
                    {taxaPix ? `${Number(taxaPix.taxa_base_pct).toFixed(2)}%` : "—"}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Débito</p>
                  <p className="text-sm font-bold text-blue-700">
                    {taxaDebito ? `${Number(taxaDebito.taxa_base_pct).toFixed(2)}%` : "—"}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Créd. Vista</p>
                  <p className="text-sm font-bold text-emerald-700">
                    {taxaAvista ? `${Number(taxaAvista.taxa_base_pct).toFixed(2)}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Seção B: Parcelamento resumido */}
              {parceladas.length > 0 && (
                <div className="pl-4">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ArrowRightLeft size={10} /> Parcelado ({parceladas.length}x configuradas)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {parceladas
                      .sort((a: any, b: any) => a.parcela - b.parcela)
                      .slice(0, 9)
                      .map((t: any) => (
                        <span
                          key={t.parcela}
                          className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-1 rounded"
                        >
                          {t.parcela}x = {(Number(t.taxa_base_pct) + Number(t.taxa_juros_pct)).toFixed(2)}%
                        </span>
                      ))}
                    {parceladas.length > 9 && (
                      <span className="text-[10px] text-neutral-400 italic px-2 py-1">
                        +{parceladas.length - 9} mais
                      </span>
                    )}
                  </div>
                </div>
              )}
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
