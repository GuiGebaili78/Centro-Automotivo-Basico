import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Trash2, Plus, X, AlertTriangle, Edit, Save } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface Category {
  id_categoria: number;
  nome: string;
  tipo: string;
}

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const CategoryManager = ({
  isOpen,
  onClose,
  onUpdate,
}: CategoryManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("AMBOS");
  const [loading, setLoading] = useState(false);

  // Conflict Resolution State
  const [conflictData, setConflictData] = useState<{
    id: number;
    message: string;
    count: number;
  } | null>(null);
  const [replacementCat, setReplacementCat] = useState("");

  // Editing State
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("AMBOS");

  // UI State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories(); // This will hit the backend which now syncs
      setConflictData(null);
      setReplacementCat("");
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const res = await api.get("/categoria-financeira");
      setCategories(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/categoria-financeira", {
        nome: newCatName,
        tipo: newCatType,
      });
      setNewCatName("");
      loadCategories();
      onUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, replacement?: string) => {
    // Direct delete (called from confirm UI)
    try {
      // Need to pass replacement in body if it exists. Note: axios delete config for body is distinct.
      await api.delete(`/categoria-financeira/${id}`, {
        data: { replacementCategory: replacement },
      });

      // Success
      setConflictData(null);
      setReplacementCat("");
      setDeleteConfirmId(null);
      loadCategories();
      onUpdate();
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setDeleteConfirmId(null); // Close simple delete confirm
        setConflictData({
          id,
          message: error.response.data.message,
          count: error.response.data.usageCount,
        });
        // Set default replacement to first available
        const firstAvailable = categories.find((c) => c.id_categoria !== id);
        if (firstAvailable) setReplacementCat(firstAvailable.nome);
      } else {
        console.error(error);
      }
    } finally {
      // clean up state if needed
    }
  };

  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id_categoria);
    setEditName(cat.nome);
    setEditType(cat.tipo);
  };

  const handleEdit = async (id: number) => {
    try {
      // Optimistic update for UI responsiveness
      setCategories(
        categories.map((c) =>
          c.id_categoria === id ? { ...c, nome: editName, tipo: editType } : c,
        ),
      );
      setEditingCatId(null);

      await api.put(`/categoria-financeira/${id}`, {
        nome: editName,
        tipo: editType,
      });
      loadCategories();
      onUpdate();
    } catch (error) {
      console.error(error);
      loadCategories(); // Revert on error
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Gerenciar Categorias" onClose={onClose} className="max-w-md">
      {conflictData ? (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6">
          <div className="flex items-center gap-3 text-orange-600 mb-2">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Categoria em uso</h3>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            {conflictData.message}
          </p>

          <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
            Substituir por:
          </label>
          <select
            value={replacementCat}
            onChange={(e) => setReplacementCat(e.target.value)}
            className="w-full bg-white border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-orange-300 mb-4"
          >
            {categories
              .filter((c) => c.id_categoria !== conflictData.id)
              .map((c) => (
                <option key={c.id_categoria} value={c.nome}>
                  {c.nome}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setConflictData(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleDelete(conflictData.id, replacementCat)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-neutral-25 shadow-orange-200"
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
            Esta ação não pode ser desfeita. Se houver lançamentos vinculados,
            você precisará escolher um substituto.
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
          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <div className="flex-1">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nova categoria..."
                required
              />
            </div>
            <div className="w-24">
              <div className="relative">
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 p-[11px] rounded-xl font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer"
                >
                  <option value="AMBOS">Ambos</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="px-3"
              icon={Plus}
            >
              Criar
            </Button>
          </form>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <div
                key={cat.id_categoria}
                className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl border border-neutral-100 group hover:border-neutral-200 transition-colors"
              >
                {editingCatId === cat.id_categoria ? (
                  <div className="flex gap-2 w-full">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-white border border-neutral-300 p-2 rounded-lg font-bold text-sm outline-none focus:border-primary-500"
                      autoFocus
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-24 bg-white border border-neutral-300 p-2 rounded-lg font-bold text-sm outline-none focus:border-primary-500"
                    >
                      <option value="AMBOS">Ambos</option>
                      <option value="ENTRADA">Entrada</option>
                      <option value="SAIDA">Saída</option>
                    </select>
                    <button
                      onClick={() => handleEdit(cat.id_categoria)}
                      className="bg-green-500 text-neutral-25 p-2 rounded-lg hover:bg-green-600 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => setEditingCatId(null)}
                      className="bg-neutral-200 text-neutral-600 p-2 rounded-lg hover:bg-neutral-300 transition-all hover:scale-105 active:scale-95"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-bold text-neutral-800">{cat.nome}</p>
                      <p className="text-[10px] uppercase font-bold text-neutral-400">
                        {cat.tipo}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(cat)}
                        className="text-neutral-300 hover:text-primary-500 transition-colors p-2 hover:bg-primary-50 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(cat.id_categoria)}
                        className="text-neutral-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-neutral-400 text-sm py-4">
                Nenhuma categoria cadastrada.
              </p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};
