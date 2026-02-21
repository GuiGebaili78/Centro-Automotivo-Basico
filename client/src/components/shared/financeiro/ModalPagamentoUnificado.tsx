import React, { useState, useEffect } from "react";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { formatCurrency } from "../../../utils/formatCurrency";
import { DollarSign, Calendar, Percent, Landmark, Save, X } from "lucide-react";

interface ModalPagamentoUnificadoProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    accountId: number;
    date: string;
    discountValue: number;
  }) => void;
  totalAmount: number;
  bankAccounts: any[];
  title?: string;
  showDiscount?: boolean;
  isLoading?: boolean;
}

export const ModalPagamentoUnificado: React.FC<
  ModalPagamentoUnificadoProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  bankAccounts,
  title = "Confirmar Pagamento",
  showDiscount = false,
  isLoading = false,
}) => {
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Discount States
  const [discountType, setDiscountType] = useState<"VALUE" | "PERCENT">(
    "VALUE",
  );
  const [discountInput, setDiscountInput] = useState("");
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [netAmount, setNetAmount] = useState(totalAmount);

  useEffect(() => {
    let disc = 0;
    const inputVal = Number(discountInput) || 0;

    if (discountType === "PERCENT") {
      disc = (totalAmount * inputVal) / 100;
    } else {
      disc = inputVal;
    }

    setFinalDiscount(disc);
    setNetAmount(totalAmount - disc);
  }, [discountInput, discountType, totalAmount]);

  const handleConfirm = () => {
    if (!accountId) return;
    onConfirm({
      accountId: Number(accountId),
      date,
      discountValue: showDiscount ? finalDiscount : 0,
    });
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-6 pt-4">
        {/* Account Selection */}
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">
            Conta Bancária de Origem
          </label>
          <div className="relative">
            <Landmark
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={18}
            />
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all text-neutral-600"
            >
              <option value="">Selecione a conta...</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id_conta} value={acc.id_conta}>
                  {acc.nome} - Saldo: {formatCurrency(Number(acc.saldo_atual))}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selection */}
        <Input
          label="Data do Pagamento"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          icon={Calendar}
          required
        />

        {/* Amount Summary */}
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Valor Bruto
            </p>
            <p className="text-xl font-bold text-neutral-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-neutral-300 shadow-sm">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Discount Section */}
        {showDiscount && (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Aplicar Desconto
              </label>
              <div className="flex bg-neutral-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDiscountType("VALUE")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    discountType === "VALUE"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  R$
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENT")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    discountType === "PERCENT"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder={discountType === "VALUE" ? "0.00" : "0"}
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                icon={discountType === "VALUE" ? DollarSign : Percent}
              />
              <div className="bg-orange-50 p-2 rounded-lg border border-orange-100 flex flex-col justify-center px-4">
                <p className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">
                  Desconto Final
                </p>
                <p className="text-sm font-black text-orange-600">
                  - {formatCurrency(finalDiscount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Net Amount - Focus */}
        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-between text-white animate-in zoom-in duration-300">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-blue-100">
              Valor Líquido Final
            </p>
            <p className="text-3xl font-black tracking-tighter">
              {formatCurrency(netAmount)}
            </p>
          </div>
          <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
            <Save size={24} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            icon={X}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            icon={Save}
            disabled={!accountId || isLoading}
          >
            {isLoading ? "Processando..." : "Confirmar Baixa"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
