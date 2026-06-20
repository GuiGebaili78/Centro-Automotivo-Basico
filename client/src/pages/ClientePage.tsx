import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Search, Plus } from "lucide-react";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { OsCreationModal } from "../components/os/OsCreationModal";

import { ClienteService } from "../services/cliente.service";
import { ClientesTable } from "../components/clientes/ClientesTable";
import type { ICliente } from "../types/cliente.types";

export const ClientePage = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // OS Modal State
  const [showOsModeModal, setShowOsModeModal] = useState(false);
  const [pendingOsData, setPendingOsData] = useState<{
    clientId: number;
    vehicleId: number;
  } | null>(null);

  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadClientes();
  }, [debouncedSearch, page, limit]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const res = await ClienteService.getAll({ page, limit, search: debouncedSearch });
      setClientes(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    try {
      await ClienteService.delete(id);
      toast.success("Cliente removido com sucesso!");
      setClientes((prev) => prev.filter((c) => c.id_cliente !== id));
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Erro ao excluir cliente: " +
          (error.response?.data?.error || "Verifique se existem dependências."),
      );
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
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <ClientesTable
            clientes={clientes}
            loading={loading}
            onDelete={handleDeleteClient}
            onOpenOsModal={(clientId, vehicleId) => {
              setPendingOsData({ clientId, vehicleId });
              setShowOsModeModal(true);
            }}
          />
        </div>
        {!loading && total > limit && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-white">
            <span className="text-sm text-neutral-500">
              Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} clientes
            </span>
            <div className="flex gap-2">
              <Button
                variant="neutral"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="neutral"
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Criação de OS */}
      <OsCreationModal
        isOpen={showOsModeModal}
        onClose={() => setShowOsModeModal(false)}
        hasVehicle={!!pendingOsData?.vehicleId}
        onSelect={(type, km) => {
          setShowOsModeModal(false);
          if (pendingOsData) {
            let url = `/ordem-de-servico?clientId=${pendingOsData.clientId}&vehicleId=${pendingOsData.vehicleId}&initialStatus=${type}`;
            if (km !== undefined) url += `&km=${km}`;
            navigate(url);
            setPendingOsData(null);
          }
        }}
      />
    </PageLayout>
  );
};
