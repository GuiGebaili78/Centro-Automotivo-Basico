import { useState, useEffect } from "react";
import { FinanceiroService } from "../../../services/financeiro.service";
import { Plus, CreditCard, Trash2, Edit } from "lucide-react";
import type {
  IOperadoraCartao,
  IContaBancaria,
  ITaxaCartao,
} from "../../../types/backend";

import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { ActionButton } from "../../ui/ActionButton";
import { ConfirmModal } from "../../ui/ConfirmModal";
import { Select } from "../../ui/Select";
import { Checkbox } from "../../ui/Checkbox";
import { toast } from "react-toastify";

export const OperadorasTab = () => {
  const [operadoras, setOperadoras] = useState<IOperadoraCartao[]>([]);
  const [contas, setContas] = useState<IContaBancaria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<IOperadoraCartao | null>(null);
  const [opToDelete, setOpToDelete] = useState<IOperadoraCartao | null>(null);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [operadoras, contas] = await Promise.all([
        FinanceiroService.getOperadorasCartao(),
        FinanceiroService.getContasBancarias(),
      ]);
      setOperadoras(operadoras);
      setContas(contas.filter((c: IContaBancaria) => c.ativo));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    }
  };

  const handleOpenCreate = () => {
    setEditingOp(null);
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
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (op: IOperadoraCartao) => {
    setEditingOp(op);
    setFormData({
      ...op,
      taxa_debito: Number(op.taxa_debito),
      taxa_credito_vista: Number(op.taxa_credito_vista),
      taxa_credito_parc: Number(op.taxa_credito_parc),
      taxa_antecipacao: Number(op.taxa_antecipacao),
      taxas_cartao: op.taxas_cartao || [],
    });
    setIsDirty(false);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    if (isDirty) {
      if (confirm("Deseja sair sem salvar as alterações?")) {
        setIsModalOpen(false);
        setIsDirty(false);
      }
    } else {
      setIsModalOpen(false);
    }
  };

  const handleChange = (newFormData: Partial<IOperadoraCartao>) => {
    setFormData(newFormData);
    setIsDirty(true);
  };

  const handleOpenDelete = (op: IOperadoraCartao) => {
    setOpToDelete(op);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id_conta_destino || formData.id_conta_destino <= 0) {
      alert("Selecione uma conta bancária de destino.");
      return;
    }

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
      setIsModalOpen(false);
      setIsDirty(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar operadora.");
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">
            Operadoras de Cartão
          </h2>
          <p className="text-neutral-500 text-sm">
            Configure taxas e prazos das suas maquininhas.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          icon={Plus}
          className="shadow-lg shadow-primary-500/20"
        >
          Nova Operadora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {operadoras.map((op) => (
          <div
            key={op.id_operadora}
            className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-neutral-200 group-hover:bg-blue-500 transition-colors"></div>

            <div className="flex justify-between items-start mb-6 pl-4">
              <div className="flex items-center gap-3">
                <div className="bg-neutral-100 p-2 rounded-lg text-neutral-600">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-neutral-900">
                    {op.nome}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Conta Destino:{" "}
                    {contas.find((c) => c.id_conta === op.id_conta_destino)
                      ?.nome || "?"}
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

            <div className="grid grid-cols-3 gap-2 pl-4">
              <div className="bg-neutral-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                  Débito
                </p>
                <p className="font-bold text-neutral-900">{op.taxa_debito}%</p>
                <p className="text-[10px] text-neutral-500">
                  D+{op.prazo_debito}
                </p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                  Créd. Vista
                </p>
                <p className="font-bold text-neutral-900">
                  {op.taxa_credito_vista}%
                </p>
                <p className="text-[10px] text-neutral-500">
                  D+{op.prazo_credito_vista}
                </p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                  Créd. Parc
                </p>
                <p className="font-bold text-neutral-900">
                  {op.taxa_credito_parc}%
                </p>
                <p className="text-[10px] text-neutral-500">
                  D+{op.prazo_credito_parc}
                </p>
              </div>
            </div>

            {op.antecipacao_auto && (
              <div className="mt-4 pl-4 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-full">
                <span>Antecipação Automática: {op.taxa_antecipacao}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <Modal
          title={editingOp ? "Editar Operadora" : "Nova Operadora"}
          onClose={handleModalClose}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Input
                  label="Nome da Maquininha"
                  required
                  value={formData.nome}
                  onChange={(e) =>
                    handleChange({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Stone, PagSeguro..."
                />
              </div>
              <div>
                <Select
                  label="Conta Bancária de Destino"
                  required
                  value={formData.id_conta_destino}
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
            </div>

            <div className="bg-neutral-50 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">
                Tabela de Taxas Intermediárias & Juros
              </h3>

              {/* TABLE HEADER */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2 text-center">
                <div className="col-span-2 text-left">Parcelas</div>
                <div className="col-span-3">Modalidade</div>
                <div className="col-span-3">Taxa Total (%)</div>
                <div className="col-span-3">Taxa Antec. (a.m)</div>
              </div>

              {/* DÉBITO */}
              <div className="grid grid-cols-12 gap-2 items-center mb-2">
                <div className="col-span-2 text-xs font-bold text-neutral-700">
                  Débito
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    DÉBITO
                  </span>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxa_debito}
                    onChange={(e) =>
                      handleChange({
                        ...formData,
                        taxa_debito: Number(e.target.value),
                      })
                    }
                    className="h-9 text-center"
                  />
                </div>
                <div className="col-span-3 opacity-50 text-center text-xs">
                  -
                </div>
              </div>

              {/* CRÉDITO VISTA */}
              <div className="grid grid-cols-12 gap-2 items-center mb-2">
                <div className="col-span-2 text-xs font-bold text-neutral-700">
                  1x (Vista)
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded">
                    CRÉDITO
                  </span>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxa_credito_vista}
                    onChange={(e) =>
                      handleChange({
                        ...formData,
                        taxa_credito_vista: Number(e.target.value),
                      })
                    }
                    className="h-9 text-center"
                  />
                </div>
                <div className="col-span-3 text-center">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxa_antecipacao}
                    onChange={(e) =>
                      handleChange({
                        ...formData,
                        taxa_antecipacao: Number(e.target.value),
                      })
                    }
                    className="h-9 text-center"
                  />
                </div>
              </div>

              {/* Dynamic 2x to 18x */}
              {Array.from({ length: 17 }, (_, i) => i + 2).map((num) => {
                const existingTaxa = formData.taxas_cartao?.find(
                  (t: ITaxaCartao) =>
                    t.num_parcelas === num && t.modalidade === "CREDITO",
                );

                return (
                  <div
                    key={num}
                    className="grid grid-cols-12 gap-2 items-center mb-1"
                  >
                    <div className="col-span-2 text-xs font-bold text-neutral-600">
                      {num}x
                    </div>
                    <div className="col-span-3">
                      <span className="text-[10px] font-bold bg-green-50 text-green-500 px-2 py-0.5 rounded">
                        PARC.
                      </span>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={existingTaxa?.taxa_total || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const newTaxas = [...(formData.taxas_cartao || [])];
                          const idx = newTaxas.findIndex(
                            (t) =>
                              t.num_parcelas === num &&
                              t.modalidade === "CREDITO",
                          );

                          if (idx >= 0) {
                            newTaxas[idx] = {
                              ...newTaxas[idx],
                              taxa_total: val,
                            };
                          } else {
                            newTaxas.push({
                              modalidade: "CREDITO",
                              num_parcelas: num,
                              taxa_total: val,
                              taxa_antecipacao: 0,
                            });
                          }
                          handleChange({ ...formData, taxas_cartao: newTaxas });
                        }}
                        className="h-8 text-center bg-neutral-50 focus:bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00" // Antecipacao rate
                        value={existingTaxa?.taxa_antecipacao || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const newTaxas = [...(formData.taxas_cartao || [])];
                          const idx = newTaxas.findIndex(
                            (t) =>
                              t.num_parcelas === num &&
                              t.modalidade === "CREDITO",
                          );

                          if (idx >= 0) {
                            newTaxas[idx] = {
                              ...newTaxas[idx],
                              taxa_antecipacao: val,
                            };
                          } else {
                            newTaxas.push({
                              modalidade: "CREDITO",
                              num_parcelas: num,
                              taxa_total: 0,
                              taxa_antecipacao: val,
                            });
                          }
                          handleChange({ ...formData, taxas_cartao: newTaxas });
                        }}
                        className="h-8 text-center bg-neutral-50 focus:bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl">
              <Checkbox
                label="Antecipação Automática"
                id="auto_antecipa"
                checked={formData.antecipacao_auto}
                onChange={(e) =>
                  handleChange({
                    ...formData,
                    antecipacao_auto: (e.target as HTMLInputElement).checked,
                  })
                }
              />
              <div className="ml-8">
                <p className="text-xs text-neutral-500">
                  O dinheiro cai no dia seguinte (com taxa extra).
                </p>
              </div>
              {formData.antecipacao_auto && (
                <div className="w-24 relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.taxa_antecipacao}
                    onChange={(e) =>
                      handleChange({
                        ...formData,
                        taxa_antecipacao: Number(e.target.value),
                      })
                    }
                    className="h-8 pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">
                    %
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={handleModalClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="shadow-lg shadow-primary-500/20"
              >
                Salvar Configurações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* TOGGLE STATUS CONFIRM MODAL */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Confirmar ${opToDelete?.ativo ? "Desativação" : "Ativação"}`}
        description={`Você deseja ${opToDelete?.ativo ? "desativar" : "ativar"} a operadora "${opToDelete?.nome}"? O histórico financeiro será mantido.`}
        confirmText={`Confirmar ${opToDelete?.ativo ? "Desativação" : "Ativação"}`}
        variant={opToDelete?.ativo ? "danger" : "primary"}
      />
    </div>
  );
};
