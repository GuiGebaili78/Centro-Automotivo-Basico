import { useState, useEffect, type FormEvent } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { CreditCard, DollarSign, CheckCircle, Smartphone } from "lucide-react";
import type { IOperadoraCartao } from "../../types/backend";

import { Button, Input, Select } from "../ui";

interface PagamentoClienteFormProps {
  osId: number;
  valorTotal: number;
  onSuccess: (payment: any) => void;
  onCancel: () => void;
}

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
    }),
  );
  const [bandeira, setBandeira] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [codigoTransacao, setCodigoTransacao] = useState("");
  const [tipoParcelamento, setTipoParcelamento] = useState("LOJA");

  useEffect(() => {
    if (initialData) {
      setMetodo(initialData.metodo_pagamento || "CREDITO");
      setValor(
        Number(initialData.valor).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
      setBandeira(initialData.bandeira_cartao || "");
      setParcelas(String(initialData.qtd_parcelas || 1));
      setCodigoTransacao(initialData.codigo_transacao || "");

      // FIX: Inicializar IDs corretamente para edição
      if (initialData.id_operadora)
        setIdOperadora(Number(initialData.id_operadora));
      if (initialData.id_conta_bancaria)
        setIdContaBancaria(Number(initialData.id_conta_bancaria));
    }
  }, [initialData]);

  const [operadoras, setOperadoras] = useState<IOperadoraCartao[]>([]);
  const [idOperadora, setIdOperadora] = useState(0);

  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [idContaBancaria, setIdContaBancaria] = useState(0);

  const [error, setError] = useState("");

  useEffect(() => {
    loadOperadoras();
    loadContasBancarias();
  }, []);

  const loadOperadoras = async () => {
    try {
      const data = await FinanceiroService.getOperadorasCartao();
      setOperadoras(data);

      // Priority: 1. Initial Data (Edit), 2. Single Operator Auto-Select
      if (initialData?.id_operadora) {
        setIdOperadora(Number(initialData.id_operadora));
      } else if (data.length === 1) {
        setIdOperadora(data[0].id_operadora);
      }
    } catch (error) {
      console.error("Erro ao carregar operadoras");
    }
  };

  const loadContasBancarias = async () => {
    try {
      const data = await FinanceiroService.getContasBancarias();
      setContasBancarias(data.filter((c: any) => c.ativo));
      // Se houver apenas uma conta, seleciona automaticamente
      if (data.length === 1) {
        setIdContaBancaria(data[0].id_conta);
      }
    } catch (error) {
      console.error("Erro ao carregar contas bancárias");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanValor = valor.replace(/\./g, "").replace(",", ".");
      if (isNaN(Number(cleanValor)) || Number(cleanValor) <= 0) {
        setError("Valor inválido.");
        setLoading(false);
        return;
      }

      if (metodo === "PIX" && idContaBancaria === 0) {
        setError("Selecione a conta bancária de destino.");
        setLoading(false);
        return;
      }

      if ((metodo === "CREDITO" || metodo === "DEBITO") && idOperadora === 0) {
        setError("Selecione a operadora/maquininha.");
        setLoading(false);
        return;
      }

      const payload = {
        id_os: osId,
        metodo_pagamento: metodo,
        valor: Number(cleanValor),
        data_pagamento: initialData?.data_pagamento || new Date().toISOString(),
        bandeira_cartao:
          metodo === "CREDITO" || metodo === "DEBITO" ? bandeira : null,
        codigo_transacao: codigoTransacao || null,
        qtd_parcelas: metodo === "CREDITO" ? Number(parcelas) : 1,
        id_operadora:
          (metodo === "CREDITO" || metodo === "DEBITO") && idOperadora > 0
            ? Number(idOperadora)
            : null,
        id_conta_bancaria:
          metodo === "PIX" && idContaBancaria > 0
            ? Number(idContaBancaria)
            : null,
        tipo_parcelamento: metodo === "CREDITO" ? tipoParcelamento : "LOJA",
      };

      let result;
      if (initialData?.id_pagamento_cliente) {
        result = await FinanceiroService.updatePagamentoCliente(
          initialData.id_pagamento_cliente,
          payload,
        );
      } else {
        result = await FinanceiroService.createPagamentoCliente(payload);
      }

      onSuccess(result);
    } catch (error) {
      console.error(error);
      setError("Erro ao salvar pagamento. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-green-50 p-4 rounded-xl flex items-center gap-3 border border-green-100">
        <DollarSign className="text-green-600" />
        <div>
          <strong className="block text-green-900 text-sm">
            {initialData ? "Editar Pagamento" : "Registro de Pagamento"}
          </strong>
          <p className="text-xs text-green-700">
            Informe os detalhes do recebimento do cliente.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-[0.75rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">
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
                let v = e.target.value.replace(/\D/g, "");
                const val = Number(v) / 100;
                setValor(
                  val.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                );
              }}
              className="!bg-emerald-50/50 !border-emerald-100 !rounded-2xl !py-6 !pl-16 !pr-4 !text-4xl !font-bold !text-emerald-700 !outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 !transition-all placeholder:text-emerald-300/50"
            />
          </div>
        </div>

        <div className="md:col-span-2">
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
                className={`!p-3 !h-auto rounded-xl border flex flex-col items-center gap-2 transition-all ${metodo === m ? "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20" : "bg-neutral-25 border-neutral-200 text-neutral-600 hover:bg-neutral-25"}`}
              >
                {m === "CREDITO" && <CreditCard size={20} />}
                {m === "DEBITO" && <CreditCard size={20} />}
                {m === "PIX" && <Smartphone size={20} />}
                {m === "DINHEIRO" && <DollarSign size={20} />}
                <span className="text-[10px] font-bold">{m}</span>
              </Button>
            ))}
          </div>
        </div>

        {(metodo === "CREDITO" || metodo === "DEBITO") && (
          <>
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

            {metodo === "CREDITO" && (
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
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
                    Juros / Taxas Assumidas Por:
                  </label>
                  <div className="flex bg-neutral-100 p-1 rounded-xl">
                    <Button
                      type="button"
                      variant={
                        tipoParcelamento === "LOJA" ? "secondary" : "ghost"
                      }
                      size="sm"
                      onClick={() => setTipoParcelamento("LOJA")}
                      className={`flex-1 !py-1.5 !rounded-lg text-xs font-bold transition-all ${tipoParcelamento === "LOJA" ? "!bg-white shadow !text-neutral-800" : "!text-neutral-500 hover:!text-neutral-700"}`}
                    >
                      Loja
                    </Button>
                    <Button
                      type="button"
                      variant={
                        tipoParcelamento === "CLIENTE" ? "secondary" : "ghost"
                      }
                      size="sm"
                      onClick={() => setTipoParcelamento("CLIENTE")}
                      className={`flex-1 !py-1.5 !rounded-lg text-xs font-bold transition-all ${tipoParcelamento === "CLIENTE" ? "!bg-white shadow !text-neutral-800" : "!text-neutral-500 hover:!text-neutral-700"}`}
                    >
                      Cliente
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="md:col-span-2">
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
              <p className="text-[10px] text-neutral-400 mt-1">
                Necessário para cálculo de taxas e recebíveis.
              </p>
            </div>
          </>
        )}

        {metodo === "PIX" && (
          <div className="md:col-span-2">
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
            <p className="text-[10px] text-neutral-400 mt-1">
              Conta onde o valor será depositado.
            </p>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-neutral-500 uppercase mb-1 block">
            {metodo === "PIX"
              ? "ID da Transação (Pix)"
              : "Código de Autorização / NSU"}
          </label>
          <Input
            value={codigoTransacao}
            onChange={(e) => setCodigoTransacao(e.target.value)}
            placeholder="Opcional"
            className="font-mono text-sm border-neutral-200 focus:border-green-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-neutral-200">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            loading ||
            (metodo === "PIX" && idContaBancaria === 0) ||
            (metodo !== "PIX" && metodo !== "DINHEIRO" && idOperadora === 0)
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
