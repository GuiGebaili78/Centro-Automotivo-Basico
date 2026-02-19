import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FinanceiroService } from "../services/financeiro.service";
import { FornecedorService } from "../services/fornecedor.service";
import type { IPagamentoPeca, IFornecedor } from "../types/backend";
import type {
  FinanceiroTab,
  IFinanceiroStatusMsg,
  ICashBookEntry,
} from "../types/financeiro.types";
import { calculateCashBookEntries } from "../utils/financeiroUtils";

import { StatusBanner } from "../components/ui/StatusBanner";
import { Wallet } from "lucide-react";

import { LivroCaixaTab } from "../components/financeiro/LivroCaixaTab";
import { ContasPagarTab } from "../components/financeiro/ContasPagarTab";

export const FinanceiroPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FinanceiroTab>("LIVRO_CAIXA");
  const [statusMsg, setStatusMsg] = useState<IFinanceiroStatusMsg>({
    type: null,
    text: "",
  });
  const [, setLoading] = useState(false);

  // --- DATA STATES ---
  const [payments, setPayments] = useState<IPagamentoPeca[]>([]);
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);
  const [cashBookEntries, setCashBookEntries] = useState<ICashBookEntry[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "AUTO_PECAS") setActiveTab("AUTO_PECAS");
    else if (tab === "LIVRO_CAIXA") setActiveTab("LIVRO_CAIXA");
    else if (tab === "CONTAS_PAGAR") setActiveTab("CONTAS_PAGAR");

    loadData();
  }, [location.search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, fornecedoresData, inflowsData] = await Promise.all([
        FinanceiroService.getPagamentosPeca(),
        FornecedorService.getAll(),
        FinanceiroService.getPagamentosCliente(),
      ]);

      setPayments(paymentsData);
      setFornecedores(fornecedoresData);

      // Process Cash Book using Utility
      const combined = calculateCashBookEntries(paymentsData, inflowsData);
      setCashBookEntries(combined);
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: "Erro ao carregar dados financeiros.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Financeiro
          </h1>
          <p className="text-neutral-500">
            Controle de caixa, contas a pagar e receber.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-neutral-200 overflow-x-auto">
        <button
          onClick={() => navigate("/financeiro?tab=AUTO_PECAS")}
          className={`pb-4 px-2 font-black text-sm uppercase tracking-widest transition-colors relative whitespace-nowrap ${
            activeTab === "AUTO_PECAS"
              ? "text-neutral-900"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Pagamento de Auto Peças
          {activeTab === "AUTO_PECAS" && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-neutral-900 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => navigate("/financeiro?tab=CONTAS_PAGAR")}
          className={`pb-4 px-2 font-black text-sm uppercase tracking-widest transition-colors relative whitespace-nowrap ${
            activeTab === "CONTAS_PAGAR"
              ? "text-neutral-900"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Contas a Pagar (Geral)
          {activeTab === "CONTAS_PAGAR" && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => navigate("/financeiro?tab=LIVRO_CAIXA")}
          className={`pb-4 px-2 font-black text-sm uppercase tracking-widest transition-colors relative whitespace-nowrap ${
            activeTab === "LIVRO_CAIXA"
              ? "text-neutral-900"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Movimentação de Caixa (Fluxo)
          {activeTab === "LIVRO_CAIXA" && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-success-500 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === "AUTO_PECAS" && (
        <ContasPagarTab
          payments={payments}
          fornecedores={fornecedores}
          onUpdate={loadData}
          setStatusMsg={setStatusMsg}
          setLoading={setLoading}
        />
      )}

      {activeTab === "CONTAS_PAGAR" && (
        <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <Wallet size={32} />
          </div>
          <h2 className="text-xl font-black text-neutral-800 mb-2">
            Contas a Pagar (Geral) em Construção
          </h2>
          <p className="text-neutral-500 max-w-md mx-auto">
            Aqui você poderá gerenciar contas de luz, água, aluguel, internet e
            outras despesas fixas ou variáveis da oficina.
          </p>
          <button className="mt-6 px-6 py-3 bg-neutral-900 text-white font-bold rounded-xl shadow-lg opacity-50 cursor-not-allowed">
            Nova Conta a Pagar (Em Breve)
          </button>
        </div>
      )}

      {activeTab === "LIVRO_CAIXA" && (
        <LivroCaixaTab entries={cashBookEntries} />
      )}
    </div>
  );
};
