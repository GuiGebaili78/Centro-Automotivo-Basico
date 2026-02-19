import { useState, useEffect, useRef } from "react";
import { FornecedorService } from "../services/fornecedor.service";
import type { IFornecedor } from "../types/fornecedor.types";
import { FornecedorForm } from "../components/forms/FornecedorForm";
import { FornecedoresTable } from "../components/fornecedores/FornecedoresTable";
import { Button } from "../components/ui/Button";
import { Plus, Search, Truck } from "lucide-react";
import { Input } from "../components/ui/Input";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";

export const FornecedorPage = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);
  const [editData, setEditData] = useState<IFornecedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: number | null;
  }>({ open: false, id: null });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "list") {
      loadFornecedores();
      // Focus on search input when returning to list
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [view]);

  const loadFornecedores = async () => {
    try {
      const data = await FornecedorService.getAll();
      setFornecedores(data);
    } catch (error) {
      toast.error("Erro ao carregar lista de fornecedores.");
    }
  };

  const handleRequestDelete = (id: number) => {
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await FornecedorService.delete(deleteModal.id);
      toast.success("Fornecedor removido com sucesso!");
      loadFornecedores();
      setDeleteModal({ open: false, id: null });
    } catch (error: any) {
      const msg = error.response?.data?.error || "Erro ao deletar fornecedor.";
      toast.error(msg);
    }
  };

  const handleNew = () => {
    setEditData(null);
    setView("form");
  };

  const handleEdit = (f: IFornecedor) => {
    setEditData(f);
    setView("form");
  };

  const handleFormSuccess = () => {
    toast.success(
      editData ? "Fornecedor atualizado!" : "Fornecedor cadastrado!",
    );
    setView("list");
    setEditData(null);
  };

  const filteredFornecedores = fornecedores.filter((f) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const terms = s.split(" ").filter((t) => t.length > 0);

    // Concatenating fields for global search
    const nome = (f.nome || "").toLowerCase();
    const fantasia = (f.nome_fantasia || "").toLowerCase();
    const doc = (f.documento || "").toLowerCase();
    const cidade = (f.cidade || "").toLowerCase();
    const estado = (f.uf || "").toLowerCase();
    const contato = (f.contato || "").toLowerCase();
    const produto = (f.categoria_produto || "").toLowerCase();
    const logradouro = (f.logradouro || "").toLowerCase();
    const bairro = (f.bairro || "").toLowerCase();
    const email = (f.email || "").toLowerCase();

    const fullStr = `${nome} ${fantasia} ${doc} ${cidade} ${estado} ${contato} ${produto} ${logradouro} ${bairro} ${email}`;

    return terms.every((term) => fullStr.includes(term));
  });

  // RENDER: FORM VIEW
  if (view === "form") {
    return (
      <FornecedorForm
        initialData={editData}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setView("list");
          setEditData(null);
        }}
      />
    );
  }

  // RENDER: LIST VIEW
  return (
    <PageLayout
      title="Gestão de Fornecedores"
      actions={
        <Button variant="primary" icon={Plus} onClick={handleNew}>
          Novo Fornecedor
        </Button>
      }
    >
      <div className="mb-6">
        <Input
          ref={searchInputRef}
          variant="default"
          value={searchTerm}
          icon={Search}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, documento, endereço ou contato..."
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredFornecedores.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-neutral-50 p-6 rounded-full text-neutral-300">
                  <Truck size={40} />
                </div>
                <p className="font-medium">Nenhum fornecedor encontrado.</p>
              </div>
            </div>
          ) : (
            <FornecedoresTable
              fornecedores={filteredFornecedores}
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
            />
          )}
        </div>
      </Card>

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Excluir Fornecedor"
        description="Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita."
        variant="danger"
      />
    </PageLayout>
  );
};
