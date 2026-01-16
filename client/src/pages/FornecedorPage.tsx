import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import type { IFornecedor } from "../types/backend";
import { FornecedorForm } from "../components/forms/FornecedorForm";
import { Button } from "../components/ui/Button";
import { StatusBanner } from "../components/ui/StatusBanner";
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
import { Input } from "../components/ui/input";
import { ActionButton } from "../components/ui/ActionButton";

export const FornecedorPage = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);
  const [editData, setEditData] = useState<IFornecedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

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
      setStatusMsg({
        type: "error",
        text: "Erro ao carregar lista de fornecedores.",
      });
    }
  };

  const handleDeleteFornecedor = async (id: number) => {
    if (!confirm("Deseja realmente remover este fornecedor?")) return;
    try {
      await api.delete(`/fornecedor/${id}`);
      setStatusMsg({ type: "success", text: "Fornecedor removido." });
      loadFornecedores();
      setTimeout(() => setStatusMsg({ type: null, text: "" }), 3000);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao deletar fornecedor." });
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
    setStatusMsg({
      type: "success",
      text: editData ? "Fornecedor atualizado!" : "Fornecedor cadastrado!",
    });
    setView("list");
    setEditData(null);
    setTimeout(() => setStatusMsg({ type: null, text: "" }), 3000);
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
        <StatusBanner
          msg={statusMsg}
          onClose={() => setStatusMsg({ type: null, text: "" })}
        />
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
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

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
                            onClick={() =>
                              handleDeleteFornecedor(f.id_fornecedor)
                            }
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
    </div>
  );
};
