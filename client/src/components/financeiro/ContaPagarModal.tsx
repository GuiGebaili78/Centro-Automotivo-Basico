import React, { useState, useEffect } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { CategorySelector } from "../shared/financeiro/CategorySelector";
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
          <Input
            label="Descrição / Título"
            required
            value={formData.descricao}
            onChange={(e) =>
              setFormData({ ...formData, descricao: e.target.value })
            }
            placeholder="Ex: Compra Material Limpeza"
          />
          <Input
            label="Credor"
            value={formData.credor}
            onChange={(e) =>
              setFormData({ ...formData, credor: e.target.value })
            }
            placeholder="Ex: Fornecedor X"
          />
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
          <div>
            <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
              Status
            </label>
            <select
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-600 font-medium text-sm h-[42px] outline-none bg-white transition-all"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
            </select>
          </div>
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

        {/* 6. Recurrence Update Option */}
        {editingId && recurrenceInfo && (
          <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
            <input
              type="checkbox"
              id="editSeries"
              checked={applyToAllRecurrences}
              onChange={(e) => setApplyToAllRecurrences(e.target.checked)}
              className="rounded border-blue-400 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="editSeries"
              className="text-sm font-bold text-blue-800"
            >
              Aplicar alterações para toda a série (Recorrência)?
            </label>
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
