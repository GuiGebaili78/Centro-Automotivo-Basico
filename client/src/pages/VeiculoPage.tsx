import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { IVeiculo } from "../types/backend";
import { ClienteForm } from "../components/forms/ClienteForm";
import { VeiculoForm } from "../components/forms/VeiculoForm";
import { Modal } from "../components/ui/Modal";
import { Plus, Search, Trash2, Edit, Car, Wrench, Phone } from "lucide-react";
import { ActionButton } from "../components/ui/ActionButton";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/Button";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "react-toastify";

export const VeiculoPage = () => {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<IVeiculo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"vehicle" | "client">("vehicle");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<IVeiculo | undefined>(
    undefined,
  );
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Confirmation Modal State
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredVeiculos.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev + 1 >= filteredVeiculos.length ? 0 : prev + 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev - 1 < 0 ? filteredVeiculos.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      if (activeIndex !== -1) {
        e.preventDefault();
        openEditModal(filteredVeiculos[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setSearchTerm("");
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    loadVeiculos();
  }, []);

  const loadVeiculos = async () => {
    try {
      const response = await api.get("/veiculo");
      setVeiculos(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar veículos.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    try {
      await api.delete(`/veiculo/${confirmDeleteId}`);
      toast.success("Veículo removido com sucesso!");
      loadVeiculos();
    } catch (error) {
      toast.error("Erro ao deletar veículo. Verifique se há O.S. vinculadas.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const openCreateModal = () => {
    // navigate("/novo-cadastro"); // Original logic used navigate, let's keep it or use modal?
    // User code had: navigate("/novo-cadastro");
    // But this page has a Modal logic too?
    // Ah, line 108: navigate("/novo-cadastro").
    // Wait, the "Novo Veículo" button calls openCreateModal which does navigate.
    // BUT the page ALSO has <Modal> with <VeiculoForm>.
    // It seems the Modal logic is used for EDITING (openEditModal).
    // Let's stick to existing logic: Create -> Navigate. Edit -> Modal.
    navigate("/novo-cadastro");
  };

  const openEditModal = (vehicle: IVeiculo) => {
    setModalMode("vehicle");
    setEditingVehicle(vehicle);
    setSelectedClientId(null);
    setShowModal(true);
  };

  const filteredVeiculos = veiculos.filter((v) => {
    const s = searchTerm.toLowerCase();
    const placa = v.placa.toLowerCase();
    const modelo = v.modelo.toLowerCase();
    const marca = v.marca.toLowerCase();
    const cor = v.cor.toLowerCase();

    // Client data access
    const clientName = (
      (v.cliente as any)?.pessoa_fisica?.pessoa?.nome ||
      (v.cliente as any)?.pessoa_juridica?.nome_fantasia ||
      ""
    ).toLowerCase();
    const clientPhone1 = ((v.cliente as any)?.telefone_1 || "").toLowerCase();
    const clientPhone2 = ((v.cliente as any)?.telefone_2 || "").toLowerCase();
    const clientEmail = ((v.cliente as any)?.email || "").toLowerCase();

    return (
      placa.includes(s) ||
      modelo.includes(s) ||
      marca.includes(s) ||
      cor.includes(s) ||
      clientName.includes(s) ||
      clientPhone1.includes(s) ||
      clientPhone2.includes(s) ||
      clientEmail.includes(s)
    );
  });

  return (
    <PageLayout
      title="Gerenciar Veículos"
      actions={
        <Button onClick={openCreateModal} variant="primary" icon={Plus}>
          Novo Veículo
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Barra de Filtros */}
        <div className="mb-0">
          <Input
            variant="default"
            ref={searchInputRef}
            icon={Search}
            placeholder="Buscar por fabricante, modelo ou placa"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Tabela */}
        <Card className="border-neutral-200 overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="tabela-limpa">
              <thead>
                <tr>
                  <th className="w-[20%]">Veículo</th>
                  <th className="w-[15%]">Cor</th>
                  <th className="w-[15%]">Placa</th>
                  <th className="w-[20%]">Cliente</th>
                  <th className="w-[20%]">Contato</th>
                  <th className="w-[10%] text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVeiculos.map((v, idx) => (
                  <tr
                    key={v.id_veiculo}
                    className={`transition-colors hover:bg-neutral-25 group ${
                      idx === activeIndex ? "bg-primary-50" : ""
                    }`}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                          <Car size={18} />
                        </div>
                        <div className="font-bold text-neutral-700 tracking-tight text-sm uppercase">
                          {v.marca} {v.modelo}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-neutral-600 font-medium uppercase">
                      {v.cor}
                    </td>
                    <td className="font-mono font-bold text-primary-500 text-sm">
                      {v.placa}
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-500 text-sm">
                          {(v.cliente as any)?.pessoa_fisica?.pessoa?.nome ||
                            (v.cliente as any)?.pessoa_juridica
                              ?.nome_fantasia ||
                            "Cliente não identificado"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm text-neutral-700 font-medium">
                          <Phone size={14} className="text-neutral-400" />
                          {(v.cliente as any)?.telefone_1 || "-"}
                        </span>
                        {(v.cliente as any)?.email && (
                          <span className="text-xs text-neutral-500 pl-6">
                            {(v.cliente as any)?.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          icon={Edit}
                          label="Editar"
                          variant="neutral"
                          onClick={() => openEditModal(v)}
                        />
                        <ActionButton
                          icon={Wrench}
                          label="Abrir OS"
                          variant="accent"
                          onClick={() =>
                            navigate(
                              `/ordem-de-servico?clientId=${v.id_cliente}&vehicleId=${v.id_veiculo}`,
                            )
                          }
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDeleteId(v.id_veiculo)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVeiculos.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-neutral-400"
                    >
                      Nenhum veículo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {showModal && (
          <Modal
            title={
              modalMode === "client"
                ? "Novo Cliente"
                : editingVehicle
                  ? "Editar Veículo"
                  : "Novo Veículo"
            }
            onClose={() => setShowModal(false)}
          >
            {modalMode === "vehicle" ? (
              <VeiculoForm
                clientId={selectedClientId}
                vehicleId={editingVehicle?.id_veiculo}
                initialData={editingVehicle}
                onSuccess={() => {
                  setShowModal(false);
                  loadVeiculos();
                }}
                onCancel={() => setShowModal(false)}
                onCreateClient={() => setModalMode("client")}
              />
            ) : (
              <ClienteForm
                onSuccess={(newClient) => {
                  setSelectedClientId(newClient.id_cliente);
                  setModalMode("vehicle");
                }}
                onCancel={() => setModalMode("vehicle")}
              />
            )}
          </Modal>
        )}

        <ConfirmModal
          isOpen={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={handleDelete}
          title="Excluir Veículo"
          description="Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita."
          variant="danger"
        />
      </div>
    </PageLayout>
  );
};
