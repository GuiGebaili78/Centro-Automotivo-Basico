import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { PageLayout, Modal, Button, ConfirmModal } from "../components/ui";
import { FornecedorForm } from "../components/fornecedores/Forms/FornecedorForm";
import { EntradaFornecedorForm } from "../components/estoque/EntradaFornecedorForm";
import { EntradaItensForm } from "../components/estoque/EntradaItensForm";
import { api } from "../services/api";
import { EstoqueService } from "../services/estoque.service";
import { FinanceiroService } from "../services/financeiro.service";
import type {
  IItemEntrada,
  IEntradaEstoquePayload,
} from "../types/estoque.types";
import { Edit, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export const EntradaEstoquePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId")
    ? Number(searchParams.get("editId"))
    : null;
  const isEditMode = !!editId;

  // Header State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState(dayjs().tz("America/Sao_Paulo").format("YYYY-MM-DD"));
  const [obs, setObs] = useState("");
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [nfsPendentes, setNfsPendentes] = useState<any[]>([]);
  const [nfNumero, setNfNumero] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Items State
  const [items, setItems] = useState<IItemEntrada[]>([]);

  // Load Suppliers & Pending NFs
  useEffect(() => {
    loadSuppliers();
    loadNfsPendentes();
  }, []);

  // Load entry data if in edit mode
  useEffect(() => {
    if (editId) {
      loadEntryForEdit(editId);
    }
  }, [editId]);

  const loadSuppliers = () => {
    api
      .get("/fornecedor")
      .then((res) => setSuppliers(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  };

  const loadNfsPendentes = async () => {
    try {
      const response = await FinanceiroService.getNfsPendentes();
      // Backend retorna { data: [], total: N } — extrair o array interno
      const list = Array.isArray(response) ? response : (response?.data ?? []);
      setNfsPendentes(list);
    } catch (e) {
      console.error("Erro ao carregar NFs pendentes:", e);
    }
  };

  const loadEntryForEdit = async (id: number) => {
    setLoadingEdit(true);
    try {
      const entry = await EstoqueService.getEntry(id);

      // Preencher cabeçalho
      setSelectedSupplierId(String(entry.id_pessoa));
      setInvoice(entry.nota_fiscal || "");
      setDate(
        entry.data_compra
          ? entry.data_compra.split("T")[0]
          : dayjs().tz("America/Sao_Paulo").format("YYYY-MM-DD"),
      );
      setObs(entry.obs || "");
      setNfNumero(entry.nf_numero || "");

      // Preencher itens com dados do banco
      const loadedItems: IItemEntrada[] = (entry.itens || []).map((i: any) => ({
        tempId: i.id_item_entrada, // usa o id real como tempId para identificação
        id_item_entrada: i.id_item_entrada,
        id_pecas_estoque: i.id_pecas_estoque,
        new_part_data: null,
        displayName: i.peca?.nome || `Peça #${i.id_pecas_estoque}`,
        quantidade: i.quantidade,
        valor_custo: Number(i.valor_custo),
        margem_lucro: i.margem_lucro ? Number(i.margem_lucro) : 0,
        valor_venda: Number(i.valor_venda),
        ref_cod: i.ref_cod || "",
        condicao: i.condicao || "",
        aplicacao: i.aplicacao || "",
        obs: i.obs || "",
        _delete: false,
      }));
      setItems(loadedItems);
    } catch (e: any) {
      toast.error(
        "Erro ao carregar entrada para edição: " +
          (e.response?.data?.error || e.message),
      );
    } finally {
      setLoadingEdit(false);
    }
  };

  // Calcula total apenas sobre itens não marcados para exclusão
  const totalValue = items
    .filter((i) => !(i as any)._delete)
    .reduce((acc, i) => acc + i.quantidade * i.valor_custo, 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast.error("Selecione um Fornecedor.");
      return;
    }
    if (items.filter((i) => !(i as any)._delete).length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }

    try {
      if (isEditMode && editId) {
        // --- MODO EDIÇÃO: PUT ---
        const payload = {
          id_pessoa: Number(selectedSupplierId),
          nota_fiscal: invoice,
          data_compra: new Date(date),
          obs: obs,
          nf_numero: nfNumero.trim() || null,
          itens: items.map((i) => ({
            id_item_entrada: (i as any).id_item_entrada || undefined,
            id_pecas_estoque: i.id_pecas_estoque || undefined,
            new_part_data: i.new_part_data || undefined,
            quantidade: i.quantidade,
            valor_custo: i.valor_custo,
            valor_venda: i.valor_venda,
            margem_lucro: i.margem_lucro,
            ref_cod: i.ref_cod,
            condicao: i.condicao,
            aplicacao: i.aplicacao,
            obs: i.obs,
            _delete: (i as any)._delete || false,
          })),
        };

        await EstoqueService.updateEntry(editId, payload);
        toast.success("Entrada atualizada com sucesso!");
      } else {
        // --- MODO CRIAÇÃO: POST (sem campo financeiro) ---
        const payload: IEntradaEstoquePayload = {
          id_fornecedor: Number(selectedSupplierId),
          nota_fiscal: invoice,
          data_compra: new Date(date),
          obs: obs,
          itens: items,
          nf_numero: nfNumero.trim() || null,
        };

        await EstoqueService.createEntry(payload);
        toast.success("Entrada Registrada com Sucesso!");

        // Limpar formulário apenas no modo criação
        setItems([]);
        setInvoice("");
        setObs("");
        setNfNumero("");
        loadNfsPendentes();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(
        "Erro ao processar entrada: " + (e.response?.data?.error || e.message),
      );
    }
  };

  const handleDeleteEntry = async () => {
    if (!editId) return;
    try {
      await EstoqueService.deleteEntry(editId);
      toast.success("Entrada de estoque e itens removidos com sucesso!");
      navigate("/notas-fiscais");
    } catch (e: any) {
      console.error(e);
      toast.error(
        "Erro ao excluir entrada: " + (e.response?.data?.error || e.message),
      );
    } finally {
      setShowConfirmDelete(false);
    }
  };

  if (loadingEdit) {
    return (
      <PageLayout
        title="Carregando Entrada..."
        subtitle="Aguarde enquanto os dados da entrada são carregados."
      >
        <div className="flex items-center justify-center h-40 text-neutral-400">
          Carregando dados da entrada #{editId}...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={
        isEditMode
          ? `Editando Entrada #${editId}`
          : "Nova Compra / Entrada de Estoque"
      }
      subtitle={
        isEditMode
          ? "Adicione ou remova itens desta entrada. Itens em uso em Ordens de Serviço ativas não podem ser removidos."
          : "Registre novas aquisições de peças e atualize o estoque automaticamente."
      }
      actions={
        isEditMode ? (
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => setShowConfirmDelete(true)}
            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
          >
            Excluir Entrada
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Banner de modo edição */}
        {isEditMode && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Edit size={18} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Você está <strong>editando</strong> uma entrada de estoque
              existente. Os itens marcados como{" "}
              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold uppercase">
                SERÁ REMOVIDO
              </span>{" "}
              serão excluídos permanentemente ao salvar.
            </p>
          </div>
        )}

        <EntradaFornecedorForm
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          setSelectedSupplierId={setSelectedSupplierId}
          invoice={invoice}
          setInvoice={setInvoice}
          date={date}
          setDate={setDate}
          onNewSupplier={() => setShowNewSupplierModal(true)}
          nfsPendentes={nfsPendentes}
          nfNumero={nfNumero}
          setNfNumero={setNfNumero}
        />

        <EntradaItensForm
          items={items}
          setItems={setItems}
          onSubmit={handleSubmit}
          totalValue={totalValue}
          isEditMode={isEditMode}
        />

        {/* NEW SUPPLIER MODAL */}
        {showNewSupplierModal && (
          <Modal
            title="Novo Fornecedor"
            onClose={() => setShowNewSupplierModal(false)}
            className="max-w-4xl"
          >
            <FornecedorForm
              onSuccess={(newSupplier: any) => {
                if (newSupplier) {
                  setSuppliers((prev) => [...prev, newSupplier]);
                  setSelectedSupplierId(String(newSupplier.id_fornecedor));
                  toast.success("Fornecedor Cadastrado e Selecionado!");
                }
                setShowNewSupplierModal(false);
              }}
              onCancel={() => setShowNewSupplierModal(false)}
            />
          </Modal>
        )}
      </div>

      {showConfirmDelete && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={handleDeleteEntry}
          title="Excluir Entrada de Estoque"
          description="Tem a certeza que deseja excluir esta entrada de estoque e todos os seus itens? Esta ação não pode ser desfeita e reverterá a quantidade no estoque. Peças já utilizadas em OS ativas bloquearão a exclusão."
          variant="danger"
        />
      )}
    </PageLayout>
  );
};
