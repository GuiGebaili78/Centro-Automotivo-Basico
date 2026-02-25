import { useState } from "react";
import { MovimentacoesTab } from "../components/shared/financeiro/MovimentacoesTab";
import { ContasTab } from "../components/shared/financeiro/ContasTab";
import { OperadorasTab } from "../components/shared/financeiro/OperadorasTab";
import { RecebiveisTab } from "../components/shared/financeiro/RecebiveisTab";
import { PageLayout, FilterRadio } from "../components/ui";

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
        <FilterRadio
          active={activeTab === "MOVIMENTACOES"}
          onClick={() => setActiveTab("MOVIMENTACOES")}
        >
          Movimentações
        </FilterRadio>
        <FilterRadio
          active={activeTab === "CONTAS"}
          onClick={() => setActiveTab("CONTAS")}
        >
          Contas Bancárias
        </FilterRadio>
        <FilterRadio
          active={activeTab === "OPERADORAS"}
          onClick={() => setActiveTab("OPERADORAS")}
        >
          Operadoras
        </FilterRadio>
        <FilterRadio
          active={activeTab === "RECEBIVEIS"}
          onClick={() => setActiveTab("RECEBIVEIS")}
        >
          Recebíveis
        </FilterRadio>
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
