import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Search, Plus } from "lucide-react";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { OsCreationModal } from "../components/shared/os/OsCreationModal";

import { ClienteService } from "../services/cliente.service";
import { ClientesTable } from "../components/clientes/ClientesTable";
import type { ICliente } from "../types/cliente.types";

export const ClientePage = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // OS Modal State
  const [showOsModeModal, setShowOsModeModal] = useState(false);
  const [pendingOsData, setPendingOsData] = useState<{
    clientId: number;
    vehicleId: number;
  } | null>(null);

  useEffect(() => {
    loadClientes();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await ClienteService.getAll();
      setClientes(data);
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

  const getNome = (c: any) =>
    c.pessoa_fisica?.pessoa.nome ||
    c.pessoa_juridica?.razao_social ||
    "Nome Indisponível";

  const filteredClientes = clientes.filter((c) => {
    const s = searchTerm.toLowerCase();
    const nome = getNome(c).toLowerCase();
    const email = (c.email || "").toLowerCase();
    const cidade = (c.cidade || "").toLowerCase();
    const estado = (c.estado || "").toLowerCase();
    const telefone1 = (c.telefone_1 || "").toLowerCase();
    const tipo = c.id_pessoa_juridica ? "juridica jurídica" : "fisica física";

    return (
      nome.includes(s) ||
      email.includes(s) ||
      cidade.includes(s) ||
      estado.includes(s) ||
      telefone1.includes(s) ||
      tipo.includes(s)
    );
  });

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
            clientes={filteredClientes}
            loading={loading}
            onDelete={handleDeleteClient}
            onOpenOsModal={(clientId, vehicleId) => {
              setPendingOsData({ clientId, vehicleId });
              setShowOsModeModal(true);
            }}
          />
        </div>
      </Card>

      {/* Modal de Criação de OS */}
      <OsCreationModal
        isOpen={showOsModeModal}
        onClose={() => setShowOsModeModal(false)}
        onSelect={(type) => {
          setShowOsModeModal(false);
          if (pendingOsData) {
            navigate(
              `/ordem-de-servico?clientId=${pendingOsData.clientId}&vehicleId=${pendingOsData.vehicleId}&initialStatus=${type}`,
            );
            setPendingOsData(null);
          }
        }}
      />
    </PageLayout>
  );
};
