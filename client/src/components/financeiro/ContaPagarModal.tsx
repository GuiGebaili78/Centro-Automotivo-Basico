import React, { useState, useEffect } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import {
  Modal,
  Button,
  Input,
  AutocompleteInput,
  Checkbox,
  Select,
} from "../ui";
import { useAlerts } from "../../contexts/AlertsContext";
import { CategorySelector } from "./CategorySelector";
import { FornecedorForm } from "../fornecedores/Forms/FornecedorForm";
import { toast } from "react-toastify";
import { FornecedorService } from "../../services/fornecedor.service";
import { Upload, Plus } from "lucide-react";
import type { IContasPagar, IRecurrenceInfo } from "../../types/backend";
import type { IFornecedor } from "../../types/backend";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

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
  const { getSyncedDate } = useAlerts();

  const formatDateToYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  /** Extrai YYYY-MM-DD de uma string ISO ou data qualquer, sem instanciar Date (evita timezone shift) */
  const extractDateStr = (raw: string | null | undefined): string => {
    if (!raw) return "";
    // Se já estiver em YYYY-MM-DD puro, retorna direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // Se vier com "T" (ISO), pega antes do T
    if (raw.includes("T")) return raw.split("T")[0];
    return raw;
  };

  const todaySyncedStr = formatDateToYYYYMMDD(getSyncedDate());

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [recurrenceInfo, setRecurrenceInfo] = useState<IRecurrenceInfo | null>(
    null,
  );
  const [applyToAllRecurrences, setApplyToAllRecurrences] = useState(false);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);

  const [tipoCredor, setTipoCredor] = useState<"FORNECEDOR" | "CREDOR_AVULSO">(
    "FORNECEDOR",
  );

  const [formData, setFormData] = useState({
    descricao: "",
    credor: "",
    categoria: "OUTROS",
    id_categoria: undefined as number | undefined,
    valor: "",
    dt_emissao: todaySyncedStr,
    dt_vencimento: todaySyncedStr,
    num_documento: "",
    status: "PENDENTE",
    dt_pagamento: "",
    url_anexo: "",
    obs: "",
    repetir_parcelas: 0,
    nf_numero: "",
    id_fornecedor: undefined as number | undefined,
  });

  const [qtdBoletos, setQtdBoletos] = useState<number>(1);
  const [boletos, setBoletos] = useState<BoletoLinha[]>([
    {
      id_local: 1,
      identificador: "",
      vencimento: todaySyncedStr,
      valor: "",
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadFornecedores();
      if (editingId) {
        loadContaToEdit(editingId);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingId]);

  const loadFornecedores = async () => {
    try {
      const data = await FornecedorService.getAll();
      setFornecedores(data);
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Sync: quando dt_vencimento muda, atualiza boletos[0].vencimento ───
  useEffect(() => {
    if (editingId) return;
    setBoletos((prev) => {
      if (prev.length === 0) return prev;
      if (prev[0].vencimento === formData.dt_vencimento) return prev;
      const newList = [...prev];
      newList[0] = { ...newList[0], vencimento: formData.dt_vencimento };
      return newList;
    });
  }, [formData.dt_vencimento, editingId]);

  // Sync logic for Qtd Boletos
  useEffect(() => {
    if (editingId) return; // Don't auto-generate lines when editing

    setBoletos((prev) => {
      const newList = [...prev];
      if (qtdBoletos > prev.length) {
        const baseVencStr =
          prev[0]?.vencimento || formData.dt_vencimento || todaySyncedStr;

        // Let's divide value by qtd if possible, or just leave blank
        const baseValor = Number(formData.valor) / qtdBoletos;
        const formattedValor = baseValor ? baseValor.toFixed(2) : "";

        for (let i = prev.length; i < qtdBoletos; i++) {
          // Calcula próxima data adicionando 30*i dias à data base, usando UTC para evitar shift
          const baseParts = baseVencStr.split("-").map(Number);
          const nextDate = new Date(
            Date.UTC(baseParts[0], baseParts[1] - 1, baseParts[2]),
          );
          nextDate.setUTCDate(nextDate.getUTCDate() + 30 * i);
          const nextStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;
          newList.push({
            id_local: i + 1,
            identificador: "",
            vencimento: nextStr,
            valor: formattedValor,
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
      const conta = allContas.find(
        (c: IContasPagar) => c.id_conta_pagar === id,
      );

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

      setTipoCredor(conta.id_fornecedor ? "FORNECEDOR" : "CREDOR_AVULSO");
      setFormData({
        descricao: conta.descricao,
        credor: conta.credor || "",
        categoria: conta.categoria || "OUTROS",
        id_categoria: conta.id_categoria || undefined,
        valor: Number(conta.valor).toFixed(2),
        dt_emissao: extractDateStr(conta.dt_emissao),
        dt_vencimento: extractDateStr(conta.dt_vencimento),
        num_documento: conta.num_documento || "",
        status: conta.status,
        dt_pagamento: extractDateStr(conta.dt_pagamento),
        url_anexo: conta.url_anexo || "",
        obs: conta.obs || "",
        repetir_parcelas: 0,
        nf_numero: conta.nf_numero || "",
        id_fornecedor: conta.id_fornecedor || undefined,
      });

      setQtdBoletos(1);
      setBoletos([
        {
          id_local: 1,
          identificador: conta.nf_boleto || "",
          vencimento: extractDateStr(conta.dt_vencimento),
          valor: Number(conta.valor).toFixed(2),
        },
      ]);
      setApplyToAllRecurrences(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar detalhes da conta.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const todayStr = formatDateToYYYYMMDD(getSyncedDate());
    setTipoCredor("FORNECEDOR");
    setFormData({
      descricao: "",
      credor: "",
      categoria: "OUTROS",
      id_categoria: undefined,
      valor: "",
      dt_emissao: todayStr,
      dt_vencimento: todayStr,
      num_documento: "",
      status: "PENDENTE",
      dt_pagamento: "",
      url_anexo: "",
      obs: "",
      repetir_parcelas: 0,
      nf_numero: "",
      id_fornecedor: undefined,
    });
    setQtdBoletos(1);
    setBoletos([
      {
        id_local: 1,
        identificador: "",
        vencimento: todayStr,
        valor: "",
      },
    ]);
    setRecurrenceInfo(null);
    setApplyToAllRecurrences(false);
  };

  /**
   * Mantemos as datas em YYYY-MM-DD para evitar shift de timezone no backend
   */
  const formatDateForPayload = (dateStr: string): string => {
    return dateStr;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tipoCredor === "FORNECEDOR" && !formData.id_fornecedor) {
      toast.error("Selecione um fornecedor ou mude para Credor Avulso");
      return;
    }

    try {
      setLoading(true);

      const isMultiBoleto = !editingId && qtdBoletos > 1;

      // Handle simple edit or single creation
      if (editingId || (!editingId && qtdBoletos === 1)) {
        const b = boletos[0];
        const vencStr = editingId
          ? formData.dt_vencimento
          : b?.vencimento || formData.dt_vencimento;
        const payload: any = {
          ...formData,
          descricao: formData.descricao.toUpperCase(),
          credor: formData.credor.toUpperCase(),
          valor: b ? Number(b.valor || formData.valor) : Number(formData.valor),
          applyToAllRecurrences,
          dt_pagamento:
            formData.status === "PAGO"
              ? formData.dt_pagamento
                ? formatDateForPayload(formData.dt_pagamento)
                : dayjs(getSyncedDate()).tz("America/Sao_Paulo").format("YYYY-MM-DD")
              : null,
          dt_vencimento: formatDateForPayload(vencStr),
          dt_emissao: formData.dt_emissao
            ? formatDateForPayload(formData.dt_emissao)
            : null,
          nf_numero: formData.nf_numero ? formData.nf_numero.trim() : null,
          nf_boleto: b?.identificador ? b.identificador.trim() : null,
          nf_parcela: isMultiBoleto ? 1 : null,
          nf_total_parcelas: isMultiBoleto ? qtdBoletos : null,
          id_fornecedor:
            tipoCredor === "FORNECEDOR" && formData.id_fornecedor
              ? Number(formData.id_fornecedor)
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
            dt_pagamento:
              formData.status === "PAGO"
                ? formData.dt_pagamento
                  ? formatDateForPayload(formData.dt_pagamento)
                  : dayjs(getSyncedDate()).tz("America/Sao_Paulo").format("YYYY-MM-DD")
                : null,
            dt_vencimento: formatDateForPayload(b.vencimento),
            dt_emissao: formData.dt_emissao
              ? formatDateForPayload(formData.dt_emissao)
              : null,
            nf_numero: formData.nf_numero ? formData.nf_numero.trim() : null,
            nf_boleto: b.identificador ? b.identificador.trim() : null,
            nf_parcela: i + 1,
            nf_total_parcelas: boletos.length,
            id_fornecedor:
              tipoCredor === "FORNECEDOR" && formData.id_fornecedor
                ? Number(formData.id_fornecedor)
                : null,
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

  /** Callback quando o FornecedorForm salva com sucesso */
  const handleFornecedorSuccess = (data?: IFornecedor) => {
    setShowFornecedorModal(false);
    if (data) {
      const nome = (data.nome_fantasia || data.nome || "").toUpperCase();
      if (nome && data.id_fornecedor) {
        setFornecedores((prev) => [...prev, data]);
        setTipoCredor("FORNECEDOR");
        setFormData((prev) => ({
          ...prev,
          credor: nome,
          id_fornecedor: data.id_fornecedor,
        }));
        toast.success(`Fornecedor "${nome}" cadastrado e selecionado!`);
      }
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
            onChange={(e) =>
              setFormData({ ...formData, valor: e.target.value })
            }
            placeholder="0.00"
            required
            className="font-bold text-lg"
          />
          <Input
            label="Vencimento (1ª Parcela)"
            type="date"
            value={formData.dt_vencimento || ""}
            onChange={(e) =>
              setFormData({ ...formData, dt_vencimento: e.target.value })
            }
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
              value={formData.dt_emissao || ""}
              onChange={(e) =>
                setFormData({ ...formData, dt_emissao: e.target.value })
              }
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
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              fetchSuggestions={(q) => FinanceiroService.buscarDescricao(q)}
              placeholder="Ex: COMPRA MATERIAL LIMPEZA"
            />
          </div>
          <div className="relative border border-neutral-100 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => {
                  setTipoCredor("FORNECEDOR");
                  setFormData((prev) => ({ ...prev, credor: "" }));
                }}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                  tipoCredor === "FORNECEDOR"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                Fornecedor Cadastrado
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoCredor("CREDOR_AVULSO");
                  setFormData((prev) => ({
                    ...prev,
                    id_fornecedor: undefined,
                  }));
                }}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                  tipoCredor === "CREDOR_AVULSO"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                Credor Avulso
              </button>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                {tipoCredor === "FORNECEDOR" ? (
                  <Select
                    label="Fornecedor"
                    value={
                      formData.id_fornecedor
                        ? String(formData.id_fornecedor)
                        : ""
                    }
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const f = fornecedores.find(
                        (x) => x.id_fornecedor === id,
                      );
                      setFormData({
                        ...formData,
                        id_fornecedor: id,
                        credor: f
                          ? (f.nome_fantasia || f.nome).toUpperCase()
                          : "",
                      });
                    }}
                    required
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id_fornecedor} value={f.id_fornecedor}>
                        {(f.nome_fantasia || f.nome).toUpperCase()}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <AutocompleteInput
                    label="Credor Avulso"
                    value={formData.credor}
                    onChange={(e) =>
                      setFormData({ ...formData, credor: e.target.value })
                    }
                    fetchSuggestions={(q) => FinanceiroService.buscarCredor(q)}
                    placeholder="Ex: FORNECEDOR X"
                    required
                  />
                )}
              </div>
              {tipoCredor === "FORNECEDOR" && (
                <button
                  type="button"
                  onClick={() => setShowFornecedorModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 mb-[1px] bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-all text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm"
                  title="Cadastrar novo fornecedor"
                >
                  <Plus size={14} />
                  Novo
                </button>
              )}
            </div>
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
                  const parent = categories.find(
                    (c) => c.id_categoria === cat.parentId,
                  );
                  if (parent) fullCategoryName = `${parent.nome} - ${nome}`;
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
          <div className="md:col-span-12 lg:col-span-4">
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
              value={formData.dt_emissao || ""}
              onChange={(e) =>
                setFormData({ ...formData, dt_emissao: e.target.value })
              }
            />
          )}
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setFormData((prev) => ({
                ...prev,
                status: newStatus,
                // Auto-preenche dt_pagamento com hoje se mudar para PAGO e estiver vazio
                dt_pagamento:
                  newStatus === "PAGO" && !prev.dt_pagamento
                    ? todaySyncedStr
                    : prev.dt_pagamento,
              }));
            }}
          >
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
          </Select>
          {formData.status === "PAGO" && (
            <Input
              label="Data de Pagamento"
              type="date"
              value={formData.dt_pagamento || ""}
              onChange={(e) =>
                setFormData({ ...formData, dt_pagamento: e.target.value })
              }
              required
            />
          )}
        </div>

        {/* 5. Documento & Anexos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número do Documento (Geral)"
            value={formData.num_documento}
            onChange={(e) =>
              setFormData({ ...formData, num_documento: e.target.value })
            }
            placeholder="Documento Auxiliar"
          />
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
                onChange={(e) => setFormData({ ...formData, nf_numero: e.target.value })}
                fetchSuggestions={async (q) => {
                  const res = await FinanceiroService.getNfsPendentes({
                    search: q,
                    limit: 15,
                  });
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
                <div
                  key={b.id_local}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl"
                >
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
                    value={b.vencimento || ""}
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Salvar {qtdBoletos > 1 ? "Contas" : "Conta"}
          </Button>
        </div>
      </form>

      {/* Modal de Cadastro de Fornecedor */}
      {showFornecedorModal && (
        <Modal
          title="Novo Fornecedor"
          onClose={() => setShowFornecedorModal(false)}
          className="max-w-4xl"
          zIndex={60}
        >
          <FornecedorForm
            isModal={true}
            onSuccess={handleFornecedorSuccess}
            onCancel={() => setShowFornecedorModal(false)}
          />
        </Modal>
      )}
    </Modal>
  );
};
