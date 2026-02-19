import { useState } from "react";
import { MovimentacoesTab } from "../components/shared/financeiro/MovimentacoesTab";
import { ContasTab } from "../components/shared/financeiro/ContasTab";
import { OperadorasTab } from "../components/shared/financeiro/OperadorasTab";
import { RecebiveisTab } from "../components/shared/financeiro/RecebiveisTab";
import { PageLayout } from "../components/ui/PageLayout";

export const LivroCaixaPage = () => {
  const [activeTab, setActiveTab] = useState<
    "MOVIMENTACOES" | "CONTAS" | "OPERADORAS" | "RECEBIVEIS"
  >("MOVIMENTACOES");

  return (
    <PageLayout
      title="Gestão Financeira"
      subtitle="Controle consolidado de caixa, bancos e recebíveis."
    >
      {/* TAB NAVIGATION */}
      <div className="flex bg-neutral-50 p-1 rounded-lg border border-neutral-100 gap-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab("MOVIMENTACOES")}
          className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "MOVIMENTACOES"
              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          Movimentações
        </button>
        <button
          onClick={() => setActiveTab("CONTAS")}
          className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "CONTAS"
              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          Contas Bancárias
        </button>
        <button
          onClick={() => setActiveTab("OPERADORAS")}
          className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "OPERADORAS"
              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          Operadoras
        </button>
        <button
          onClick={() => setActiveTab("RECEBIVEIS")}
          className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "RECEBIVEIS"
              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          Recebíveis
        </button>
      </div>

      {/* CONTENT AREA */}
      <div>
        {activeTab === "MOVIMENTACOES" && <MovimentacoesTab />}
        {activeTab === "CONTAS" && <ContasTab />}
        {activeTab === "OPERADORAS" && <OperadorasTab />}
        {activeTab === "RECEBIVEIS" && <RecebiveisTab />}
      </div>
    </PageLayout>
  );
};
