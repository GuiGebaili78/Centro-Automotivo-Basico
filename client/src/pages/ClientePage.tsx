import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Phone,
  User,
  Wrench,
  Car,
} from "lucide-react";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/Modal";
import { ActionButton } from "../components/ui/ActionButton";
import { VeiculoForm } from "../components/forms/VeiculoForm";
import { Badge } from "../components/ui/Badge";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export const ClientePage = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedClientIdForVehicle, setSelectedClientIdForVehicle] = useState<
    number | null
  >(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClientes();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/cliente");
      setClientes(response.data);
    } catch (error) {
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/cliente/${confirmDeleteId}`);
      toast.success("Cliente removido com sucesso!");
      setClientes((prev) =>
        prev.filter((c) => c.id_cliente !== confirmDeleteId),
      );
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Erro ao excluir cliente: " +
          (error.response?.data?.error || "Verifique se existem dependências."),
      );
      setConfirmDeleteId(null);
    }
  };

  const getNome = (c: any) =>
    c.pessoa_fisica?.pessoa.nome ||
    c.pessoa_juridica?.razao_social ||
    "Nome Indisponível";

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const filteredClientes = clientes.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      getNome(c).toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s) ||
      (c.cidade || "").toLowerCase().includes(s)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredClientes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev + 1 >= filteredClientes.length ? 0 : prev + 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev - 1 < 0 ? filteredClientes.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter" && activeIndex !== -1) {
      e.preventDefault();
      toggleRow(filteredClientes[activeIndex].id_cliente);
    }
  };

  return (
    <PageLayout
      title="Gestão de Clientes"
      actions={
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => navigate("/novo-cadastro")}
        >
          Novo Cliente
        </Button>
      }
    >
      <div className="mb-8">
        <Input
          label=""
          ref={searchInputRef}
          icon={Search}
          placeholder="Buscar por nome, email ou localização..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tabela-limpa w-full">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Localização</th>
                <th>Tipo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    Carregando registros...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((c, idx) => (
                  <Fragment key={c.id_cliente}>
                    <tr
                      className={`
                        group border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-all cursor-pointer
                        ${idx === activeIndex ? "bg-primary-50 ring-1 ring-inset ring-primary-200" : ""}
                        ${expandedRows.has(c.id_cliente) ? "bg-neutral-50" : ""}
                      `}
                      onClick={() => toggleRow(c.id_cliente)}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center transition-colors
                              ${
                                expandedRows.has(c.id_cliente)
                                  ? "bg-primary-600 text-white shadow-md"
                                  : "bg-primary-50 text-primary-600 group-hover:bg-white group-hover:shadow-sm"
                              }
                            `}
                          >
                            <User size={18} />
                          </div>
                          <span className="font-bold text-neutral-900 text-sm">
                            {getNome(c)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 text-sm text-neutral-700 font-medium">
                            <Phone size={14} className="text-neutral-400" />
                            {c.telefone_1}
                          </span>
                          {c.email && (
                            <span className="text-xs text-neutral-500 pl-6">
                              {c.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <MapPin size={14} className="text-neutral-400" />
                          {c.cidade}, {c.estado}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant={
                            c.id_pessoa_juridica ? "secondary" : "primary"
                          }
                        >
                          {c.id_pessoa_juridica
                            ? "Pessoa Jurídica"
                            : "Pessoa Física"}
                        </Badge>
                      </td>
                      <td
                        className="text-right py-4 pr-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            icon={Plus}
                            variant="primary"
                            label="Novo Veículo"
                            onClick={() => {
                              setSelectedClientIdForVehicle(c.id_cliente);
                              setShowVehicleModal(true);
                            }}
                          />
                          <ActionButton
                            icon={Edit}
                            variant="neutral"
                            label="Editar Cliente"
                            onClick={() =>
                              navigate(`/cadastro/${c.id_cliente}`)
                            }
                          />
                          <ActionButton
                            icon={Trash2}
                            variant="danger"
                            label="Excluir"
                            onClick={() => setConfirmDeleteId(c.id_cliente)}
                          />
                        </div>
                      </td>
                    </tr>

                    {expandedRows.has(c.id_cliente) && (
                      <tr className="bg-neutral-50/50 shadow-inner">
                        <td colSpan={5} className="p-0">
                          <div className="px-16 py-6 border-l-4 border-primary-500 ml-5 my-2">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Car size={18} className="text-primary-600" />
                                <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-widest">
                                  Veículos Cadastrados (
                                  {c.veiculos?.length || 0})
                                </h4>
                              </div>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={Plus}
                                onClick={() => {
                                  setSelectedClientIdForVehicle(c.id_cliente);
                                  setShowVehicleModal(true);
                                }}
                              >
                                Novo Veículo
                              </Button>
                            </div>

                            {!c.veiculos || c.veiculos.length === 0 ? (
                              <p className="text-sm text-neutral-400 italic">
                                Nenhum veículo vinculado a este cliente.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {c.veiculos?.map((v: any) => (
                                  <div
                                    key={v.id_veiculo}
                                    className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group/card flex justify-between items-start"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-success"></div>
                                        <p className="text-sm font-bold text-neutral-900">
                                          {v.placa}
                                        </p>
                                      </div>
                                      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">
                                        {v.marca} {v.modelo}
                                      </p>
                                      <p className="text-[10px] text-neutral-400 mt-1">
                                        {v.ano_modelo || "Ano N/A"} •{" "}
                                        {v.cor || "Cor N/A"}
                                      </p>
                                    </div>
                                    <ActionButton
                                      icon={Wrench}
                                      variant="primary"
                                      label="Abrir OS"
                                      className="opacity-0 group-hover/card:opacity-100 transition-opacity"
                                      onClick={() =>
                                        navigate(
                                          `/ordem-de-servico?clientId=${c.id_cliente}&vehicleId=${v.id_veiculo}`,
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showVehicleModal && (
        <Modal title="Novo Veículo" onClose={() => setShowVehicleModal(false)}>
          <VeiculoForm
            clientId={selectedClientIdForVehicle!}
            onSuccess={() => {
              setShowVehicleModal(false);
              loadClientes();
              toast.success("Veículo cadastrado com sucesso!");
            }}
            onCancel={() => setShowVehicleModal(false)}
          />
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteClient}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? Essa ação removerá também os veículos associados e pode impedir o acesso a históricos antigos."
        variant="danger"
      />
    </PageLayout>
  );
};
