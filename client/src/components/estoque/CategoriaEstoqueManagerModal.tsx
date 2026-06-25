import { useState, useEffect } from "react";
import {
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Edit,
  Save,
} from "lucide-react";
import { Modal, Button, Input, ActionButton } from "../ui";
import { CategoriaEstoqueService, type ICategoriaEstoque } from "../../services/categoriaEstoque.service";

interface CategoriaEstoqueManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const CategoriaEstoqueManagerModal = ({
  isOpen,
  onClose,
  onUpdate,
}: CategoriaEstoqueManagerModalProps) => {
  const [categories, setCategories] = useState<ICategoriaEstoque[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(false);

  // Conflict Resolution State
  const [conflictData, setConflictData] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [replacementCatName, setReplacementCatName] = useState("");

  // Editing State
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  // UI State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setConflictData(null);
      setReplacementCatName("");
      setEditingCatId(null);
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const data = await CategoriaEstoqueService.getAll();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setLoading(true);
      await CategoriaEstoqueService.create(newCatName);
      setNewCatName("");
      loadCategories();
      onUpdate();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar categoria. Talvez já exista.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, replacementName?: string) => {
    try {
      await CategoriaEstoqueService.delete(id, replacementName);

      setConflictData(null);
      setReplacementCatName("");
      setDeleteConfirmId(null);
      loadCategories();
      onUpdate();
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setDeleteConfirmId(null);
        setConflictData({
          id,
          message: error.response.data.message || "Categoria em uso.",
        });

        // Find a default replacement (not the one being deleted)
        const firstAvailable = categories.find((c) => c.id_categoria !== id);
        if (firstAvailable) setReplacementCatName(firstAvailable.nome);
      } else {
        console.error(error);
        alert("Erro ao deletar categoria.");
      }
    }
  };

  const startEditing = (cat: ICategoriaEstoque) => {
    setEditingCatId(cat.id_categoria);
    setEditName(cat.nome);
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await CategoriaEstoqueService.update(id, editName);
      setEditingCatId(null);
      loadCategories();
      onUpdate();
    } catch (error) {
      console.error(error);
      alert("Erro ao editar categoria. Talvez já exista uma com este nome.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Gerenciar Categorias de Estoque" onClose={onClose} className="max-w-lg">
      {conflictData ? (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6">
          <div className="flex items-center gap-3 text-orange-600 mb-2">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Ação bloqueada</h3>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            {conflictData.message}
          </p>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Substituir por:
            </label>
            <select
              value={replacementCatName}
              onChange={(e) => setReplacementCatName(e.target.value)}
              className="w-full border-neutral-200 rounded-lg bg-white h-10 px-3 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow"
            >
              {categories
                .filter((c) => c.id_categoria !== conflictData.id)
                .map((c) => (
                  <option key={c.id_categoria} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setConflictData(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleDelete(conflictData.id, replacementCatName)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
            >
              Confirmar Troca
            </Button>
          </div>
        </div>
      ) : deleteConfirmId ? (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <Trash2 size={20} />
            <h3 className="font-bold">Excluir Categoria?</h3>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            Esta ação não pode ser desfeita. Se houver peças vinculadas, você precisará escolher uma categoria substituta no próximo passo.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(deleteConfirmId)}
              className="flex-1"
            >
              Sim, Excluir
            </Button>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleAdd} className="flex gap-2 mb-6 items-end">
            <div className="flex-1">
              <Input
                label="Nova Categoria"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Filtros, Lâmpadas..."
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="px-4 shrink-0 h-[46px]"
              icon={Plus}
            >
              Criar
            </Button>
          </form>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <div
                key={cat.id_categoria}
                className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl border border-neutral-200 group hover:border-primary-200 transition-colors"
              >
                {editingCatId === cat.id_categoria ? (
                  <div className="flex gap-2 w-full items-center">
                    <div className="flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="py-1.5 px-3 text-sm h-9 font-bold"
                        autoFocus
                      />
                    </div>
                    <ActionButton
                      icon={Save}
                      label="Salvar"
                      onClick={() => handleEdit(cat.id_categoria)}
                      variant="accent"
                    />
                    <ActionButton
                      icon={X}
                      label="Cancelar"
                      onClick={() => setEditingCatId(null)}
                      variant="neutral"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800 text-sm uppercase tracking-wide">
                        {cat.nome}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <ActionButton
                        icon={Edit}
                        label="Editar"
                        onClick={() => startEditing(cat)}
                        variant="accent"
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Excluir"
                        onClick={() => setDeleteConfirmId(cat.id_categoria)}
                        variant="danger"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-neutral-400 text-sm py-8 italic border border-dashed border-neutral-200 rounded-xl">
                Nenhuma categoria cadastrada.
              </p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};
