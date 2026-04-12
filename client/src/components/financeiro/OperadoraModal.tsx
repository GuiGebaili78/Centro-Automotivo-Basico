import React, { useState, useEffect } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { CreditCard } from "lucide-react";
import type { IOperadoraCartao, IContaBancaria, ITaxaCartao } from "../../types/backend";
import { Button, Input, Modal, Select, Checkbox } from "../ui";
import { toast } from "react-toastify";

interface OperadoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOp: IOperadoraCartao | null;
  contas: IContaBancaria[];
}

// Helper to extract a specific taxa from the array
const getTaxa = (
  taxas: ITaxaCartao[],
  modalidade: string,
  parcela: number
): ITaxaCartao | undefined =>
  taxas.find((t) => t.modalidade === modalidade && t.parcela === parcela);

const upsertTaxa = (
  taxas: ITaxaCartao[],
  modalidade: string,
  parcela: number,
  field: "taxa_base_pct" | "taxa_juros_pct" | "taxa_base_cliente_pct",
  value: number
): ITaxaCartao[] => {
  const idx = taxas.findIndex(
    (t) => t.modalidade === modalidade && t.parcela === parcela
  );
  const next = [...taxas];
  if (idx >= 0) {
    next[idx] = { ...next[idx], [field]: value };
  } else {
    next.push({
      modalidade: modalidade as ITaxaCartao["modalidade"],
      parcela,
      taxa_base_pct: field === "taxa_base_pct" ? value : 0,
      taxa_juros_pct: field === "taxa_juros_pct" ? value : 0,
      taxa_base_cliente_pct: field === "taxa_base_cliente_pct" ? value : 0,
    });
  }
  return next;
};

const EMPTY_FORM: Partial<IOperadoraCartao> = {
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
  taxas_cartao: [],
};

export const OperadoraModal: React.FC<OperadoraModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingOp,
  contas,
}) => {
  const [formData, setFormData] = useState<Partial<IOperadoraCartao>>(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingOp) {
      setFormData({
        ...editingOp,
        taxa_debito: Number(editingOp.taxa_debito),
        taxa_credito_vista: Number(editingOp.taxa_credito_vista),
        taxa_credito_parc: Number(editingOp.taxa_credito_parc),
        taxa_antecipacao: Number(editingOp.taxa_antecipacao),
        taxas_cartao: (editingOp.taxas_cartao || []).map((t) => ({
          ...t,
          taxa_base_pct: Number(t.taxa_base_pct),
          taxa_juros_pct: Number(t.taxa_juros_pct),
        })),
      });
    } else {
      setFormData({
        ...EMPTY_FORM,
        id_conta_destino: contas.length > 0 ? contas[0].id_conta : 0,
        taxas_cartao: [],
      });
    }
    setIsDirty(false);
  }, [editingOp, contas, isOpen]);

  const handleModalClose = () => {
    if (isDirty) {
      if (window.confirm("Deseja sair sem salvar as alterações?")) onClose();
    } else {
      onClose();
    }
  };

  const handleChange = (newFormData: Partial<IOperadoraCartao>) => {
    setFormData(newFormData);
    setIsDirty(true);
  };

  const taxas = formData.taxas_cartao || [];

  // --- Seção A helpers ---
  const getTaxaSimples = (modalidade: string) =>
    Number(getTaxa(taxas, modalidade, 1)?.taxa_base_pct ?? 0);

  const setTaxaSimples = (modalidade: string, value: number) => {
    const newTaxas = upsertTaxa(taxas, modalidade, 1, "taxa_base_pct", value);
    // Ensure taxa_juros_pct = 0 for simple modalities
    const idx = newTaxas.findIndex((t) => t.modalidade === modalidade && t.parcela === 1);
    if (idx >= 0) newTaxas[idx] = { ...newTaxas[idx], taxa_juros_pct: 0 };
    handleChange({ ...formData, taxas_cartao: newTaxas });
  };

  // --- Seção B helpers ---
  const getCreditoBase = (parcela: number) =>
    Number(getTaxa(taxas, "CREDITO", parcela)?.taxa_base_pct ?? "");

  const getCreditoJuros = (parcela: number) =>
    Number(getTaxa(taxas, "CREDITO", parcela)?.taxa_juros_pct ?? "");

  const setCreditoField = (
    parcela: number,
    field: "taxa_base_pct" | "taxa_juros_pct" | "taxa_base_cliente_pct",
    value: number
  ) => {
    const newTaxas = upsertTaxa(taxas, "CREDITO", parcela, field, value);
    handleChange({ ...formData, taxas_cartao: newTaxas });
  };

  const getCreditoClientePct = (parcela: number) =>
    Number(getTaxa(taxas, "CREDITO", parcela)?.taxa_base_cliente_pct ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_conta_destino || formData.id_conta_destino <= 0) {
      toast.error("Selecione uma conta bancária de destino.");
      return;
    }
    setLoading(true);
    try {
      if (editingOp) {
        await FinanceiroService.updateOperadoraCartao(editingOp.id_operadora, formData);
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
        {/* ── Cabeçalho: Nome + Conta ── */}
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Nome da Maquininha"
            required
            value={formData.nome || ""}
            onChange={(e) => handleChange({ ...formData, nome: e.target.value })}
            placeholder="Ex: Stone, PagSeguro..."
            icon={CreditCard}
          />
          <Select
            label="Conta Bancária de Destino"
            required
            value={formData.id_conta_destino || 0}
            onChange={(e) =>
              handleChange({ ...formData, id_conta_destino: Number(e.target.value) })
            }
          >
            <option value={0} disabled>Selecione uma conta...</option>
            {contas.map((c) => (
              <option key={c.id_conta} value={c.id_conta}>
                {c.nome} - {c.banco}
              </option>
            ))}
          </Select>
        </div>

        {/* ── SEÇÃO A: Recebimento Imediato ── */}
        <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 space-y-4">
          <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">
            Seção A — Taxas de Recebimento Imediato
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* PIX Máquina */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                PIX Máquina (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={getTaxaSimples("PIX") || ""}
                onChange={(e) => setTaxaSimples("PIX", Number(e.target.value))}
                className="text-center font-bold text-violet-600"
              />
            </div>
            {/* Débito */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Débito (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={getTaxaSimples("DEBITO") || ""}
                onChange={(e) => setTaxaSimples("DEBITO", Number(e.target.value))}
                className="text-center font-bold text-blue-600"
              />
            </div>
            {/* Crédito à Vista */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Créd. à Vista (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={getTaxaSimples("CREDITO_AVISTA") || ""}
                onChange={(e) => setTaxaSimples("CREDITO_AVISTA", Number(e.target.value))}
                className="text-center font-bold text-emerald-600"
              />
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 italic">
            Crédito à Vista = recebimento antecipado (sem parcelamento). PIX Máquina = QR Code via maquininha.
          </p>
        </div>

        {/* ── SEÇÃO B: Crédito a Prazo / Parcelado ── */}
        <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 space-y-3">
          <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">
            Seção B — Crédito a Prazo / Parcelado (1x a 18x)
          </h3>

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center px-1">
            <div className="col-span-1 text-left">Nx</div>
            <div className="col-span-3">Juros Parcela (%)</div>
            <div className="col-span-3">Máquina Loja (%)</div>
            <div className="col-span-3">Máquina Cliente (%)</div>
            <div className="col-span-2">Custo Loja</div>
          </div>

          {/* 18 linhas */}
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {Array.from({ length: 18 }, (_, i) => i + 1).map((num) => {
              const juros = getCreditoJuros(num);
              const base = getCreditoBase(num);
              const baseCliente = getCreditoClientePct(num);
              const custoLoja = (base || 0) + (juros || 0);
              const hasValue = juros > 0 || base > 0 || baseCliente > 0;

              return (
                <div
                  key={num}
                  className={`grid grid-cols-12 gap-1.5 items-center rounded-lg px-1 py-0.5 transition-colors ${hasValue ? "bg-emerald-50/50" : ""}`}
                >
                  {/* Label Nx */}
                  <div className="col-span-1">
                    <span className={`text-[10px] font-black px-1 py-0.5 rounded ${hasValue ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {num}x
                    </span>
                  </div>

                  {/* Juros da Parcela */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={juros || ""}
                      onChange={(e) =>
                        setCreditoField(num, "taxa_juros_pct", Number(e.target.value))
                      }
                      className="h-7 text-center text-[11px] bg-white focus:bg-white font-bold text-orange-700 border-orange-100 focus:border-orange-400"
                    />
                  </div>

                  {/* Taxa Máquina: Loja Assume */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={base || ""}
                      onChange={(e) =>
                        setCreditoField(num, "taxa_base_pct", Number(e.target.value))
                      }
                      className="h-7 text-center text-[11px] bg-white focus:bg-white font-bold text-emerald-700 border-emerald-100 focus:border-emerald-400"
                    />
                  </div>

                  {/* Taxa Máquina: Cliente Assume */}
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={baseCliente || ""}
                      onChange={(e) =>
                        setCreditoField(num, "taxa_base_cliente_pct", Number(e.target.value))
                      }
                      className="h-7 text-center text-[11px] bg-white focus:bg-white font-bold text-blue-700 border-blue-100 focus:border-blue-400"
                    />
                  </div>

                  {/* Custo Total Loja (disabled: juros + base_loja) */}
                  <div className="col-span-2 text-center">
                    <span
                      className={`text-[11px] font-black px-2 py-1 rounded block ${hasValue && custoLoja > 0 ? "bg-rose-100 text-rose-700" : "text-neutral-300"}`}
                    >
                      {hasValue && custoLoja > 0 ? `${custoLoja.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-400 italic">
            Crédito 1x aqui = parcelado em 1x com prazo (diferente do Crédito à Vista da Seção A).
          </p>
        </div>

        {/* ── Prazo / Antecipação ── */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Prazo Débito (dias)"
            type="number"
            value={formData.prazo_debito ?? 1}
            onChange={(e) =>
              handleChange({ ...formData, prazo_debito: Number(e.target.value) })
            }
            className="text-center"
          />
          <Input
            label="Prazo Créd. Vista (dias)"
            type="number"
            value={formData.prazo_credito_vista ?? 30}
            onChange={(e) =>
              handleChange({ ...formData, prazo_credito_vista: Number(e.target.value) })
            }
            className="text-center"
          />
          <Input
            label="Prazo Créd. Parc. (dias)"
            type="number"
            value={formData.prazo_credito_parc ?? 30}
            onChange={(e) =>
              handleChange({ ...formData, prazo_credito_parc: Number(e.target.value) })
            }
            className="text-center"
          />
        </div>

        {/* ── Antecipação Automática ── */}
        <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 flex items-center justify-between">
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
              Ative para receber o valor das vendas no dia seguinte ao pagamento.
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
                  handleChange({ ...formData, taxa_antecipacao: Number(e.target.value) })
                }
                className="font-bold text-primary-700"
              />
            </div>
          )}
        </div>

        {/* ── Ações ── */}
        <div className="pt-4 flex justify-end gap-4">
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
