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

interface BoletoLinha {
  id_local: number;
  identificador: string;
  vencimento: string;
  valor: string;
}

export const ContaPagarModal: React.FC<ContaPagarModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingId,
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [recurrenceInfo, setRecurrenceInfo] = useState<IRecurrenceInfo | null>(null);
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
  });

  const [qtdBoletos, setQtdBoletos] = useState<number>(1);
  const [boletos, setBoletos] = useState<BoletoLinha[]>([
    {
      id_local: 1,
      identificador: "",
      vencimento: new Date().toISOString().split("T")[0],
      valor: ""
    }
  ]);

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

  // Sync logic for Qtd Boletos
  useEffect(() => {
    if (editingId) return; // Don't auto-generate lines when editing
    
    setBoletos(prev => {
      const newList = [...prev];
      if (qtdBoletos > prev.length) {
        const baseDate = new Date(prev[0]?.vencimento || formData.dt_vencimento || new Date());
        
        // Let's divide value by qtd if possible, or just leave blank
        const baseValor = Number(formData.valor) / qtdBoletos;
        const formattedValor = baseValor ? baseValor.toFixed(2) : "";

        for (let i = prev.length; i < qtdBoletos; i++) {
          const nextDate = new Date(baseDate);
          nextDate.setUTCDate(nextDate.getUTCDate() + (30 * i));
          newList.push({
            id_local: i + 1,
            identificador: "",
            vencimento: nextDate.toISOString().split("T")[0],
            valor: formattedValor
          });
        }
      } else if (qtdBoletos > 0 && qtdBoletos < prev.length) {
        newList.length = qtdBoletos;
      }
      return newList;
    });
  }, [qtdBoletos, editingId]);

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
      const conta = allContas.find((c: IContasPagar) => c.id_conta_pagar === id);

      if (!conta) {
        toast.error("Conta não encontrada.");
        onClose();
        return;
      }

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
        dt_emissao: conta.dt_emissao ? new Date(conta.dt_emissao).toISOString().split("T")[0] : "",
        dt_vencimento: new Date(conta.dt_vencimento).toISOString().split("T")[0],
        num_documento: conta.num_documento || "",
        status: conta.status,
        dt_pagamento: conta.dt_pagamento ? new Date(conta.dt_pagamento).toISOString().split("T")[0] : "",
        url_anexo: conta.url_anexo || "",
        obs: conta.obs || "",
        repetir_parcelas: 0,
        nf_numero: conta.nf_numero || "",
      });

      setQtdBoletos(1);
      setBoletos([{
        id_local: 1,
        identificador: conta.nf_boleto || "",
        vencimento: new Date(conta.dt_vencimento).toISOString().split("T")[0],
        valor: Number(conta.valor).toFixed(2)
      }]);
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
    });
    setQtdBoletos(1);
    setBoletos([{
      id_local: 1,
      identificador: "",
      vencimento: new Date().toISOString().split("T")[0],
      valor: ""
    }]);
    setRecurrenceInfo(null);
    setApplyToAllRecurrences(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const isMultiBoleto = !editingId && qtdBoletos > 1;

      // Handle simple edit or single creation
      if (editingId || (!editingId && qtdBoletos === 1)) {
        const b = boletos[0];
        const payload: any = {
          ...formData,
          descricao: formData.descricao.toUpperCase(),
          credor: formData.credor.toUpperCase(),
          valor: b ? Number(b.valor || formData.valor) : Number(formData.valor),
          applyToAllRecurrences,
          dt_pagamento: formData.status === "PAGO" 
            ? (formData.dt_pagamento ? new Date(formData.dt_pagamento).toISOString() : new Date().toISOString()) 
            : null,
          dt_vencimento: new Date(b?.vencimento || formData.dt_vencimento).toISOString(),
          dt_emissao: formData.dt_emissao ? new Date(formData.dt_emissao).toISOString() : null,
          nf_numero: formData.nf_numero ? formData.nf_numero.trim() : null,
          nf_boleto: b?.identificador ? b.identificador.trim() : null,
          nf_parcela: isMultiBoleto ? 1 : null,
          nf_total_parcelas: isMultiBoleto ? qtdBoletos : null,
        };

        if (editingId) {
          await FinanceiroService.updateContaPagar(editingId, payload);
          toast.success(applyToAllRecurrences ? "Série de contas atualizada com sucesso!" : "Conta atualizada com sucesso!");
        } else {
          await FinanceiroService.createContaPagar(payload);
          toast.success("Conta lançada com sucesso!");
        }
      } else {
        // Handle multi boleto creation
        const baseDescricao = formData.descricao.toUpperCase();
        for (let i = 0; i < boletos.length; i++) {
          const b = boletos[i];
          const payload: any = {
            ...formData,
            descricao: `${baseDescricao} - ${i + 1}/${boletos.length}`,
            credor: formData.credor.toUpperCase(),
            valor: Number(b.valor),
            applyToAllRecurrences: false,
            repetir_parcelas: 0,
            dt_pagamento: formData.status === "PAGO" 
              ? (formData.dt_pagamento ? new Date(formData.dt_pagamento).toISOString() : new Date().toISOString()) 
              : null,
            dt_vencimento: new Date(b.vencimento).toISOString(),
            dt_emissao: formData.dt_emissao ? new Date(formData.dt_emissao).toISOString() : null,
            nf_numero: formData.nf_numero ? formData.nf_numero.trim() : null,
            nf_boleto: b.identificador ? b.identificador.trim() : null,
            nf_parcela: i + 1,
            nf_total_parcelas: boletos.length,
          };
          await FinanceiroService.createContaPagar(payload);
        }
        toast.success(`${boletos.length} contas lançadas com sucesso!`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar conta(s).");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={editingId ? "Editar Conta" : "Nova Conta a Pagar"}
      onClose={onClose}
      className="max-w-3xl"
    >
      <form onSubmit={handleSave} className="space-y-6 pt-4">
        {/* 1. Valores e Parcelas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200 items-end">
          <Input
            label="Valor Total (R$)"
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            placeholder="0.00"
            required
            className="font-bold text-lg"
          />
          <Input
            label="Vencimento (1ª Parcela)"
            type="date"
            value={formData.dt_vencimento}
            onChange={(e) => setFormData({ ...formData, dt_vencimento: e.target.value })}
            required
          />
          {!editingId ? (
            <Input
              label="Quantidade de Parcelas"
              type="number"
              min={1}
              max={36}
              value={qtdBoletos}
              onChange={(e) => setQtdBoletos(Number(e.target.value) || 1)}
              placeholder="1"
              required
            />
          ) : (
            <Input
              label="Data de Emissão"
              type="date"
              value={formData.dt_emissao}
              onChange={(e) => setFormData({ ...formData, dt_emissao: e.target.value })}
            />
          )}
        </div>

        {/* 2. Descrição & Credor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <AutocompleteInput
              label="Descrição / Título"
              required
              value={formData.descricao}
              onChange={(val) => setFormData({ ...formData, descricao: val })}
              fetchSuggestions={(q) => FinanceiroService.buscarDescricao(q)}
              placeholder="Ex: COMPRA MATERIAL LIMPEZA"
            />
          </div>
          <div className="relative">
            <AutocompleteInput
              label="Credor"
              value={formData.credor}
              onChange={(val) => setFormData({ ...formData, credor: val })}
              fetchSuggestions={(q) => FinanceiroService.buscarCredor(q)}
              placeholder="Ex: FORNECEDOR X"
            />
          </div>
        </div>

        {/* 3. Categoria & Repetição */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12 lg:col-span-8">
            <CategorySelector
              categories={categories}
              value={formData.id_categoria}
              onChange={(id, nome) => {
                const cat = categories.find((c) => c.id_categoria === id);
                let fullCategoryName = nome;
                if (cat && cat.parentId) {
                  const parent = categories.find((c) => c.id_categoria === cat.parentId);
                  if (parent) fullCategoryName = `${parent.nome} - ${nome}`;
                }
                setFormData({ ...formData, id_categoria: id, categoria: fullCategoryName });
              }}
              type="AMBOS"
              required
            />
          </div>
          <div className="md:col-span-12 lg:col-span-4">
            <Input
              label="Repetir (Meses)"
              type="number"
              min={0}
              max={60}
              value={formData.repetir_parcelas}
              onChange={(e) => setFormData({ ...formData, repetir_parcelas: Number(e.target.value) })}
              placeholder="0"
              title="Cria cópias desta conta para os próximos meses"
              disabled={qtdBoletos > 1}
            />
          </div>
        </div>

        {/* 4. Status e Emissão (se não for edição) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!editingId && (
            <Input
              label="Data de Emissão"
              type="date"
              value={formData.dt_emissao}
              onChange={(e) => setFormData({ ...formData, dt_emissao: e.target.value })}
            />
          )}
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
          </Select>
          {formData.status === "PAGO" && (
            <Input
              label="Data de Pagamento"
              type="date"
              value={formData.dt_pagamento}
              onChange={(e) => setFormData({ ...formData, dt_pagamento: e.target.value })}
              required
            />
          )}
        </div>

        {/* 5. Documento & Anexos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número do Documento (Geral)"
            value={formData.num_documento}
            onChange={(e) => setFormData({ ...formData, num_documento: e.target.value })}
            placeholder="Documento Auxiliar"
          />
          <Input
            label="Arquivos / Anexos (URL)"
            icon={Upload}
            value={formData.url_anexo}
            onChange={(e) => setFormData({ ...formData, url_anexo: e.target.value })}
            placeholder="https://..."
          />
        </div>

        {/* 6. Vínculo de Nota Fiscal e Múltiplos Boletos */}
        <div className="bg-amber-50/30 border border-amber-100/70 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-2">
            <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">
              Vínculo de Nota Fiscal (Sincronização)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="relative">
              <AutocompleteInput
                label="Número da NF (Busca Paginada)"
                value={formData.nf_numero}
                onChange={(val) => setFormData({ ...formData, nf_numero: val })}
                fetchSuggestions={async (q) => {
                  const res = await FinanceiroService.getNfsPendentes({ search: q, limit: 15 });
                  return res.data.map((n: any) => n.nf_numero);
                }}
                placeholder="Ex: 000.123.456"
              />
            </div>
          </div>
        </div>

        {/* Boletos Dinâmicos (aparecem se qtd > 1) */}
        {qtdBoletos > 1 && (
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
                Detalhamento das Parcelas
              </span>
            </div>
            <div className="space-y-3">
              {boletos.map((b, idx) => (
                <div key={b.id_local} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <Input
                    label={`Bol/Ref ${idx + 1}`}
                    value={b.identificador}
                    onChange={(e) => {
                      const newArr = [...boletos];
                      newArr[idx].identificador = e.target.value;
                      setBoletos(newArr);
                    }}
                    placeholder={`Bol ${idx + 1}`}
                  />
                  <Input
                    label="Vencimento"
                    type="date"
                    value={b.vencimento}
                    onChange={(e) => {
                      const newArr = [...boletos];
                      newArr[idx].vencimento = e.target.value;
                      setBoletos(newArr);
                    }}
                    required
                  />
                  <Input
                    label="Valor (R$)"
                    type="number"
                    step="0.01"
                    value={b.valor}
                    onChange={(e) => {
                      const newArr = [...boletos];
                      newArr[idx].valor = e.target.value;
                      setBoletos(newArr);
                    }}
                    required
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Salvar {qtdBoletos > 1 ? "Contas" : "Conta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
