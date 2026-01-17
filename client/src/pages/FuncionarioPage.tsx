import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
// import { Modal } from '../components/ui/Modal'; // Removed
import { Button } from "../components/ui/Button";
import { FuncionarioForm } from "../components/forms/FuncionarioForm";
import { StatusBanner } from "../components/ui/StatusBanner";
import { ActionButton } from "../components/ui/ActionButton";
import { Input } from "../components/ui/input";
import { Plus, Search, Trash2, Edit, Users, User, Phone } from "lucide-react";
import type { IFuncionario } from "../types/backend";

export const FuncionarioPage = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [funcionarios, setFuncionarios] = useState<IFuncionario[]>([]);
  const [editData, setEditData] = useState<IFuncionario | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "list") {
      loadFuncionarios();
    }
  }, [view]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const loadFuncionarios = async () => {
    try {
      const response = await api.get("/funcionario");
      setFuncionarios(response.data);
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao carregar colaboradores." });
    }
  };

  const handleDeleteFuncionario = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este colaborador?")) return;
    try {
      await api.delete(`/funcionario/${id}`);
      setStatusMsg({ type: "success", text: "Colaborador removido." });
      loadFuncionarios();
      setTimeout(() => setStatusMsg({ type: null, text: "" }), 3000);
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao remover colaborador." });
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
    setStatusMsg({
      type: "success",
      text: editData ? "Cadastro atualizado!" : "Novo colaborador cadastrado!",
    });
    setView("list");
    setEditData(null);
    setTimeout(() => setStatusMsg({ type: null, text: "" }), 3000);
  };

  const filteredFuncionarios = funcionarios.filter((f) => {
    const nome = f.pessoa_fisica?.pessoa?.nome?.toLowerCase() || "";
    const cpf = f.pessoa_fisica?.cpf || "";
    const search = searchTerm.toLowerCase();
    return nome.includes(search) || cpf.includes(search);
  });

  // RENDER FORM
  if (view === "form") {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6">
        <FuncionarioForm
          initialData={editData}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setView("list");
            setEditData(null);
          }}
        />
        <div className="fixed bottom-8 right-8 z-100 min-w-[320px]">
          <StatusBanner
            msg={statusMsg}
            onClose={() => setStatusMsg({ type: null, text: "" })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-500">Equipe & MEI</h1>
          <p className="text-neutral-500">
            Gestão de colaboradores e prestadores de serviço.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleNew}>
          Novo Colaborador
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-surface p-4 rounded-xl shadow-sm border border-neutral-200 flex gap-4">
        <Input
          ref={searchInputRef}
          variant="default"
          icon={Search}
          placeholder="Buscar por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {filteredFuncionarios.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                <Users size={40} />
              </div>
              <p className="font-bold text-neutral-400">
                Nenhum colaborador encontrado.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                <th className="p-4">Colaborador</th>
                <th className="p-4">Cargo / Função</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredFuncionarios.map((f) => (
                <tr
                  key={f.id_funcionario}
                  className="transition-colors hover:bg-neutral-25"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-50 text-primary-600 rounded-full">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-500 block">
                          {f.pessoa_fisica?.pessoa?.nome}
                        </p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase">
                          CPF: {f.pessoa_fisica?.cpf || "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 px-2 bg-neutral-100 text-neutral-600 rounded-lg">
                        <span className="font-bold text-xs">{f.cargo}</span>
                      </div>
                    </div>
                    {f.especialidade && (
                      <p className="text-[10px] text-neutral-400 font-medium ml-2 mt-1">
                        {f.especialidade}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-neutral-500 text-sm">
                        <Phone size={12} className="text-neutral-400" />
                        {f.telefone_pessoal || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {f.ativo === "S" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
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
                          handleDeleteFuncionario(f.id_funcionario)
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="fixed bottom-8 right-8 z-100 min-w-[320px]">
        <StatusBanner
          msg={statusMsg}
          onClose={() => setStatusMsg({ type: null, text: "" })}
        />
      </div>
    </div>
  );
};
