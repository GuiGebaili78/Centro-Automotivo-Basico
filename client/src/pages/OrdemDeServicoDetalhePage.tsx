import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Hooks
import { useOrdemServico } from "../hooks/os/useOrdemServico";
import { useOsItems } from "../hooks/os/useOsItems";
import { useOsStatus } from "../hooks/os/useOsStatus";
import { useOsEmployees } from "../hooks/os/useOsEmployees"; // For LaborManager logic if needed
import { useConfirm } from "../hooks/useConfirm";

// Components
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { LaborManager } from "../components/os/LaborManager";
import { DocumentoModal } from "../components/ui/DocumentoModal";
import { PagamentoClienteForm } from "../components/forms/PagamentoClienteForm";

// Subcomponents
import { OsHeader } from "../components/os/OsHeader";
import { OsVehicleInfo } from "../components/os/OsVehicleInfo";
import { OsClientInfo } from "../components/os/OsClientInfo";
import { OsDiagnosis } from "../components/os/OsDiagnosis";
import { OsItemsSection } from "../components/os/OsItemsSection";
import { OsTotalsSection } from "../components/os/OsTotalsSection";

// Icons
import { Wrench, Edit } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { OsStatus } from "../types/os.types";

export const OrdemDeServicoDetalhePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- HOOKS ---
  const {
    os,
    loading: loadingOs,
    updateOSField,
    refetch: refetchOs,
  } = useOrdemServico(id);
  const {
    items,
    addItem,
    updateItem,
    deleteItem,
    searchParts,
    partSearchResults,
    setPartSearchResults,
  } = useOsItems(id);

  const { confirmState, requestConfirm, closeConfirm } = useConfirm();

  const { employees } = useOsEmployees(); // Used by LaborManager

  const { finishOS, openOsNow, reopenOS, cancelOS } = useOsStatus(
    id,
    refetchOs,
  );

  // --- LOCAL STATE ---
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDateEdit, setShowDateEdit] = useState(false);

  // Edit Item Modal State
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editingItemData, setEditingItemData] = useState<any>(null);

  // --- COMPUTED ---
  const isLocked = useMemo(() => {
    if (!os) return true;
    return (
      os.status === OsStatus.FINALIZADA ||
      os.status === "CANCELADA" ||
      os.status === "PAGA_CLIENTE"
    );
  }, [os]);

  // Derived Totals
  const totals = useMemo(() => {
    const totalParts = items.reduce(
      (acc, i) => acc + Number(i.valor_total || 0),
      0,
    );

    const laborList = os?.servicos_mao_de_obra || [];
    const totalLabor =
      laborList.length > 0
        ? laborList.reduce(
            (acc: number, l: any) => acc + Number(l.valor || 0),
            0,
          )
        : Number(os?.valor_mao_de_obra || 0);

    return {
      parts: totalParts,
      labor: totalLabor,
      general: totalParts + totalLabor,
    };
  }, [items, os?.servicos_mao_de_obra, os?.valor_mao_de_obra]);

  // --- HANDLERS ---

  const handleBack = () => {
    navigate("/"); // Simplified back navigation
  };

  const actions = {
    handleFinish: () => {
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
    },
    handleReopen: () => {
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
    },
    handleCancel: () => {
      requestConfirm(
        "Cancelar Ordem de Serviço",
        "Tem certeza que deseja CANCELAR esta OS? Todos os itens serão devolvidos ao estoque automaticamente.",
        async () => {
          await cancelOS();
          closeConfirm();
        },
      );
    },
  };

  const handleEditItemClick = (item: any) => {
    setEditingItemData({
      ...item,
      id_fornecedor: item.pagamentos_peca?.[0]?.id_fornecedor || "",
    });
    setEditItemModalOpen(true);
  };

  const handleSaveItemEdit = async () => {
    if (!editingItemData) return;
    const success = await updateItem(editingItemData.id_iten, editingItemData);
    if (success) {
      setEditItemModalOpen(false);
      setEditingItemData(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case OsStatus.FINALIZADA:
        return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
      case "PAGA_CLIENTE":
        return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
      case OsStatus.FINANCEIRO:
      case "PRONTO PARA FINANCEIRO":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
      case OsStatus.ABERTA:
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
      case OsStatus.AGENDAMENTO:
        return "bg-purple-100 text-purple-700 ring-1 ring-purple-200";
      case OsStatus.ORCAMENTO:
        return "bg-orange-100 text-orange-700 ring-1 ring-orange-200";
      default:
        return "bg-gray-50 text-gray-500 ring-1 ring-gray-200";
    }
  };

  if (loadingOs || !os) {
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
          onPrint={() => setDocumentModalOpen(true)}
          onOpenOsNow={openOsNow}
          getStatusStyle={getStatusStyle}
        />
      }
      subtitle="Gerencie os detalhes, peças e serviços desta Ordem de Serviço."
      actions={<></>} // Actions moved to Header or Totals
    >
      <DocumentoModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        osId={os.id_os}
        status={os.status}
        clienteEmail={os.cliente?.email || ""}
        clienteTelefone={os.cliente?.telefone_1}
        clienteNome={
          os.cliente?.pessoa_fisica?.pessoa?.nome ||
          os.cliente?.pessoa_juridica?.nome_fantasia ||
          "Cliente"
        }
      />

      <div className="space-y-8">
        {/* Info Card */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-3">
              <OsVehicleInfo
                veiculo={os.veiculo}
                clienteId={os.cliente?.id_cliente}
              />
            </div>
            <div className="md:col-span-3">
              <OsClientInfo cliente={os.cliente} />
            </div>
            <div className="md:col-span-6 flex flex-col md:border-l md:border-neutral-100 md:pl-6">
              {/* Simplified view for Date/KM - could be extracted too but keeping simple based on plan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1 block">
                    Data Agendamento
                  </span>
                  {!showDateEdit ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-600">
                        {new Date(os.dt_abertura).toLocaleString([], {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => setShowDateEdit(true)}
                        className="text-primary-600 hover:text-primary-800 p-1 hover:bg-primary-50 rounded"
                        title="Alterar Data/Hora"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        className="text-sm border border-neutral-300 rounded p-1 bg-white"
                        defaultValue={
                          // Convert to local datetime string format: YYYY-MM-DDTHH:MM
                          new Date(
                            new Date(os.dt_abertura).getTime() -
                              new Date().getTimezoneOffset() * 60000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        }
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val) {
                            updateOSField(
                              "dt_abertura",
                              new Date(val).toISOString(),
                            );
                          }
                          setShowDateEdit(false);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => setShowDateEdit(false)}
                        className="text-xs text-neutral-500 underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1 block">
                    KM Atual
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={os.km_entrada || 0}
                      onChange={(e) =>
                        updateOSField("km_entrada", Number(e.target.value))
                      }
                      className="w-24 bg-neutral-50 border border-neutral-200 rounded p-1 text-sm font-bold text-neutral-700 outline-none focus:border-primary-500"
                    />
                    <span className="text-xs font-bold text-neutral-400">
                      KM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Diagonal/Labor Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <OsDiagnosis
              defeitoRelatado={os.defeito_relatado}
              diagnostico={os.diagnostico}
              onChangeDefeito={(val) => updateOSField("defeito_relatado", val)}
              onBlurDefeito={(val) => updateOSField("defeito_relatado", val)}
              onChangeDiagnostico={(val) => updateOSField("diagnostico", val)}
              onBlurDiagnostico={(val) => updateOSField("diagnostico", val)}
            />
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full p-4 space-y-2">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-neutral-50">
                <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                  <Wrench size={14} />
                </div>
                Mão de Obra
              </h3>
              <LaborManager
                mode="api"
                osId={os.id_os}
                initialData={os.servicos_mao_de_obra || []}
                employees={employees}
                onChange={refetchOs}
                readOnly={isLocked}
              />
            </Card>
          </div>
        </div>

        {/* Items */}
        <OsItemsSection
          items={items}
          isLocked={isLocked}
          onAdd={addItem}
          onEdit={handleEditItemClick}
          onDelete={(id) => {
            requestConfirm(
              "Excluir Item",
              "Deseja excluir este item?",
              async () => {
                await deleteItem(id);
                closeConfirm();
              },
            );
          }}
          onSearch={searchParts}
          searchResults={partSearchResults}
          setSearchResults={setPartSearchResults}
        />

        {/* Totals & Actions */}
        <OsTotalsSection
          totalParts={totals.parts}
          totalLabor={totals.labor}
          totalGeneral={totals.general}
          payments={os.pagamentos_cliente || []}
          osStatus={os.status}
          onManagePayments={() => setShowPaymentModal(true)}
          onFinish={actions.handleFinish}
          onReopen={actions.handleReopen}
        />
      </div>

      {/* MODALS */}
      {confirmState.isOpen && (
        <Modal title={confirmState.title} onClose={closeConfirm}>
          <p className="mb-6">{confirmState.message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeConfirm}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmState.onConfirm}>
              Confirmar
            </Button>
          </div>
        </Modal>
      )}

      {editItemModalOpen && editingItemData && (
        <Modal title="Editar Item" onClose={() => setEditItemModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Descrição
              </label>
              <input
                className="w-full border p-2 rounded text-sm"
                value={editingItemData.descricao}
                onChange={(e) =>
                  setEditingItemData({
                    ...editingItemData,
                    descricao: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Código/Ref
              </label>
              <input
                className="w-full border p-2 rounded text-sm"
                value={editingItemData.codigo_referencia || ""}
                onChange={(e) =>
                  setEditingItemData({
                    ...editingItemData,
                    codigo_referencia: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  Qtd
                </label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm"
                  value={editingItemData.quantidade}
                  onChange={(e) =>
                    setEditingItemData({
                      ...editingItemData,
                      quantidade: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  Valor Unit.
                </label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm"
                  value={editingItemData.valor_venda}
                  onChange={(e) =>
                    setEditingItemData({
                      ...editingItemData,
                      valor_venda: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                Total
              </p>
              <p className="text-xl font-bold text-primary-600">
                {formatCurrency(
                  Number(editingItemData.quantidade) *
                    Number(editingItemData.valor_venda),
                )}
              </p>
            </div>
            <Button onClick={handleSaveItemEdit} className="w-full mt-2">
              Salvar Alterações
            </Button>
          </div>
        </Modal>
      )}

      {showPaymentModal && os && (
        <Modal title="Pagamentos" onClose={() => setShowPaymentModal(false)}>
          {/* Simplified Payment Display - logic mostly in Form or Page */}
          <PagamentoClienteForm
            osId={os.id_os}
            valorTotal={
              totals.general -
              (os.pagamentos_cliente || [])
                .filter((p) => !p.deleted_at)
                .reduce((acc, p) => acc + Number(p.valor), 0)
            }
            onSuccess={() => {
              setShowPaymentModal(false);
              refetchOs();
            }}
            onCancel={() => setShowPaymentModal(false)}
          />
          {/* Note: I removed the list of payments table to save space/complexity as per user request to clean up, 
                   but usually the form/modal might handle it basically. 
                   If the user wants the table back inside the modal, I should check the original code.
                   The original code had the table INSIDE the modal. I should probably keep it if I want to match functionality 100%.
                   For now, I'll rely on PagamentoClienteForm or add the table if critical.
                   Original requirement: "NÃO remover funcionalidades."
                   So I must include the table. I'll add it back.
               */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">
              Histórico de Pagamentos
            </h4>
            {os.pagamentos_cliente?.map((pag) => (
              <div
                key={pag.id_pagamento_cliente}
                className={`flex justify-between text-xs p-2 border-b ${pag.deleted_at ? "line-through opacity-50" : ""}`}
              >
                <span>
                  {new Date(pag.data_pagamento).toLocaleDateString()} -{" "}
                  {pag.metodo_pagamento}
                </span>
                <span className="font-bold">
                  {formatCurrency(Number(pag.valor))}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};
