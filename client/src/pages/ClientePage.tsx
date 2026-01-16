import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Phone,
  Mail,
  User,
  Wrench,
} from "lucide-react";
import { VeiculoForm } from "../components/forms/VeiculoForm";
import { Modal } from "../components/ui/Modal";
import { StatusBanner } from "../components/ui/StatusBanner";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import { ActionButton } from "../components/ui/ActionButton";

// Extended Interface for View (assuming backend returns relations)
interface IClienteView {
  id_cliente: number;
  telefone_1: string;
  telefone_2?: string;
  email?: string;
  logradouro: string;
  nr_logradouro: string;
  compl_logradouro?: string;
  bairro: string;
  cidade: string;
  estado: string;
  id_pessoa_juridica?: number | null;
  pessoa_fisica?: {
    id_pessoa_fisica: number;
    cpf?: string;
    pessoa: {
      nome: string;
    };
  };
  pessoa_juridica?: {
    id_pessoa_juridica: number;
    razao_social: string;
    nome_fantasia?: string;
    cnpj?: string;
  };
  veiculos?: Array<{
    id_veiculo: number;
    placa: string;
    marca: string;
    modelo: string;
    cor: string;
    ano_modelo: string;
    combustivel: string;
    chassi: string;
  }>;
}

export const ClientePage = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<IClienteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedClientIdForVehicle, setSelectedClientIdForVehicle] = useState<
    number | null
  >(null);

  // New states for Vehicle CRUD and Confirmation
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/cliente");
      setClientes(response.data);
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: "error", text: "Erro ao carregar clientes." });
    } finally {
      setLoading(false);
    }
  };

  const getNome = (c: IClienteView) => {
    if (c.pessoa_fisica) return c.pessoa_fisica.pessoa.nome;
    if (c.pessoa_juridica) return c.pessoa_juridica.razao_social; // or nome_fantasia
    return "Nome Indisponível";
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Cliente",
      message:
        "Tem certeza que deseja excluir este cliente? Todos os vínculos serão perdidos.",
      onConfirm: async () => {
        try {
          await api.delete(`/cliente/${id}`);
          setStatusMsg({
            type: "success",
            text: "Cliente removido com sucesso!",
          });
          loadClientes();
        } catch (error) {
          setStatusMsg({ type: "error", text: "Erro ao excluir cliente." });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteVehicle = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Veículo",
      message: "Tem certeza que deseja remover este veículo do cliente?",
      onConfirm: async () => {
        try {
          await api.delete(`/veiculo/${id}`);
          setStatusMsg({
            type: "success",
            text: "Veículo removido com sucesso!",
          });
          loadClientes();
        } catch (error) {
          setStatusMsg({ type: "error", text: "Erro ao deletar veículo." });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const openCreateModal = () => {
    navigate("/novo-cadastro");
  };

  const openEditModal = (client: IClienteView) => {
    navigate(`/cadastro/${client.id_cliente}`);
  };

  const openEditVehicleModal = (vehicle: any, clientId: number) => {
    setEditingVehicle(vehicle);
    setSelectedClientIdForVehicle(clientId);
    setShowVehicleModal(true);
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const handleRegisterVehicle = (clientId: number) => {
    setSelectedClientIdForVehicle(clientId);
    setEditingVehicle(undefined);
    setShowVehicleModal(true);
  };

  const filteredClientes = clientes.filter((c) => {
    const search = searchTerm.toLowerCase();
    const nome = getNome(c).toLowerCase();
    const email = c.email?.toLowerCase() || "";
    const cidade = (c.cidade || "").toLowerCase();
    const id = c.id_cliente.toString();

    return (
      nome.includes(search) ||
      email.includes(search) ||
      cidade.includes(search) ||
      id.includes(search)
    );
  });

  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredClientes.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev + 1 >= filteredClientes.length ? 0 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev - 1 < 0 ? filteredClientes.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      if (activeIndex !== -1) {
        e.preventDefault();
        toggleRow(filteredClientes[activeIndex].id_cliente);
      }
    } else if (e.key === "Escape") {
      setSearchTerm("");
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-500">Clientes</h1>
          <p className="text-neutral-500">
            Gerencie sua base de clientes e contatos.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreateModal}>
          Novo Cliente
        </Button>
      </div>

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <Modal
          title={confirmModal.title}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div className="space-y-6">
            <p className="text-neutral-600">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Barra de Filtros */}
      <div className="bg-surface p-4 rounded-xl shadow-sm border border-neutral-200 flex gap-4">
        <Input
          variant="default"
          ref={searchInputRef}
          icon={Search}
          placeholder="Buscar por nome, email ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Tabela Moderna */}
      <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">
            Carregando dados...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">Localização</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredClientes.map((c, idx) => (
                  <Fragment key={c.id_cliente}>
                    <tr
                      className={`transition-colors hover:bg-neutral-25 cursor-pointer ${
                        idx === activeIndex
                          ? "bg-primary-50 ring-2 ring-primary-500 ring-inset"
                          : ""
                      }`}
                    >
                      <td
                        className="p-4 cursor-pointer"
                        onClick={() => toggleRow(c.id_cliente)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full transition-colors ${
                              expandedRows.has(c.id_cliente)
                                ? "bg-primary-100 text-white"
                                : "bg-primary-50 text-primary-600"
                            }`}
                          >
                            <User size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-neutral-500 block">
                              {getNome(c)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {c.email && (
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                              <Phone size={12} /> {c.telefone_1}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-neutral-500">
                            <Mail size={12} /> {c.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <MapPin size={14} className="text-neutral-400" />
                          {c.cidade}, {c.estado}
                        </div>
                        <span className="text-xs text-neutral-400 ml-6">
                          {c.bairro}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${
                            c.id_pessoa_juridica
                              ? "bg-accent-50 text-accent-600"
                              : "bg-primary-50 text-primary-600"
                          }`}
                        >
                          {c.id_pessoa_juridica ? "Jurídica" : "Física"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton
                            icon={Plus}
                            label="Add Veículo"
                            variant="primary"
                            onClick={() => handleRegisterVehicle(c.id_cliente)}
                          />
                          <ActionButton
                            icon={Edit}
                            label="Editar"
                            variant="neutral"
                            onClick={() => openEditModal(c)}
                          />
                          <ActionButton
                            icon={Trash2}
                            label="Excluir"
                            variant="danger"
                            onClick={() => handleDelete(c.id_cliente)}
                          />
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(c.id_cliente) && (
                      <tr className="bg-neutral-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                        <td colSpan={5} className="p-4 pt-0">
                          <div className="ml-12 border-l-2 border-primary-200 pl-6 py-2 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                                Veículos do Cliente ({c.veiculos?.length || 0})
                              </h4>
                              <button
                                onClick={() =>
                                  handleRegisterVehicle(c.id_cliente)
                                }
                                className="text-[10px] font-black text-primary-600 hover:underline uppercase"
                              >
                                + Adicionar Veículo
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {c.veiculos?.length ? (
                                c.veiculos.map((v) => (
                                  <div
                                    key={v.id_veiculo}
                                    className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between group hover:border-primary-300 transition-all"
                                  >
                                    <div>
                                      <p className="text-xs font-black text-neutral-500 tracking-widest uppercase">
                                        {v.placa}
                                      </p>
                                      <p className="text-[10px] text-neutral-500 font-bold uppercase">
                                        {v.marca} {v.modelo} • {v.cor}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/ordem-de-servico?clientId=${c.id_cliente}&vehicleId=${v.id_veiculo}`
                                          )
                                        }
                                        className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                        title="Abrir OS"
                                      >
                                        <Wrench size={14} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          openEditVehicleModal(v, c.id_cliente)
                                        }
                                        className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                        title="Editar Veículo"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteVehicle(v.id_veiculo)
                                        }
                                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Excluir Veículo"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-neutral-400 italic">
                                  Nenhum veículo cadastrado.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filteredClientes.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-neutral-400"
                    >
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVehicleModal && selectedClientIdForVehicle && (
        <Modal
          title={
            editingVehicle ? "Editar Veículo" : "Cadastrar Veículo para Cliente"
          }
          onClose={() => setShowVehicleModal(false)}
        >
          <VeiculoForm
            clientId={selectedClientIdForVehicle}
            vehicleId={editingVehicle?.id_veiculo}
            initialData={editingVehicle}
            onSuccess={() => {
              setShowVehicleModal(false);
              setEditingVehicle(null);
              loadClientes();
            }}
            onCancel={() => {
              setShowVehicleModal(false);
              setEditingVehicle(null);
            }}
          />
        </Modal>
      )}
      <div className="fixed bottom-8 right-8 z-100 min-w-[320px]">
        <StatusBanner
          msg={statusMsg}
          onClose={() => setStatusMsg({ type: null, text: "" })}
        />
      </div>
    </div>
  );
};
