import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import type { IFornecedor } from "../types/backend";
import { FornecedorForm } from "../components/forms/FornecedorForm";
import { Button } from "../components/ui/Button";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Truck,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { ActionButton } from "../components/ui/ActionButton";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { showMessage } from "../adapters/showMessage";

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
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [view]);

  const loadFornecedores = async () => {
    try {
      const response = await api.get("/fornecedor");
      setFornecedores(response.data);
    } catch (error) {
      showMessage.error("Erro ao carregar lista de fornecedores.");
    }
  };

  const handleRequestDelete = (id: number) => {
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await api.delete(`/fornecedor/${deleteModal.id}`);
      showMessage.success("Fornecedor removido com sucesso!");
      loadFornecedores();
      setDeleteModal({ open: false, id: null });
    } catch (error) {
      showMessage.error("Erro ao deletar fornecedor.");
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
    showMessage.success(
      editData ? "Fornecedor atualizado!" : "Fornecedor cadastrado!",
    );
    setView("list");
    setEditData(null);
  };

  const filteredFornecedores = fornecedores.filter((f) => {
    const searchText = searchTerm.toLowerCase();
    return (
      (f.nome && f.nome.toLowerCase().includes(searchText)) ||
      (f.nome_fantasia && f.nome_fantasia.toLowerCase().includes(searchText)) ||
      (f.documento && f.documento.includes(searchTerm))
    );
  });

  // RENDER: FORM VIEW
  if (view === "form") {
    return (
      <div className="space-y-6">
        <FornecedorForm
          initialData={editData}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setView("list");
            setEditData(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-500">
            Gestão de Fornecedores
          </h1>
          <p className="text-neutral-500">
            Cadastro de parceiros de peças e serviços.
          </p>
        </div>
        <Button variant="primary" onClick={handleNew}>
          <Plus size={20} /> Novo Fornecedor
        </Button>
      </div>

      <div className="bg-surface p-4 rounded-xl shadow-sm border border-neutral-200 flex gap-4">
        <Input
          ref={searchInputRef}
          variant="default"
          value={searchTerm}
          icon={Search}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome ou documento..."
        />
      </div>

      {/* Tabela */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFornecedores.length === 0 ? (
          <div className="p-20 text-center bg-neutral-25 rounded-3xl border border-neutral-100">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                <Truck size={40} />
              </div>
              <p className="font-bold text-neutral-400">
                Nenhum fornecedor encontrado.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                    <th className="p-4">Fornecedor</th>
                    <th className="p-4">Documento</th>
                    <th className="p-4">Localização</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredFornecedores.map((f) => (
                    <tr
                      key={f.id_fornecedor}
                      className="hover:bg-neutral-25 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 font-black">
                            {f.tipo_pessoa === "FISICA" ? (
                              <User size={20} />
                            ) : (
                              <Truck size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-500">
                              {f.nome_fantasia || f.nome}
                            </p>
                            {f.nome_fantasia && f.nome_fantasia !== f.nome && (
                              <p className="text-xs text-neutral-500 font-medium">
                                {f.nome}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded w-fit">
                          {f.documento || "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium">
                          <MapPin size={14} className="text-neutral-500" />
                          {f.cidade ? `${f.cidade}/${f.uf}` : "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
                            <Phone size={14} className="text-neutral-400" />
                            {f.telefone || f.whatsapp || "-"}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase">
                            {f.contato}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
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
                            onClick={() => handleRequestDelete(f.id_fornecedor)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Excluir Fornecedor"
        description="Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita."
        variant="danger"
      />
    </div>
  );
};
