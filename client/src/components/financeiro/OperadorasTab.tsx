import { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  Plus,
  CreditCard,
  Trash2,
  AlertTriangle,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";
import type { IOperadoraCartao, IContaBancaria } from "../../types/backend";
import { StatusBanner } from "../ui/StatusBanner";
import { Button } from "../ui/Button";
import { Input } from "../ui/input";
import { Modal } from "../ui/Modal";
import { ActionButton } from "../ui/ActionButton";

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
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [opRes, accRes] = await Promise.all([
        api.get("/operadora-cartao"),
        api.get("/conta-bancaria"),
      ]);
      setOperadoras(opRes.data);
      setContas(accRes.data.filter((c: IContaBancaria) => c.ativo));
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao carregar dados." });
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
    });
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
    });
    setIsModalOpen(true);
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
        await api.put(`/operadora-cartao/${editingOp.id_operadora}`, formData);
        setStatusMsg({ type: "success", text: "Operadora atualizada!" });
      } else {
        await api.post("/operadora-cartao", formData);
        setStatusMsg({ type: "success", text: "Operadora cadastrada!" });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao salvar operadora." });
    }
  };

  const handleDelete = async () => {
    if (!opToDelete) return;
    try {
      await api.delete(`/operadora-cartao/${opToDelete.id_operadora}`);
      setStatusMsg({ type: "success", text: "Operadora removida." });
      setIsDeleteModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: "Erro ao excluir operadora (possui vínculo?).",
      });
    }
  };

  // Helper for custom input styling to match theme
  const inputClass =
    "w-full rounded-xl border border-neutral-200 text-sm font-bold bg-white focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all";

  return (
    <div className="p-6">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

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
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Input
                  label="Nome da Maquininha"
                  required
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Stone, PagSeguro..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                  Conta Bancária de Destino
                </label>
                <select
                  required
                  value={formData.id_conta_destino}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      id_conta_destino: Number(e.target.value),
                    })
                  }
                  className={`${inputClass} px-3 py-2.5`}
                >
                  <option value={0} disabled>
                    Selecione uma conta...
                  </option>
                  {contas.map((c) => (
                    <option key={c.id_conta} value={c.id_conta}>
                      {c.nome} - {c.banco}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">
                Taxas e Prazos
              </h3>

              {/* DEBITO */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-sm font-bold text-neutral-700">
                  Débito
                </div>
                <div className="col-span-4">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxa_debito}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taxa_debito: Number(e.target.value),
                        })
                      }
                      className={`${inputClass} pl-3 pr-8 py-2`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      %
                    </span>
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      Dias
                    </span>
                    <input
                      type="number"
                      value={formData.prazo_debito}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prazo_debito: Number(e.target.value),
                        })
                      }
                      className={`${inputClass} pl-12 pr-3 py-2`}
                    />
                  </div>
                </div>
              </div>

              {/* CRED VISTA */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-sm font-bold text-neutral-700">
                  Crédito à Vista
                </div>
                <div className="col-span-4">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxa_credito_vista}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taxa_credito_vista: Number(e.target.value),
                        })
                      }
                      className={`${inputClass} pl-3 pr-8 py-2`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      %
                    </span>
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      Dias
                    </span>
                    <input
                      type="number"
                      value={formData.prazo_credito_vista}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prazo_credito_vista: Number(e.target.value),
                        })
                      }
                      className={`${inputClass} pl-12 pr-3 py-2`}
                    />
                  </div>
                </div>
              </div>

              {/* CRED PARC */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4 text-sm font-bold text-neutral-700">
                  Crédito Parcelado
                </div>
                <div className="col-span-4">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxa_credito_parc}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taxa_credito_parc: Number(e.target.value),
                        })
                      }
                      className={`${inputClass} pl-3 pr-8 py-2`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      %
                    </span>
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      Dias
                    </span>
                    <input
                      type="number"
                      value={formData.prazo_credito_parc}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prazo_credito_parc: Number(e.target.value),
                        })
                      }
                      className={`${inputClass} pl-12 pr-3 py-2`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl">
              <input
                type="checkbox"
                id="auto_antecipa"
                checked={formData.antecipacao_auto}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    antecipacao_auto: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="flex-1">
                <label
                  htmlFor="auto_antecipa"
                  className="block text-sm font-bold text-neutral-900 cursor-pointer"
                >
                  Antecipação Automática
                </label>
                <p className="text-xs text-neutral-500">
                  O dinheiro cai no dia seguinte (com taxa extra).
                </p>
              </div>
              {formData.antecipacao_auto && (
                <div className="w-24 relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxa_antecipacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        taxa_antecipacao: Number(e.target.value),
                      })
                    }
                    className={`${inputClass} pl-2 pr-6 py-1 h-8`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                    %
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
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

      {/* TOGGLE STATUS MODAL (REPLACES DELETE) */}
      {isDeleteModalOpen && (
        <Modal
          title={`Confirmar ${opToDelete?.ativo ? "Desativação" : "Ativação"}`}
          onClose={() => setIsDeleteModalOpen(false)}
        >
          <div className="space-y-4">
            <div
              className={`${opToDelete?.ativo ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"} border p-4 rounded-xl flex items-start gap-3`}
            >
              <AlertTriangle
                className={`${opToDelete?.ativo ? "text-red-600" : "text-emerald-600"} shrink-0`}
                size={24}
              />
              <div>
                <h3
                  className={`font-bold ${opToDelete?.ativo ? "text-red-900" : "text-emerald-900"}`}
                >
                  Atenção!
                </h3>
                <p
                  className={`text-sm mt-1 ${opToDelete?.ativo ? "text-red-700" : "text-emerald-700"}`}
                >
                  Você deseja {opToDelete?.ativo ? "desativar" : "ativar"} a
                  operadora{" "}
                  <span className="font-black">{opToDelete?.nome}</span>?
                  <br />
                  <span className="text-xs opacity-80">
                    O histórico financeiro será mantido.
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant={opToDelete?.ativo ? "danger" : "primary"}
                onClick={handleDelete}
                icon={opToDelete?.ativo ? EyeOff : Eye}
              >
                Confirmar {opToDelete?.ativo ? "Desativação" : "Ativação"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
