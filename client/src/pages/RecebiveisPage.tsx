import { PageLayout } from "../components/ui";
import { RecebiveisTab } from "../components/financeiro/RecebiveisTab";

export const RecebiveisPage = () => {
  return (
    <PageLayout
      title="Recebíveis"
      subtitle="Controle e conciliação de recebimentos de cartão."
    >
      <RecebiveisTab />
    </PageLayout>
  );
};
