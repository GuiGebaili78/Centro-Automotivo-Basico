import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@tremor/react";

// Hooks
import { useOrdemServico } from "../hooks/useOrdemServico";
import { useConfirm } from "../hooks/useConfirm";

// Components
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { LaborManager } from "../components/shared/os/LaborManager";
import { OsShareModal } from "../components/shared/os/OsShareModal";
import { EditItemOsModal } from "../components/shared/os/EditItemOsModal";
import { PaymentOsModal } from "../components/shared/os/PaymentOsModal";

// Subcomponents
import { OsHeader } from "../components/shared/os/OsHeader";
import { OsInfoCard } from "../components/shared/os/OsInfoCard";
import { OsDiagnosis } from "../components/shared/os/OsDiagnosis";
import { OsItemsSection } from "../components/shared/os/OsItemsSection";
import { OsTotalsSection } from "../components/shared/os/OsTotalsSection";

// Icons
import { Wrench, Package, ListChecks, DollarSign } from "lucide-react";

export const OrdemDeServicoDetalhePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- SOURCE OF TRUTH (HOOK) ---
  const {
    os,
    items,
    employees,
    loading,
    isLocked,
    totals,
    totalPending,
    updateOSField,
    refetch,
    finishOS,
    openOsNow,
    reopenOS,
    addItem,
    deleteItem,
    addLabor,
    updateLabor,
    deleteLabor,
    searchParts,
    partSearchResults,
    setPartSearchResults,
    checkStockAvailability,
    // UI State from hook
    editItemModalOpen,
    setEditItemModalOpen,
    editingItemData,
    setEditingItemData,
    handleEditItem,
    handleSaveItemEdit,
    paymentModalOpen,
    setPaymentModalOpen,
    shareModalOpen,
    setShareModalOpen,
  } = useOrdemServico(id);

  const { confirmState, requestConfirm, closeConfirm } = useConfirm();
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // --- HANDLERS ---
  const handleBack = () => navigate("/");

  const handleFinish = () => {
    requestConfirm(
      "Finalizar OS",
      "Deseja Finalizar a OS? Isso irá gerar o financeiro e mudar o status.",
      async () => {
        const success = await finishOS({
          valor_pecas: totals.parts,
          valor_mao_de_obra: totals.labor,
          valor_total_cliente: totals.general,
          dt_entrega: os?.dt_entrega
            ? new Date(os.dt_entrega).toISOString()
            : new Date().toISOString(),
        });
        if (success) {
          closeConfirm();
          setTimeout(() => navigate("/"), 1000);
        }
      },
    );
  };

  const handleReopen = () => {
    if (os?.fechamento_financeiro) {
      requestConfirm(
        "Confirmar Reabertura",
        "Esta OS possui fechamento financeiro. A reabertura irá remover o fechamento. Continuar?",
        async () => {
          await reopenOS(os.fechamento_financeiro?.id_fechamento_financeiro);
          closeConfirm();
        },
      );
    } else {
      reopenOS();
    }
  };

  const handleDeleteItem = (itemId: number) => {
    requestConfirm(
      "Excluir Item",
      "Deseja excluir este item?",
      async () => {
        await deleteItem(itemId);
        closeConfirm();
      },
      "danger",
    );
  };

  if (loading || !os) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Carregando detalhes da OS...
      </div>
    );
  }

  return (
    <PageLayout
      title={
        <OsHeader
          os={os}
          onBack={handleBack}
          onPrint={() => setShareModalOpen(true)}
          onOpenOsNow={openOsNow}
        />
      }
      subtitle="Gerencie os detalhes, peças e serviços desta Ordem de Serviço."
    >
      {/* MODALS */}
      <OsShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        osId={os.id_os}
        clientEmail={os.cliente?.email || undefined}
        clientPhone={os.cliente?.telefone_1}
      />

      <EditItemOsModal
        isOpen={editItemModalOpen}
        onClose={() => setEditItemModalOpen(false)}
        itemData={editingItemData}
        setItemData={setEditingItemData}
        onSave={handleSaveItemEdit}
      />

      <PaymentOsModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        osId={os.id_os}
        totalPending={totalPending}
        pagamentos={os.pagamentos_cliente || []}
        onSuccess={() => {
          setPaymentModalOpen(false);
          refetch();
        }}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        description={confirmState.message}
        variant={confirmState.variant as "danger" | "primary"}
      />

      {/* MAIN CONTENT WITH TABS */}
      <TabGroup index={activeTab} onIndexChange={setActiveTab} className="mt-4">
        <TabList variant="line" className="mb-6">
          <Tab icon={ListChecks}>Geral</Tab>
          <Tab icon={Wrench}>Mão de Obra</Tab>
          <Tab icon={Package}>Peças</Tab>
          <Tab icon={DollarSign}>Financeiro</Tab>
        </TabList>

        <TabPanels>
          {/* TAB 1: GERAL */}
          <TabPanel>
            <div className="space-y-6">
              <OsInfoCard
                os={os}
                showDateEdit={showDateEdit}
                setShowDateEdit={setShowDateEdit}
                updateOSField={updateOSField}
              />
              <OsDiagnosis
                defeitoRelatado={os.defeito_relatado}
                diagnostico={os.diagnostico}
                onChangeDefeito={(val) =>
                  updateOSField("defeito_relatado", val)
                }
                onBlurDefeito={(val) => updateOSField("defeito_relatado", val)}
                onChangeDiagnostico={(val) => updateOSField("diagnostico", val)}
                onBlurDiagnostico={(val) => updateOSField("diagnostico", val)}
              />
            </div>
          </TabPanel>

          {/* TAB 2: MÃO DE OBRA */}
          <TabPanel>
            <Card className="p-6">
              <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-3 pb-4 border-b border-neutral-100 mb-4">
                <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                  <Wrench size={16} />
                </div>
                Serviços Executados
              </h3>
              <LaborManager
                mode="api"
                osId={os.id_os}
                initialData={os.servicos_mao_de_obra || []}
                employees={employees}
                onChange={refetch}
                readOnly={isLocked}
                onAddLabor={addLabor}
                onUpdateLabor={updateLabor}
                onDeleteLabor={deleteLabor}
              />
            </Card>
          </TabPanel>

          {/* TAB 3: PEÇAS */}
          <TabPanel>
            <Card className="p-6">
              <OsItemsSection
                items={items}
                isLocked={isLocked}
                onAdd={addItem}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onSearch={searchParts}
                searchResults={partSearchResults}
                setSearchResults={setPartSearchResults}
                checkAvailability={checkStockAvailability}
              />
            </Card>
          </TabPanel>

          {/* TAB 4: FINANCEIRO */}
          <TabPanel>
            <OsTotalsSection
              totalParts={totals.parts}
              totalLabor={totals.labor}
              totalGeneral={totals.general}
              payments={os.pagamentos_cliente || []}
              osStatus={os.status}
              onManagePayments={() => setPaymentModalOpen(true)}
              onFinish={handleFinish}
              onReopen={handleReopen}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </PageLayout>
  );
};
