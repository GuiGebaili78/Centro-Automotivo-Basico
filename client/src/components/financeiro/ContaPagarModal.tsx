import React, { useState, useEffect } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { Modal, Button, Input, AutocompleteInput, Checkbox, Select } from "../ui";
import { CategorySelector } from "./CategorySelector";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";
import type { IContasPagar, IRecurrenceInfo } from "../../types/backend";

interface ContaPagarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingId: number | null;
}

export const ContaPagarModal: React.FC<ContaPagarModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingId,
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [recurrenceInfo, setRecurrenceInfo] = useState<IRecurrenceInfo | null>(
    null,
  );
  const [applyToAllRecurrences, setApplyToAllRecurrences] = useState(false);

  const [formData, setFormData] = useState({
    descricao: "",
    credor: "",
    categoria: "OUTROS",
    id_categoria: undefined as number | undefined,
    valor: "",
    dt_emissao: new Date().toISOString().split("T")[0],
    dt_vencimento: new Date().toISOString().split("T")[0],
    num_documento: "",
    status: "PENDENTE",
    dt_pagamento: "",
    url_anexo: "",
    obs: "",
    repetir_parcelas: 0,
    nf_numero: "",
    nf_boleto: "",
    nf_parcela: "" as string | number,
    nf_total_parcelas: "" as string | number,
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (editingId) {
        loadContaToEdit(editingId);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingId]);

  const loadCategories = async () => {
    try {
      const data = await FinanceiroService.getCategoriasFinanceiras();
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadContaToEdit = async (id: number) => {
    try {
      setLoading(true);
      const allContas = await FinanceiroService.getContasPagar();
      const conta = allContas.find(
        (c: IContasPagar) => c.id_conta_pagar === id,
      );

      if (!conta) {
        toast.error("Conta não encontrada.");
        onClose();
        return;
      }

      // Load recurrence information
      try {
        const info = await FinanceiroService.getRecurrenceInfo(id);
        setRecurrenceInfo(info);
      } catch (error) {
        setRecurrenceInfo(null);
      }

      setFormData({
        descricao: conta.descricao,
        credor: conta.credor || "",
        categoria: conta.categoria || "OUTROS",
        id_categoria: conta.id_categoria || undefined,
        valor: Number(conta.valor).toFixed(2),
        dt_emissao: conta.dt_emissao
          ? new Date(conta.dt_emissao).toISOString().split("T")[0]
          : "",
        dt_vencimento: new Date(conta.dt_vencimento)
          .toISOString()
          .split("T")[0],
        num_documento: conta.num_documento || "",
        status: conta.status,
        dt_pagamento: conta.dt_pagamento
          ? new Date(conta.dt_pagamento).toISOString().split("T")[0]
          : "",
        url_anexo: conta.url_anexo || "",
        obs: conta.obs || "",
        repetir_parcelas: 0,
        nf_numero: conta.nf_numero || "",
        nf_boleto: conta.nf_boleto || "",
        nf_parcela: conta.nf_parcela !== null && conta.nf_parcela !== undefined ? String(conta.nf_parcela) : "",
        nf_total_parcelas: conta.nf_total_parcelas !== null && conta.nf_total_parcelas !== undefined ? String(conta.nf_total_parcelas) : "",
      });
      setApplyToAllRecurrences(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar detalhes da conta.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: "",
      credor: "",
      categoria: "OUTROS",
      id_categoria: undefined,
      valor: "",
      dt_emissao: new Date().toISOString().split("T")[0],
      dt_vencimento: new Date().toISOString().split("T")[0],
      num_documento: "",
      status: "PENDENTE",
      dt_pagamento: "",
      url_anexo: "",
      obs: "",
      repetir_parcelas: 0,
      nf_numero: "",
      nf_boleto: "",
      nf_parcela: "",
      nf_total_parcelas: "",
    });
    setRecurrenceInfo(null);
    setApplyToAllRecurrences(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        ...formData,
        descricao: formData.descricao.toUpperCase(),
        credor: formData.credor.toUpperCase(),
        valor: Number(formData.valor),
        applyToAllRecurrences,
        dt_pagamento:
          formData.status === "PAGO"
            ? formData.dt_pagamento
              ? new Date(formData.dt_pagamento).toISOString()
              : new Date().toISOString()
            : null,
        dt_vencimento: new Date(formData.dt_vencimento).toISOString(),
        dt_emissao: formData.dt_emissao
          ? new Date(formData.dt_emissao).toISOString()
          : null,
        nf_numero: formData.nf_numero ? formData.nf_numero.trim() : null,
        nf_boleto: formData.nf_boleto ? formData.nf_boleto.trim() : null,
        nf_parcela: formData.nf_parcela !== "" ? Number(formData.nf_parcela) : null,
        nf_total_parcelas: formData.nf_total_parcelas !== "" ? Number(formData.nf_total_parcelas) : null,
      };

      if (editingId) {
        await FinanceiroService.updateContaPagar(editingId, payload);
        toast.success(
          applyToAllRecurrences
            ? "Série de contas atualizada com sucesso!"
            : "Conta atualizada com sucesso!",
        );
      } else {
        await FinanceiroService.createContaPagar(payload);
        toast.success("Conta lançada com sucesso!");
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
      title={editingId ? "Editar Conta" : "Nova Conta a Pagar"}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={handleSave} className="space-y-6 pt-4">
        {/* 1. Descrição & Credor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <AutocompleteInput
              label="Descrição / Título"
              required
              value={formData.descricao}
              onChange={(val) =>
                setFormData({ ...formData, descricao: val })
              }
              fetchSuggestions={(q) => FinanceiroService.buscarDescricao(q)}
              placeholder="Ex: COMPRA MATERIAL LIMPEZA"
            />
          </div>
          <div className="relative">
            <AutocompleteInput
              label="Credor"
              value={formData.credor}
              onChange={(val) =>
                setFormData({ ...formData, credor: val })
              }
              fetchSuggestions={(q) => FinanceiroService.buscarCredor(q)}
              placeholder="Ex: FORNECEDOR X"
            />
          </div>
        </div>

        {/* 2. Categoria & Valor & Repetição */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12 lg:col-span-5">
            <CategorySelector
              categories={categories}
              value={formData.id_categoria}
              onChange={(id, nome) => {
                const cat = categories.find((c) => c.id_categoria === id);
                let fullCategoryName = nome;

                if (cat && cat.parentId) {
                  const parent = categories.find(
                    (c) => c.id_categoria === cat.parentId,
                  );
                  if (parent) {
                    fullCategoryName = `${parent.nome} - ${nome}`;
                  }
                }

                setFormData({
                  ...formData,
                  id_categoria: id,
                  categoria: fullCategoryName,
                });
              }}
              type="AMBOS"
              required
            />
          </div>

          <div className="md:col-span-6 lg:col-span-3">
            <Input
              label="Repetir (Meses)"
              type="number"
              min={0}
              max={60}
              value={formData.repetir_parcelas}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  repetir_parcelas: Number(e.target.value),
                })
              }
              placeholder="0"
              title="Cria cópias desta conta para os próximos meses"
            />
          </div>

          <div className="md:col-span-6 lg:col-span-4">
            <Input
              label="Valor do Título (R$)"
              type="number"
              step="0.01"
              required
              value={formData.valor}
              onChange={(e) =>
                setFormData({ ...formData, valor: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
        </div>

        {/* 3. Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data de Emissão"
            type="date"
            value={formData.dt_emissao}
            onChange={(e) =>
              setFormData({ ...formData, dt_emissao: e.target.value })
            }
          />
          <Input
            label="Data de Vencimento"
            type="date"
            required
            value={formData.dt_vencimento}
            onChange={(e) =>
              setFormData({ ...formData, dt_vencimento: e.target.value })
            }
          />
        </div>

        {/* 4. Documento & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número do Documento"
            value={formData.num_documento}
            onChange={(e) =>
              setFormData({ ...formData, num_documento: e.target.value })
            }
            placeholder="Nota Fiscal / Boleto"
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
          >
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
          </Select>
        </div>

        {/* 5. Anexos */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Input
            label="Arquivos / Anexos (URL)"
            icon={Upload}
            value={formData.url_anexo}
            onChange={(e) =>
              setFormData({ ...formData, url_anexo: e.target.value })
            }
            placeholder="https://..."
          />
        </div>

        {/* 5.1 Vínculo de Nota Fiscal (Sincronização - FASE 2) */}
        <div className="bg-amber-50/30 border border-amber-100/70 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
            <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">
              Vínculo de Nota Fiscal (Sincronização)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número da NF (Sincronização Sensível)"
              value={formData.nf_numero}
              onChange={(e) =>
                setFormData({ ...formData, nf_numero: e.target.value })
              }
              placeholder="Ex: 000.123.456"
              labelClassName="text-amber-800 font-semibold"
              className="border-amber-300 focus:border-amber-500 focus:ring-amber-100 bg-amber-50/10 placeholder:text-amber-600/40 text-amber-900 font-medium"
            />
            <Input
              label="Referência do Boleto / Identificador"
              value={formData.nf_boleto}
              onChange={(e) =>
                setFormData({ ...formData, nf_boleto: e.target.value })
              }
              placeholder="Ex: BOL-1234"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número da Parcela"
              type="number"
              min={1}
              value={formData.nf_parcela}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nf_parcela: e.target.value ? Number(e.target.value) : "",
                })
              }
              placeholder="Ex: 1"
            />
            <Input
              label="Total de Parcelas da NF"
              type="number"
              min={1}
              value={formData.nf_total_parcelas}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nf_total_parcelas: e.target.value ? Number(e.target.value) : "",
                })
              }
              placeholder="Ex: 3"
            />
          </div>
        </div>

        {/* 6. Recurrence Update Option */}
        {editingId && recurrenceInfo && (
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
            <Checkbox
              id="editSeries"
              checked={applyToAllRecurrences}
              onChange={(e) => setApplyToAllRecurrences(e.target.checked)}
              label="Aplicar alterações para toda a série (Recorrência)?"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Salvar Conta
          </Button>
        </div>
      </form>
    </Modal>
  );
};
