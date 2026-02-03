import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";
import { FuncionarioForm } from "../components/forms/FuncionarioForm";
import { ActionButton } from "../components/ui/ActionButton";
import { Input } from "../components/ui/Input";
import { Plus, Search, Trash2, Edit, Users, User, Phone } from "lucide-react";
import type { IFuncionario } from "../types/backend";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

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
      const response = await api.get("/funcionario");
      setFuncionarios(response.data);
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
      await api.delete(`/funcionario/${deleteModal.id}`);
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
            <table className="tabela-limpa w-full">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cargo / Função</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredFuncionarios.map((f) => (
                  <tr
                    key={f.id_funcionario}
                    className="transition-colors hover:bg-neutral-50 group"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 block">
                            {f.pessoa_fisica?.pessoa?.nome}
                          </p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">
                            CPF: {f.pessoa_fisica?.cpf || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="neutral">{f.cargo}</Badge>
                        {f.especialidade && (
                          <span className="text-[10px] text-neutral-500 font-medium ml-1">
                            Spec: {f.especialidade}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
                        <Phone size={14} className="text-neutral-400" />
                        {f.telefone_pessoal || "-"}
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant={f.ativo === "S" ? "success" : "danger"}>
                        {f.ativo === "S" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          icon={Edit}
                          label="Editar"
                          variant="neutral"
                          onClick={() => handleEdit(f)}
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => handleRequestDelete(f.id_funcionario)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
