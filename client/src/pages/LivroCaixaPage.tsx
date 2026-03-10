import { MovimentacoesTab } from "../components/financeiro/MovimentacoesTab";
import { PageLayout } from "../components/ui";

export const LivroCaixaPage = () => {
  return (
    <PageLayout
      title="Caixa"
      subtitle="Histórico de movimentações financeiras."
    >
      <MovimentacoesTab />
    </PageLayout>
  );
};
