import { useState, useEffect, type FormEvent } from "react";
import { FinanceiroService } from "../../../services/financeiro.service";
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Smartphone,
  Building2,
  Wifi,
  Calculator,
} from "lucide-react";
import type { IOperadoraCartao, ITaxaCartao } from "../../../types/backend";
import { Button, Input, Select } from "../../ui";

interface PagamentoClienteFormProps {
  osId: number;
  valorTotal: number;
  onSuccess: (payment: any) => void;
  onCancel: () => void;
}

// ----- Helpers de taxa -----
const getTaxaDaOperadora = (
  operadora: IOperadoraCartao | undefined,
  modalidade: string,
  parcela: number
): { base: number; juros: number; baseCliente: number | null } => {
  if (!operadora) return { base: 0, juros: 0, baseCliente: null };
  const taxas: ITaxaCartao[] = operadora.taxas_cartao || [];
  const entry = taxas.find(
    (t) => t.modalidade === modalidade && t.parcela === parcela
  );
  if (entry) {
    return {
      base: Number(entry.taxa_base_pct),
      juros: Number(entry.taxa_juros_pct),
      baseCliente: entry.taxa_base_cliente_pct != null ? Number(entry.taxa_base_cliente_pct) : null,
    };
  }
  // Fallback legado
  if (modalidade === "DEBITO" || modalidade === "PIX") {
    return { base: Number(operadora.taxa_debito ?? 0), juros: 0, baseCliente: null };
  }
  if (modalidade === "CREDITO_AVISTA") {
    return { base: Number(operadora.taxa_credito_vista ?? 0), juros: 0, baseCliente: null };
  }
  return {
    base: Number(operadora.taxa_credito_parc ?? 0),
    juros: 0,
    baseCliente: null,
  };
};

const calcPreview = (
  valorBruto: number,
  base: number,
  juros: number,
  tipoParcelamento: "LOJA" | "CLIENTE",
  baseCliente: number | null
) => {
  if (tipoParcelamento === "LOJA") {
    const taxa = base + juros;
    const desconto = (valorBruto * taxa) / 100;
    return {
      valorCliente: valorBruto,
      valorLiquido: valorBruto - desconto,
      desconto,
      taxaDisplay: taxa,
    };
  }
  // CLIENTE assume os juros
  const valorCliente = valorBruto + (valorBruto * juros) / 100;
  // Tarifa cobrada da loja = taxa_base_cliente_pct (ou fallback para base)
  const tarifaLojista = baseCliente != null && baseCliente > 0 ? baseCliente : base;
  const desconto = (valorCliente * tarifaLojista) / 100;
  return {
    valorCliente,
    valorLiquido: valorCliente - desconto,
    desconto,
    taxaDisplay: tarifaLojista,
  };
};

// -------------------------

export const PagamentoClienteForm = ({
  osId,
  valorTotal,
  initialData,
  onSuccess,
  onCancel,
}: PagamentoClienteFormProps & { initialData?: any }) => {
  const [loading, setLoading] = useState(false);
  const [metodo, setMetodo] = useState("CREDITO");
  const [valor, setValor] = useState(
    valorTotal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
  const [bandeira, setBandeira] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [tipoParcelamento, setTipoParcelamento] = useState<"LOJA" | "CLIENTE">("LOJA");
  const [codigoTransacao, setCodigoTransacao] = useState("");

  // PIX-specific
  const [pixDestino, setPixDestino] = useState<"BANCO" | "MAQUINA">("BANCO");

  // CREDITO-specific
  const [subtipoCredito, setSubtipoCredito] = useState<"AVISTA" | "PARCELADO">("AVISTA");

  const [operadoras, setOperadoras] = useState<IOperadoraCartao[]>([]);
  const [idOperadora, setIdOperadora] = useState(0);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [idContaBancaria, setIdContaBancaria] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setMetodo(initialData.metodo_pagamento || "CREDITO");
      setValor(
        Number(initialData.valor).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
      setBandeira(initialData.bandeira_cartao || "");
      setParcelas(String(initialData.qtd_parcelas || 1));
      setCodigoTransacao(initialData.codigo_transacao || "");
      setPixDestino(initialData.pix_destino || "BANCO");
      setSubtipoCredito(initialData.subtipo_credito || "AVISTA");
      if (initialData.id_operadora) setIdOperadora(Number(initialData.id_operadora));
      if (initialData.id_conta_bancaria) setIdContaBancaria(Number(initialData.id_conta_bancaria));
    }
  }, [initialData]);

  useEffect(() => {
    FinanceiroService.getOperadorasCartao()
      .then((data) => {
        setOperadoras(data);
        if (initialData?.id_operadora) {
          setIdOperadora(Number(initialData.id_operadora));
        } else if (data.length === 1) {
          setIdOperadora(data[0].id_operadora);
        }
      })
      .catch(() => console.error("Erro ao carregar operadoras"));

    FinanceiroService.getContasBancarias()
      .then((data) => {
        const ativas = data.filter((c: any) => c.ativo);
        setContasBancarias(ativas);
        if (ativas.length === 1) setIdContaBancaria(ativas[0].id_conta);
      })
      .catch(() => console.error("Erro ao carregar contas"));
  }, []);

  // Cálculo da modalidade de taxa para a prévia
  const operadoraSelecionada = operadoras.find((o) => o.id_operadora === idOperadora);
  const modalidadeTaxa =
    metodo === "PIX"
      ? "PIX"
      : metodo === "DEBITO"
      ? "DEBITO"
      : subtipoCredito === "AVISTA"
      ? "CREDITO_AVISTA"
      : "CREDITO";

  const parcelaTaxa = modalidadeTaxa === "CREDITO" ? Number(parcelas) : 1;
  const { base: taxaBase, juros: taxaJuros, baseCliente: taxaBaseCliente } = getTaxaDaOperadora(
    operadoraSelecionada,
    modalidadeTaxa,
    parcelaTaxa
  );

  const cleanValorNum = Number(valor.replace(/\./g, "").replace(",", "."));
  const showPreview =
    !isNaN(cleanValorNum) &&
    cleanValorNum > 0 &&
    (taxaBase > 0 || taxaJuros > 0) &&
    (metodo === "CREDITO" ||
      metodo === "DEBITO" ||
      (metodo === "PIX" && pixDestino === "MAQUINA"));

  const preview = showPreview
    ? calcPreview(cleanValorNum, taxaBase, taxaJuros, tipoParcelamento, taxaBaseCliente)
    : null;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isNaN(cleanValorNum) || cleanValorNum <= 0) {
        setError("Valor inválido.");
        return;
      }
      if (metodo === "PIX" && idContaBancaria === 0) {
        setError("Selecione a conta bancária de destino.");
        return;
      }
      if (
        (metodo === "CREDITO" ||
          metodo === "DEBITO" ||
          (metodo === "PIX" && pixDestino === "MAQUINA")) &&
        idOperadora === 0
      ) {
        setError("Selecione a operadora/maquininha.");
        return;
      }

      const payload: Record<string, any> = {
        id_os: osId,
        metodo_pagamento: metodo,
        valor: cleanValorNum,
        data_pagamento: initialData?.data_pagamento || new Date().toISOString(),
        bandeira_cartao: metodo === "CREDITO" || metodo === "DEBITO" ? bandeira : null,
        codigo_transacao: codigoTransacao || null,
        qtd_parcelas: metodo === "CREDITO" && subtipoCredito === "PARCELADO" ? Number(parcelas) : 1,
        tipo_parcelamento: metodo === "CREDITO" ? tipoParcelamento : "LOJA",
        // Novos campos de controle (backend processa a lógica)
        pix_destino: metodo === "PIX" ? pixDestino : null,
        subtipo_credito: metodo === "CREDITO" ? subtipoCredito : null,
        id_operadora:
          (metodo === "CREDITO" || metodo === "DEBITO" || (metodo === "PIX" && pixDestino === "MAQUINA")) &&
          idOperadora > 0
            ? Number(idOperadora)
            : null,
        id_conta_bancaria:
          metodo === "PIX" && idContaBancaria > 0 ? Number(idContaBancaria) : null,
      };

      let result;
      if (initialData?.id_pagamento_cliente) {
        result = await FinanceiroService.updatePagamentoCliente(
          initialData.id_pagamento_cliente,
          payload
        );
      } else {
        result = await FinanceiroService.createPagamentoCliente(payload);
      }

      onSuccess(result);
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar pagamento. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Banner */}
      <div className="bg-green-50 p-4 rounded-xl flex items-center gap-3 border border-green-100">
        <DollarSign className="text-green-600" />
        <div>
          <strong className="block text-green-900 text-sm">
            {initialData ? "Editar Pagamento" : "Registro de Pagamento"}
          </strong>
          <p className="text-xs text-green-700">Informe os detalhes do recebimento do cliente.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-200">
          {error}
        </div>
      )}

      {/* Valor */}
      <div>
        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-1">
          Valor do Pagamento
        </label>
        <div className="relative">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-600 pointer-events-none">
            R$
          </span>
          <Input
            type="text"
            value={valor}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              const num = Number(v) / 100;
              setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }}
            className="!bg-emerald-50/50 !border-emerald-100 !rounded-2xl !py-6 !pl-16 !pr-4 !text-4xl !font-bold !text-emerald-700 !outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 !transition-all placeholder:text-emerald-300/50"
          />
        </div>
      </div>

      {/* Método de Pagamento */}
      <div>
        <label className="text-xs font-bold text-neutral-600 uppercase mb-1 block">
          Forma de Pagamento
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["CREDITO", "DEBITO", "PIX", "DINHEIRO"].map((m) => (
            <Button
              key={m}
              type="button"
              onClick={() => setMetodo(m)}
              variant={metodo === m ? "secondary" : "ghost"}
              className={`!p-3 !h-auto rounded-xl border flex flex-col items-center gap-2 transition-all ${
                metodo === m
                  ? "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20"
                  : "bg-neutral-25 border-neutral-200 text-neutral-600 hover:bg-neutral-25"
              }`}
            >
              {m === "CREDITO" && <CreditCard size={20} />}
              {m === "DEBITO" && <CreditCard size={20} />}
              {m === "PIX" && <Smartphone size={20} />}
              {m === "DINHEIRO" && <DollarSign size={20} />}
              <span className="text-sm font-bold">{m}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* ─── PIX: Banco vs Máquina ─── */}
      {metodo === "PIX" && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">
            Destino do PIX
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPixDestino("BANCO")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                pixDestino === "BANCO"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-neutral-200 bg-neutral-25 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <Building2 size={20} className={pixDestino === "BANCO" ? "text-blue-600" : "text-neutral-400"} />
              <div>
                <p className="text-sm font-black">PIX Banco</p>
                <p className="text-[10px] opacity-70">Sem taxa · Diretamente na conta</p>
              </div>
              {pixDestino === "BANCO" && (
                <span className="ml-auto text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  PADRÃO
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPixDestino("MAQUINA")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                pixDestino === "MAQUINA"
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-neutral-200 bg-neutral-25 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <Wifi size={20} className={pixDestino === "MAQUINA" ? "text-violet-600" : "text-neutral-400"} />
              <div>
                <p className="text-sm font-black">PIX Máquina</p>
                <p className="text-[10px] opacity-70">Com taxa · QR Code da maquininha</p>
              </div>
            </button>
          </div>

          {/* Conta bancária (sempre para PIX) */}
          <Select
            label="Conta Bancária / Destino"
            value={idContaBancaria}
            onChange={(e) => setIdContaBancaria(Number(e.target.value))}
            className="font-bold text-neutral-600"
          >
            <option value={0}>Selecione a Conta...</option>
            {contasBancarias.map((conta) => (
              <option key={conta.id_conta} value={conta.id_conta}>
                {conta.nome} {conta.banco ? `- ${conta.banco}` : ""}
              </option>
            ))}
          </Select>

          {/* Operadora (apenas PIX Máquina) */}
          {pixDestino === "MAQUINA" && (
            <Select
              label="Maquininha / Operadora"
              value={idOperadora}
              onChange={(e) => setIdOperadora(Number(e.target.value))}
              className="font-bold"
            >
              <option value={0}>Selecione a Maquininha...</option>
              {operadoras.map((op) => (
                <option key={op.id_operadora} value={op.id_operadora}>
                  {op.nome}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      {/* ─── CRÉDITO: Subtipo + Parcelas ─── */}
      {metodo === "CREDITO" && (
        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">
            Tipo de Crédito
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSubtipoCredito("AVISTA")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                subtipoCredito === "AVISTA"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 bg-neutral-25 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <CheckCircle size={20} className={subtipoCredito === "AVISTA" ? "text-emerald-600" : "text-neutral-400"} />
              <div>
                <p className="text-sm font-black">Crédito à Vista</p>
                <p className="text-[10px] opacity-70">Recebimento antecipado · 1 parcela</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSubtipoCredito("PARCELADO")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                subtipoCredito === "PARCELADO"
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-neutral-200 bg-neutral-25 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <CreditCard size={20} className={subtipoCredito === "PARCELADO" ? "text-orange-600" : "text-neutral-400"} />
              <div>
                <p className="text-sm font-black">Crédito Parcelado</p>
                <p className="text-[10px] opacity-70">Com prazo · 1x a 18x</p>
              </div>
            </button>
          </div>

          {/* Parcelas (apenas parcelado) */}
          {subtipoCredito === "PARCELADO" && (
            <>
              <Select
                label="Parcelas"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className="font-bold text-neutral-600"
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {p}x
                  </option>
                ))}
              </Select>

              {/* Quem assume os juros */}
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
                  Juros / Taxas Assumidas Por:
                </label>
                <div className="flex bg-neutral-100 p-1 rounded-xl">
                  {(["LOJA", "CLIENTE"] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={tipoParcelamento === t ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setTipoParcelamento(t)}
                      className={`flex-1 !py-1.5 !rounded-lg text-xs font-bold transition-all ${
                        tipoParcelamento === t
                          ? "!bg-white shadow !text-neutral-800"
                          : "!text-neutral-500 hover:!text-neutral-700"
                      }`}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Bandeira e Operadora */}
          <Select
            label="Bandeira"
            value={bandeira}
            onChange={(e) => setBandeira(e.target.value)}
            className="font-bold"
          >
            <option value="">Selecione...</option>
            <option value="VISA">Visa</option>
            <option value="MASTER">Mastercard</option>
            <option value="ELO">Elo</option>
            <option value="AMEX">Amex</option>
            <option value="HIPER">Hipercard</option>
          </Select>

          <Select
            label="Maquininha / Operadora"
            value={idOperadora}
            onChange={(e) => setIdOperadora(Number(e.target.value))}
            className={`font-bold ${idOperadora ? "text-neutral-600" : "text-neutral-400"}`}
          >
            <option value={0}>Selecione a Maquininha...</option>
            {operadoras.map((op) => (
              <option key={op.id_operadora} value={op.id_operadora}>
                {op.nome}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* ─── DÉBITO: Bandeira + Operadora ─── */}
      {metodo === "DEBITO" && (
        <div className="space-y-3">
          <Select
            label="Bandeira"
            value={bandeira}
            onChange={(e) => setBandeira(e.target.value)}
            className="font-bold"
          >
            <option value="">Selecione...</option>
            <option value="VISA">Visa</option>
            <option value="MASTER">Mastercard</option>
            <option value="ELO">Elo</option>
          </Select>
          <Select
            label="Maquininha / Operadora"
            value={idOperadora}
            onChange={(e) => setIdOperadora(Number(e.target.value))}
            className="font-bold"
          >
            <option value={0}>Selecione a Maquininha...</option>
            {operadoras.map((op) => (
              <option key={op.id_operadora} value={op.id_operadora}>
                {op.nome}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Código de Transação */}
      <div>
        <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
          {metodo === "PIX" ? "ID da Transação (Pix)" : "Código de Autorização / NSU"}
        </label>
        <Input
          value={codigoTransacao}
          onChange={(e) => setCodigoTransacao(e.target.value)}
          placeholder="Opcional"
          className="font-mono text-sm border-neutral-200 focus:border-green-500"
        />
      </div>

      {/* ─── Prévia de Cálculo (display only) ─── */}
      {preview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
            <Calculator size={12} /> Prévia Estimada (cálculo real no servidor)
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-neutral-500 uppercase font-bold">Valor Cliente</p>
              <p className="text-sm font-black text-neutral-800">R$ {fmt(preview.valorCliente)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 uppercase font-bold">
                Taxa ({preview.taxaDisplay.toFixed(2)}%)
                {tipoParcelamento === 'CLIENTE' && taxaBaseCliente && taxaBaseCliente > 0 && (
                  <span className="ml-1 text-blue-500">[Tarifa Cliente]</span>
                )}
              </p>
              <p className="text-sm font-black text-red-600">- R$ {fmt(preview.desconto)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 uppercase font-bold">Líquido Loja</p>
              <p className="text-sm font-black text-emerald-700">R$ {fmt(preview.valorLiquido)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3 pt-4 border-t border-neutral-200">
        <Button type="button" onClick={onCancel} variant="secondary" className="flex-1">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            loading ||
            (metodo === "PIX" && idContaBancaria === 0) ||
            (metodo === "DEBITO" && idOperadora === 0) ||
            (metodo === "CREDITO" && idOperadora === 0) ||
            ((metodo === "PIX" && pixDestino === "MAQUINA") && idOperadora === 0)
          }
          variant="success"
          className="flex-1 shadow-green-200 shadow-xl"
          isLoading={loading}
          icon={CheckCircle}
        >
          {initialData ? "Salvar Alterações" : "Confirmar Pagamento"}
        </Button>
      </div>
    </form>
  );
};
