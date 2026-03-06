import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Hooks
import { useOrdemServico } from "../hooks/useOrdemServico";
import { useConfirm } from "../hooks/useConfirm";

// Components
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { LaborManager } from "../components/os/LaborManager";
import { OsShareModal } from "../components/os/OsShareModal";
import { OsItemEditModal } from "../components/os/OsItemEditModal";
import { PaymentOsModal } from "../components/os/PaymentOsModal";
import { OsHeaderCard } from "../components/os/OsHeaderCard";

// Subcomponents
import { OsDiagnosis } from "../components/os/OsDiagnosis";
import { OsItemsSection } from "../components/os/OsItemsSection";
import { OsTotalsSection } from "../components/os/OsTotalsSection";

// Icons
import { Wrench } from "lucide-react";

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
      title=""
      subtitle=""
    >
      {/* MODALS */}
      <OsShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        osId={os.id_os}
        clientEmail={os.cliente?.email || undefined}
        clientPhone={os.cliente?.telefone_1}
      />

      <OsItemEditModal
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

      {/* HEADER CARD: OS Info (Unified) */}
      <OsHeaderCard 
        os={os}
        onBack={handleBack}
        onPrint={() => setShareModalOpen(true)}
        onOpenOsNow={openOsNow}
        showDateEdit={showDateEdit}
        setShowDateEdit={setShowDateEdit}
        updateOSField={updateOSField}
      />

      {/* MID SECTION: Diagnosis Left, Labor Right (Responsive Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch mb-6">
        <div className="h-full lg:col-span-1">
          <OsDiagnosis
            defeitoRelatado={os.defeito_relatado}
            diagnostico={os.diagnostico}
            onChangeDefeito={(val) => updateOSField("defeito_relatado", val)}
            onBlurDefeito={(val) => updateOSField("defeito_relatado", val)}
            onChangeDiagnostico={(val) => updateOSField("diagnostico", val)}
            onBlurDiagnostico={(val) => updateOSField("diagnostico", val)}
          />
        </div>
        
        <Card className="p-6 h-full flex flex-col lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest flex items-center gap-3 pb-4 border-b border-neutral-100 mb-4">
            <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
              <Wrench size={18} />
            </div>
            Serviços Executados (Mão de Obra)
          </h3>
          <div className="flex-1">
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
          </div>
        </Card>
      </div>

      {/* PARTS */}
      <Card className="p-6 mb-6">
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

      {/* TOTALS & FINANCE */}
      <Card className="p-6 overflow-hidden">
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
      </Card>
    </PageLayout>
  );
};
