import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { EstoqueService } from "../services/estoque.service";
import type { IPecasEstoque } from "../types/estoque.types";
import { EstoqueTable } from "../components/estoque/EstoqueTable";
import { EdicaoPecaModal } from "../components/estoque/EdicaoPecaModal";

export const PecasEstoquePage = () => {
  const navigate = useNavigate();
  const [pecas, setPecas] = useState<IPecasEstoque[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<IPecasEstoque | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
    type: "warning" | "info" | "danger";
  }>({ show: false, title: "", msg: "", onConfirm: () => {}, type: "info" });

  useEffect(() => {
    loadPecas();
  }, []);

  const loadPecas = async () => {
    try {
      const data = await EstoqueService.getAll();
      setPecas(data);
    } catch (error) {
      toast.error("Erro ao carregar estoque.");
    }
  };

  const filteredPecas = pecas.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    // Safely access nested properties
    const lastEntry = (p as any).itens_entrada?.[0]?.entrada;
    const fornecedor =
      lastEntry?.fornecedor?.nome_fantasia || lastEntry?.fornecedor?.nome || "";

    return (
      p.nome.toLowerCase().includes(term) ||
      (p.descricao && p.descricao.toLowerCase().includes(term)) ||
      (p.fabricante && p.fabricante.toLowerCase().includes(term)) ||
      String(p.id_pecas_estoque).includes(term) ||
      (fornecedor && fornecedor.toLowerCase().includes(term))
    );
  });

  const handleOpenEdit = (p: IPecasEstoque) => {
    setEditData(p);
    setEditModalOpen(true);
  };

  const executeDelete = async () => {
    if (!editData) return;
    try {
      await EstoqueService.delete(editData.id_pecas_estoque);
      toast.success("Peça removida do sistema.");
      loadPecas();
      setEditModalOpen(false);
      setEditData(null);
    } catch (error) {
      toast.error("Erro ao deletar peça.");
    }
    setConfirmModal((prev) => ({ ...prev, show: false }));
  };

  const handleDeleteClick = (p: IPecasEstoque) => {
    setEditData(p); // Temporarily set editData for deletion context
    setConfirmModal({
      show: true,
      title: "Excluir Item",
      msg: "Tem certeza que deseja remover este item permanentemente?",
      type: "danger",
      onConfirm: executeDelete,
    });
  };

  return (
    <PageLayout
      title="Estoque de Peças"
      subtitle="Gerencie o inventário de peças e serviços."
      actions={
        <Button
          onClick={() => navigate("/entrada-estoque")}
          variant="primary"
          icon={Plus}
        >
          Nova Compra / Entrada
        </Button>
      }
    >
      <div className="space-y-6">
        {/* BUSCA UNIFICADA */}
        <div className="relative">
          <Input
            variant="default"
            icon={Search}
            placeholder="Buscar por nome, fabricante, descrição ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* TABELA */}
        <Card className="p-0 overflow-hidden border-neutral-200">
          <div className="overflow-x-auto">
            <EstoqueTable
              pecas={filteredPecas}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteClick}
            />
          </div>
        </Card>
      </div>

      {/* EDIT MODAL */}
      <EdicaoPecaModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        peca={editData}
        onSuccess={loadPecas}
        onDeleteRequest={(p) => {
          // Re-use logic for delete request confirm
          handleDeleteClick(p);
        }}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.msg}
        variant={confirmModal.type === "danger" ? "danger" : "primary"}
      />
    </PageLayout>
  );
};
