import { useState, useEffect, useRef } from "react";
import { ColaboradorService } from "../services/colaborador.service";
import { Button } from "../components/ui/Button";
import { FuncionarioForm } from "../components/forms/FuncionarioForm";
import { ColaboradoresTable } from "../components/colaboradores/ColaboradoresTable";
import { Input } from "../components/ui/Input";
import { Plus, Search, Users } from "lucide-react";
import type { IFuncionario } from "../types/colaborador.types";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";

export const FuncionarioPage = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [funcionarios, setFuncionarios] = useState<IFuncionario[]>([]);
  const [editData, setEditData] = useState<IFuncionario | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: number | null;
  }>({ open: false, id: null });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "list") {
      loadFuncionarios();
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [view]);

  const loadFuncionarios = async () => {
    try {
      const data = await ColaboradorService.getAll();
      setFuncionarios(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar colaboradores.");
    }
  };

  const handleRequestDelete = (id: number) => {
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await ColaboradorService.delete(deleteModal.id);
      toast.success("Colaborador removido.");
      loadFuncionarios();
      setDeleteModal({ open: false, id: null });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover colaborador.");
    }
  };

  const handleNew = () => {
    setEditData(null);
    setView("form");
  };

  const handleEdit = (func: IFuncionario) => {
    setEditData(func);
    setView("form");
  };

  const handleFormSuccess = () => {
    toast.success(
      editData ? "Cadastro atualizado!" : "Novo colaborador cadastrado!",
    );
    setView("list");
    setEditData(null);
  };

  const filteredFuncionarios = funcionarios.filter((f) => {
    const s = searchTerm.toLowerCase();
    const terms = s.split(" ").filter((t) => t.length > 0);

    const nome = (f.pessoa_fisica?.pessoa?.nome || "").toLowerCase();
    const cpf = (f.pessoa_fisica?.cpf || "").toLowerCase();
    const cargo = (f.cargo || "").toLowerCase();
    const especialidade = (f.especialidade || "").toLowerCase();

    const fullStr = `${nome} ${cpf} ${cargo} ${especialidade}`;

    return terms.every((term) => fullStr.includes(term));
  });

  // RENDER FORM
  if (view === "form") {
    return (
      <FuncionarioForm
        initialData={editData}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setView("list");
          setEditData(null);
        }}
      />
    );
  }

  // RENDER LIST
  return (
    <PageLayout
      title="Equipe & MEI"
      actions={
        <Button variant="primary" icon={Plus} onClick={handleNew}>
          Novo Colaborador
        </Button>
      }
    >
      <div className="mb-6">
        <Input
          ref={searchInputRef}
          variant="default"
          icon={Search}
          placeholder="Buscar por nome, CPF ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {filteredFuncionarios.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-neutral-50 p-6 rounded-full text-neutral-300">
                <Users size={40} />
              </div>
              <p className="font-medium">Nenhum colaborador encontrado.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ColaboradoresTable
              funcionarios={filteredFuncionarios}
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
            />
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Remover Colaborador"
        description="Tem certeza que deseja remover este colaborador? Esta ação não pode ser desfeita."
        variant="danger"
      />
    </PageLayout>
  );
};
