import { ContasTab } from "../components/financeiro/ContasTab";
import { PageLayout } from "../components/ui";

export const ContasBancariasPage = () => {
  return (
    <PageLayout
      title="Contas Bancárias"
      subtitle="Gerencie as contas bancárias e caixas físicos do seu negócio."
    >
      <ContasTab />
    </PageLayout>
  );
};
