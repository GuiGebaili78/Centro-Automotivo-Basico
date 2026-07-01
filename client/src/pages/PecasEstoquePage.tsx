import { useState, useEffect } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { EstoqueService } from "../services/estoque.service";
import type { IPecasEstoque } from "../types/backend";
import { EstoqueTable } from "../components/estoque/EstoqueTable";
import { CategoriaCombobox } from "../components/estoque/CategoriaCombobox";
import {
  CategoriaEstoqueService,
  type ICategoriaEstoque,
} from "../services/categoriaEstoque.service";

const PAGE_LIMIT = 25;

export const PecasEstoquePage = () => {
  const navigate = useNavigate();
  const [pecas, setPecas] = useState<IPecasEstoque[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categorias, setCategorias] = useState<ICategoriaEstoque[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<number | "">("");
  const [isSearching, setIsSearching] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
    type: "warning" | "info" | "danger";
  }>({ show: false, title: "", msg: "", onConfirm: () => {}, type: "info" });

  useEffect(() => {
    loadCategorias();
  }, []);

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedTipo]);

  // Busca com debounce a cada mudança de filtros ou página
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPecas(page);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedTipo, page]);

  const loadCategorias = async () => {
    try {
      const data = await CategoriaEstoqueService.getAll();
      setCategorias(data);
    } catch (error) {
      console.error("Erro ao carregar categorias", error);
    }
  };

  const loadPecas = async (targetPage: number) => {
    setIsSearching(true);
    try {
      const result = await EstoqueService.getAll(
        targetPage,
        PAGE_LIMIT,
        searchTerm || undefined,
        selectedTipo === "" ? undefined : Number(selectedTipo)
      );

      // Salto direto para a última página com dados (evita loop de requisições)
      if (result.data.length === 0 && targetPage > 1) {
        const lastValidPage = Math.max(1, Math.ceil(result.total / PAGE_LIMIT));
        setPage(lastValidPage);
        // Não chama loadPecas novamente aqui — o useEffect reage à mudança de page
        return;
      }

      setPecas(result.data);
      setTotal(result.total);
    } catch (error) {
      toast.error("Erro ao carregar estoque.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenEdit = (p: IPecasEstoque) => {
    navigate(`/pecas-estoque/${p.id_pecas_estoque}`);
  };

  const executeDelete = async (p: IPecasEstoque) => {
    try {
      await EstoqueService.delete(p.id_pecas_estoque);
      toast.success("Peça removida do sistema.");
      // Recarregar a página atual — o salto automático trata o caso da página esvaziar
      loadPecas(page);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Erro ao deletar peça.";
      toast.error(msg);
    }
    setConfirmModal((prev) => ({ ...prev, show: false }));
  };

  const handleDeleteClick = (p: IPecasEstoque) => {
    setConfirmModal({
      show: true,
      title: "Excluir Item",
      msg: "Tem certeza que deseja remover este item permanentemente?",
      type: "danger",
      onConfirm: () => executeDelete(p),
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
        {/* BUSCA E FILTROS */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-1/4">
            <CategoriaCombobox
              categorias={categorias}
              selectedId={selectedTipo === "" ? null : Number(selectedTipo)}
              onChange={(val) => setSelectedTipo(val === null ? "" : val)}
            />
          </div>

          <div className="relative flex-1 w-full">
            <Input
              icon={Search}
              placeholder="Buscar por nome, fabricante, modelo, localização (ex: Prateleira)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {(searchTerm !== "" || selectedTipo !== "") && (
            <div className="shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTipo("");
                }}
                className="text-neutral-500 hover:text-neutral-700 h-[46px]"
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>

        {/* TABELA */}
        <Card className="p-0 overflow-hidden border-neutral-200">
          <div className="overflow-x-auto">
            <EstoqueTable
              pecas={pecas}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteClick}
            />
          </div>

          {/* PAGINAÇÃO */}
          {total > 0 && (
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-4">
              <span className="text-sm text-neutral-500">
                {isSearching ? (
                  "Carregando..."
                ) : (
                  <>
                    Página <strong>{page}</strong> de{" "}
                    <strong>{totalPages}</strong> —{" "}
                    <strong>{total}</strong>{" "}
                    {total === 1 ? "item" : "itens"}
                  </>
                )}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  icon={ChevronLeft}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isSearching}
                  className="h-9 px-3 text-sm"
                >
                  Anterior
                </Button>

                {/* Indicador de página atual */}
                <span className="text-sm font-medium text-neutral-700 min-w-[60px] text-center">
                  {page} / {totalPages}
                </span>

                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isSearching}
                  className="h-9 px-3 text-sm flex-row-reverse"
                  icon={ChevronRight}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

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
