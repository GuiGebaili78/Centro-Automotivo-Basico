import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { IVeiculo } from "../types/backend";
import { ClienteForm } from "../components/forms/ClienteForm";
import { VeiculoForm } from "../components/forms/VeiculoForm";
import { Modal } from "../components/ui/Modal";
import { Plus, Search, Trash2, Edit, Car, Wrench } from "lucide-react";
import { StatusBanner } from "../components/ui/StatusBanner";
import { ActionButton } from "../components/ui/ActionButton";
import { Input } from "../components/ui/input";

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
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
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
      // alert('Erro ao carregar veículos'); // Suppress initial load error alert to avoid noise if empty
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Veículo",
      message: "Tem certeza que deseja excluir este veículo?",
      onConfirm: async () => {
        try {
          await api.delete(`/veiculo/${id}`);
          setStatusMsg({
            type: "success",
            text: "Veículo removido com sucesso!",
          });
          setTimeout(() => setStatusMsg({ type: null, text: "" }), 3000);
          loadVeiculos();
        } catch (error) {
          setStatusMsg({
            type: "error",
            text: "Erro ao deletar veículo. Verifique se há O.S. vinculadas.",
          });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const openCreateModal = () => {
    navigate("/novo-cadastro");
  };

  const openEditModal = (vehicle: IVeiculo) => {
    setModalMode("vehicle");
    setEditingVehicle(vehicle);
    setSelectedClientId(null); // Not needed for edit usually, or implicitly part of vehicle
    setShowModal(true);
  };

  const filteredVeiculos = veiculos.filter(
    (v) =>
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-500">
            Gerenciar Veículos
          </h1>
          <p className="text-neutral-500">
            Cadastro e manutenção da frota de veículos.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary-900 hover:bg-primary-800 hover:scale-105 transition-all shadow-xl shadow-primary-500/20 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm"
        >
          <Plus size={20} />
          Novo Veículo
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-surface p-4 rounded-xl shadow-sm border border-neutral-200 flex gap-4">
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
      <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                <th className="p-4">Veículo</th>
                <th className="p-4">Placa</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredVeiculos.map((v, idx) => (
                <tr
                  key={v.id_veiculo}
                  className={`transition-colors hover:bg-neutral-25 ${
                    idx === activeIndex
                      ? "bg-primary-50 ring-2 ring-primary-500 ring-inset"
                      : ""
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                        <Car size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-500">
                          {v.marca} {v.modelo} {v.cor}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {v.ano_modelo} • {v.combustivel}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-neutral-500">
                    {v.placa}{" "}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-500">
                        {(v.cliente as any)?.pessoa_fisica?.pessoa?.nome ||
                          (v.cliente as any)?.pessoa_juridica?.nome_fantasia ||
                          "Cliente não identificado"}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {(v.cliente as any)?.pessoa_fisica?.pessoa?.telefone ||
                          (v.cliente as any)?.pessoa_juridica?.pessoa
                            ?.telefone ||
                          ""}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 justify-end">
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
                        onClick={() => handleDelete(v.id_veiculo)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVeiculos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-400">
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal
          title={confirmModal.title}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div className="space-y-6">
            <p className="text-neutral-600 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
              >
                Confirmar
              </button>
            </div>
          </div>
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
