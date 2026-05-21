import { useState, useEffect, useMemo } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import {
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Edit,
  Save,
  ArrowRight,
} from "lucide-react";
import { Modal, Button, Input, Select, ActionButton } from "../ui";

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
      const data = await FinanceiroService.getCategoriasFinanceiras();
      setCategories(data);
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
      await FinanceiroService.createCategoriaFinanceira({
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
      await FinanceiroService.deleteCategoriaFinanceira(id, {
        replacementCategory: replacement,
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
      await FinanceiroService.updateCategoriaFinanceira(id, {
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
            <Select
              label="Substituir por:"
              value={replacementCat}
              onChange={(e) => setReplacementCat(e.target.value)}
              className="mb-4"
            >
              {categories
                .filter((c) => c.id_categoria !== conflictData.id)
                .map((c) => (
                  <option key={c.id_categoria} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
            </Select>
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
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
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
            <div className="flex-1">
              <Input
                label="Nome"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nova categoria..."
                required
              />
            </div>
            <div className="w-32">
              <Select
                label="Tipo"
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value)}
              >
                <option value="AMBOS">Ambos</option>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </Select>
            </div>
            <div className="w-40">
              <Select
                label="Pai (Opcional)"
                value={newCatParentId}
                onChange={(e) =>
                  setNewCatParentId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              >
                <option value="">Nenhum</option>
                {potentialParents.map((p) => (
                  <option key={p.id_categoria} value={p.id_categoria}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="px-3 shrink-0 h-[46px]"
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
                      <div className="flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="py-1.5 px-3 text-sm h-9 font-bold"
                          autoFocus
                        />
                      </div>
                      <div className="w-28 shrink-0">
                        <Select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="py-1.5 px-3 text-sm h-9 font-bold"
                        >
                          <option value="AMBOS">Ambos</option>
                          <option value="ENTRADA">Entrada</option>
                          <option value="SAIDA">Saída</option>
                        </Select>
                      </div>
                      <ActionButton
                        icon={Save}
                        label="Salvar"
                        onClick={() => handleEdit(parent.id_categoria)}
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
                        <span className="font-bold text-neutral-800">
                          {parent.nome}
                        </span>
                        <span className="text-sm bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-bold">
                          {parent.tipo}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ActionButton
                          icon={Edit}
                          label="Editar"
                          onClick={() => startEditing(parent)}
                          variant="accent"
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Excluir"
                          onClick={() => setDeleteConfirmId(parent.id_categoria)}
                          variant="danger"
                        />
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
                          <div className="flex-1">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="py-1 px-2.5 text-sm h-8 font-medium"
                              autoFocus
                            />
                          </div>
                          {/* Child cannot change parent in this simple edit mode efficiently, just name/type */}
                          <ActionButton
                            icon={Save}
                            label="Salvar"
                            onClick={() => handleEdit(child.id_categoria)}
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
                            <ArrowRight
                              size={12}
                              className="text-neutral-400"
                            />
                            <span className="text-neutral-700 font-medium">
                              {child.nome}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover/child:opacity-100 transition-opacity">
                            <ActionButton
                              icon={Edit}
                              label="Editar"
                              onClick={() => startEditing(child)}
                              variant="accent"
                            />
                            <ActionButton
                              icon={Trash2}
                              label="Excluir"
                              onClick={() => setDeleteConfirmId(child.id_categoria)}
                              variant="danger"
                            />
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
