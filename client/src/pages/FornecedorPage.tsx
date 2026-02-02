import { useState, useEffect, useRef, Fragment } from "react";
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
  Building2,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { ActionButton } from "../components/ui/ActionButton";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

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
      const response = await api.get("/fornecedor");
      setFornecedores(response.data);
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
      await api.delete(`/fornecedor/${deleteModal.id}`);
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
            <table className="tabela-limpa w-full">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Localização</th>
                  <th>Contato</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredFornecedores.map((f) => (
                  <tr
                    key={f.id_fornecedor}
                    className="hover:bg-neutral-50 transition-colors group"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
                          {f.tipo_pessoa === "FISICA" ? (
                            <User size={18} />
                          ) : (
                            <Building2 size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">
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
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
                        <MapPin size={14} className="text-neutral-400" />
                        <span className="uppercase">
                          {f.logradouro ? (
                            <>
                              {f.logradouro}, {f.numero} - {f.bairro}
                            </>
                          ) : (
                            <span className="text-neutral-400">
                              Endereço não cadastrado
                            </span>
                          )}
                        </span>
                      </div>
                      {f.cidade && (
                        <div className="pl-6 text-xs text-neutral-400 font-medium uppercase">
                          {f.cidade}/{f.uf}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {f.contato && (
                          <div className="font-bold text-neutral-700 text-sm flex items-center gap-2 mb-1">
                            <User size={14} className="text-neutral-400" />
                            {f.contato}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {f.whatsapp && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                              <Phone size={12} />
                              {f.whatsapp}
                            </div>
                          )}
                          {f.telefone && f.telefone !== f.whatsapp && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                              <Phone size={12} />
                              {f.telefone}
                            </div>
                          )}
                        </div>

                        {f.email && (
                          <span className="text-xs text-neutral-500 mt-1">
                            {f.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
