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
import { Truck, Users, Wallet, Activity } from "lucide-react";

import { LivroCaixaTab } from "../components/financeiro/LivroCaixaTab";
import { PagamentoPecasTab } from "../components/financeiro/PagamentoPecasTab";
import { PagamentoColaboradoresTab } from "../components/financeiro/PagamentoColaboradoresTab";
import { ContasGeraisTab } from "../components/financeiro/ContasGeraisTab";

export const FinanceiroPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Tabs: AUTO_PECAS, COLABORADORES, CONTAS_PAGAR (Geral), LIVRO_CAIXA
  const [activeTab, setActiveTab] = useState<FinanceiroTab>("LIVRO_CAIXA");
  const [statusMsg, setStatusMsg] = useState<IFinanceiroStatusMsg>({
    type: null,
    text: "",
  });
  const [, setLoading] = useState(false);

  // --- DATA STATES (Lifted for some, local for others?) ---
  // PagamentoPecasTab needs props
  const [payments, setPayments] = useState<IPagamentoPeca[]>([]);
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);

  // LivroCaixa needs entries
  const [cashBookEntries, setCashBookEntries] = useState<ICashBookEntry[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "AUTO_PECAS") setActiveTab("AUTO_PECAS");
    else if (tab === "COLABORADORES") setActiveTab("COLABORADORES");
    else if (tab === "CONTAS_PAGAR") setActiveTab("CONTAS_PAGAR");
    else setActiveTab("LIVRO_CAIXA"); // Default

    loadData();
  }, [location.search]);

  const loadData = async () => {
    try {
      setLoading(true);
      // We load some global data used by multiple tabs or for CashBook
      const [paymentsData, fornecedoresData, inflowsData] = await Promise.all([
        FinanceiroService.getPagamentosPeca(),
        FornecedorService.getAll(),
        FinanceiroService.getPagamentosCliente(),
        // Note: ContasGerais and Colaboradores load their own data internally or we could lift here.
        // For now, let's keep the pattern of lifting what was already lifted (Pecas/Fluxo).
      ]);

      setPayments(paymentsData);
      setFornecedores(fornecedoresData);

      // Process Cash Book
      // Note: We might want to include Colaboradores and ContasGerais in CashBook calculation in future.
      // For now preserving existing logic + potential new inclusions if requested.
      // The current calculateCashBookEntries only uses pecas and clientes.
      // If we want to include expense from ContasGerais, we would need to fetch them here and update util.
      // Leaving strict refactor for now.
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

  const TabButton = ({ id, label, icon: Icon, colorClass }: any) => (
    <button
      onClick={() => navigate(`/financeiro?tab=${id}`)}
      className={`group flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 ${
        activeTab === id
          ? `bg-white border-${colorClass || "neutral-900"} shadow-lg scale-105 z-10`
          : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200 text-neutral-400"
      }`}
    >
      <div
        className={`p-3 rounded-xl mb-2 transition-colors ${activeTab === id ? `bg-${colorClass || "neutral"}-50 text-${colorClass || "neutral"}-600` : "bg-neutral-100 text-neutral-400 group-hover:text-neutral-600"}`}
      >
        <Icon size={24} />
      </div>
      <span
        className={`text-xs font-black uppercase tracking-widest ${activeTab === id ? "text-neutral-800" : "text-neutral-400"}`}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
          <div className="p-3 bg-neutral-900 rounded-2xl text-white">
            <Activity size={28} />
          </div>
          Gestão Financeira
        </h1>
        <p className="text-neutral-500 text-lg ml-1">
          Controle de fluxo de caixa, pagamentos e despesas.
        </p>
      </div>

      {/* NAVIGATION GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TabButton
          id="LIVRO_CAIXA"
          label="Fluxo de Caixa"
          icon={Activity}
          colorClass="emerald"
        />
        <TabButton
          id="AUTO_PECAS"
          label="Peças / Fornecedores"
          icon={Truck}
          colorClass="blue"
        />
        <TabButton
          id="COLABORADORES"
          label="Equipe / Comissões"
          icon={Users}
          colorClass="violet"
        />
        <TabButton
          id="CONTAS_PAGAR"
          label="Despesas Gerais"
          icon={Wallet}
          colorClass="amber"
        />
      </div>

      <div className="min-h-[500px]">
        {activeTab === "LIVRO_CAIXA" && (
          <LivroCaixaTab entries={cashBookEntries} />
        )}

        {activeTab === "AUTO_PECAS" && (
          <PagamentoPecasTab
            payments={payments}
            fornecedores={fornecedores}
            onUpdate={loadData}
            setStatusMsg={setStatusMsg}
            setLoading={setLoading}
          />
        )}

        {activeTab === "COLABORADORES" && (
          <PagamentoColaboradoresTab
            onUpdate={loadData}
            setStatusMsg={setStatusMsg}
            setLoading={setLoading}
          />
        )}

        {activeTab === "CONTAS_PAGAR" && (
          <ContasGeraisTab onUpdate={loadData} />
        )}
      </div>
    </div>
  );
};
