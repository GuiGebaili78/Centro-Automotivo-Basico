import { useState, useEffect, useMemo } from "react";
import { api } from "../../services/api";
import {
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Edit,
  Save,
  ArrowRight,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface Category {
  id_categoria: number;
  nome: string;
  tipo: string;
  parentId: number | null;
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
  const [newCatParentId, setNewCatParentId] = useState<number | "">("");
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
  const [editParentId, setEditParentId] = useState<number | "">("");

  // UI State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
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

  const hierarchy = useMemo(() => {
    const parents = categories.filter((c) => !c.parentId);
    return parents.map((parent) => ({
      ...parent,
      children: categories.filter((c) => c.parentId === parent.id_categoria),
    }));
  }, [categories]);

  const potentialParents = useMemo(() => {
    // Only show categories that are NOT children themselves (2 levels max for simplicity, or just prevent loops)
    // For this simple implementation, any category without a parent can be a parent.
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/categoria-financeira", {
        nome: newCatName,
        tipo: newCatType,
        parentId: newCatParentId === "" ? null : newCatParentId,
      });
      setNewCatName("");
      setNewCatParentId("");
      loadCategories();
      onUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, replacement?: string) => {
    try {
      await api.delete(`/categoria-financeira/${id}`, {
        data: { replacementCategory: replacement },
      });

      setConflictData(null);
      setReplacementCat("");
      setDeleteConfirmId(null);
      loadCategories();
      onUpdate();
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setDeleteConfirmId(null);
        setConflictData({
          id,
          message: error.response.data.message,
          count: error.response.data.usageCount,
        });

        // Find a default replacement (not the one being deleted, and preferably same type)
        const current = categories.find((c) => c.id_categoria === id);
        const firstAvailable = categories.find(
          (c) =>
            c.id_categoria !== id &&
            (!current || c.tipo === current.tipo || c.tipo === "AMBOS"),
        );
        if (firstAvailable) setReplacementCat(firstAvailable.nome);
      } else {
        console.error(error);
      }
    }
  };

  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id_categoria);
    setEditName(cat.nome);
    setEditType(cat.tipo);
    setEditParentId(cat.parentId || "");
  };

  const handleEdit = async (id: number) => {
    try {
      await api.put(`/categoria-financeira/${id}`, {
        nome: editName,
        tipo: editType,
        parentId: editParentId === "" ? null : editParentId,
      });
      setEditingCatId(null);
      loadCategories();
      onUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Gerenciar Categorias" onClose={onClose} className="max-w-xl">
      {conflictData ? (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6">
          <div className="flex items-center gap-3 text-orange-600 mb-2">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Ação bloqueada</h3>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            {conflictData.message}
          </p>

          {!conflictData.message.includes("subcategorias") && (
            <>
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
            </>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setConflictData(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            {!conflictData.message.includes("subcategorias") && (
              <Button
                onClick={() => handleDelete(conflictData.id, replacementCat)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-neutral-25 shadow-orange-200"
              >
                Confirmar Troca
              </Button>
            )}
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
          <form onSubmit={handleAdd} className="flex gap-2 mb-6 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-neutral-500 ml-1">
                Nome
              </label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nova categoria..."
                required
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-xs font-medium text-neutral-500 ml-1">
                Tipo
              </label>
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
            <div className="w-40 space-y-1">
              <label className="text-xs font-medium text-neutral-500 ml-1">
                Pai (Opcional)
              </label>
              <select
                value={newCatParentId}
                onChange={(e) =>
                  setNewCatParentId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                className="w-full bg-neutral-50 border border-neutral-200 p-[11px] rounded-xl font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer"
              >
                <option value="">Nenhum</option>
                {potentialParents.map((p) => (
                  <option key={p.id_categoria} value={p.id_categoria}>
                    {p.nome}
                  </option>
                ))}
              </select>
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

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {hierarchy.map((parent) => (
              <div key={parent.id_categoria} className="space-y-1">
                {/* Parent Row */}
                <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl border border-neutral-200 group hover:border-primary-200 transition-colors">
                  {editingCatId === parent.id_categoria ? (
                    <div className="flex gap-2 w-full items-center">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white border border-neutral-300 p-2 rounded-lg font-bold text-sm outline-none focus:border-primary-500"
                        autoFocus
                      />
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-24 bg-white border border-neutral-300 p-2 rounded-lg font-bold text-sm outline-none"
                      >
                        <option value="AMBOS">Ambos</option>
                        <option value="ENTRADA">Entrada</option>
                        <option value="SAIDA">Saída</option>
                      </select>
                      <button
                        onClick={() => handleEdit(parent.id_categoria)}
                        className="text-green-600 p-2 hover:bg-green-50 rounded"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="text-neutral-500 p-2 hover:bg-neutral-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-800">
                          {parent.nome}
                        </span>
                        <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-bold">
                          {parent.tipo}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(parent)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirmId(parent.id_categoria)
                          }
                          className="p-2 hover:bg-red-50 text-red-600 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Children Rows */}
                <div className="ml-6 space-y-1 border-l-2 border-neutral-100 pl-3">
                  {parent.children.map((child) => (
                    <div
                      key={child.id_categoria}
                      className="flex justify-between items-center p-2 bg-white rounded-lg border border-neutral-100 group/child hover:border-neutral-300 transition-colors text-sm"
                    >
                      {editingCatId === child.id_categoria ? (
                        <div className="flex gap-2 w-full items-center">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 bg-white border border-neutral-300 p-1.5 rounded font-medium outline-none focus:border-primary-500"
                            autoFocus
                          />
                          {/* Child cannot change parent in this simple edit mode efficiently, just name/type */}
                          <button
                            onClick={() => handleEdit(child.id_categoria)}
                            className="text-green-600 p-1.5 hover:bg-green-50 rounded"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="text-neutral-500 p-1.5 hover:bg-neutral-100 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <ArrowRight
                              size={12}
                              className="text-neutral-400"
                            />
                            <span className="text-neutral-700 font-medium">
                              {child.nome}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover/child:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(child)}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirmId(child.id_categoria)
                              }
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
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
