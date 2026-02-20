import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "../components/ui/PageLayout";
import { api } from "../services/api";
import { toast } from "react-toastify";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Tag,
  ChevronRight,
  X,
  Check,
} from "lucide-react";

// ─── Categorias protegidas do sistema (não podem ser editadas/excluídas) ───────
const CATEGORIAS_SISTEMA = [
  "Fornecedor / Pg. Fornecedor",
  "Fornecedor / Estoque",
  "Receita / Serviços",
  "Colaboradores / (Adiantamento, Comissão, Prêmio e Contrato)",
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Categoria {
  id_categoria: number;
  nome: string;
  tipo: "DESPESA" | "RECEITA" | "AMBOS";
  parentId: number | null;
}

const TIPO_LABELS: Record<string, string> = {
  DESPESA: "Despesa",
  RECEITA: "Receita",
  AMBOS: "Ambos",
};

const TIPO_COLORS: Record<string, string> = {
  DESPESA: "text-red-600 bg-red-50",
  RECEITA: "text-emerald-600 bg-emerald-50",
  AMBOS: "text-violet-600 bg-violet-50",
};

const emptyForm = {
  nome: "",
  tipo: "DESPESA" as Categoria["tipo"],
  parentId: "" as number | "",
};

// ─── Componente principal ──────────────────────────────────────────────────────
export const CategoriasPage = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Categoria | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/categoria-financeira");
      setCategorias(res.data);
    } catch {
      toast.error("Erro ao carregar categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isSistema = (cat: Categoria) => CATEGORIAS_SISTEMA.includes(cat.nome);

  const getCatPai = (parentId: number | null) =>
    parentId ? categorias.find((c) => c.id_categoria === parentId) : null;

  const catsPai = categorias.filter((c) => c.parentId === null);

  // ── Modal handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (cat: Categoria) => {
    setEditTarget(cat);
    setForm({
      nome: cat.nome,
      tipo: cat.tipo,
      parentId: cat.parentId ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.warning("Informe um nome para a categoria.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        parentId: form.parentId !== "" ? Number(form.parentId) : null,
      };

      if (editTarget) {
        await api.put(
          `/categoria-financeira/${editTarget.id_categoria}`,
          payload,
        );
        toast.success("Categoria atualizada.");
      } else {
        await api.post("/categoria-financeira", payload);
        toast.success("Categoria criada.");
      }

      closeModal();
      fetchCategorias();
    } catch {
      toast.error("Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/categoria-financeira/${deleteTarget.id_categoria}`);
      toast.success("Categoria excluída.");
      setDeleteTarget(null);
      fetchCategorias();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Erro ao excluir. Verifique se há lançamentos vinculados.";
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Categorias Financeiras"
      subtitle="Gerencie as categorias e subcategorias para classificação de receitas e despesas"
    >
      {/* Topo: Botão Nova Categoria */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-neutral-500">
          <span className="font-semibold text-neutral-700">
            {categorias.length}
          </span>{" "}
          categorias cadastradas
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold shadow-sm"
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-neutral-400">
            <div className="animate-spin w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-3" />
            Carregando...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3 text-left">Nome</th>
                <th className="px-5 py-3 text-left">Categoria Pai</th>
                <th className="px-5 py-3 text-left">Tipo</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {categorias.map((cat) => {
                const protegida = isSistema(cat);
                const pai = getCatPai(cat.parentId);
                return (
                  <tr
                    key={cat.id_categoria}
                    className={`hover:bg-neutral-50 transition-colors ${
                      protegida ? "opacity-80" : ""
                    }`}
                  >
                    {/* Nome */}
                    <td className="px-5 py-3.5 font-medium text-neutral-800">
                      <div className="flex items-center gap-2">
                        {cat.parentId ? (
                          <ChevronRight
                            size={14}
                            className="text-neutral-300 shrink-0"
                          />
                        ) : (
                          <Tag
                            size={14}
                            className="text-primary-400 shrink-0"
                          />
                        )}
                        {cat.nome}
                      </div>
                    </td>

                    {/* Pai */}
                    <td className="px-5 py-3.5 text-neutral-400 text-xs">
                      {pai ? (
                        pai.nome
                      ) : (
                        <span className="text-neutral-200">—</span>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          TIPO_COLORS[cat.tipo] ??
                          "text-neutral-500 bg-neutral-100"
                        }`}
                      >
                        {TIPO_LABELS[cat.tipo] ?? cat.tipo}
                      </span>
                    </td>

                    {/* Status / Badge Sistema */}
                    <td className="px-5 py-3.5 text-center">
                      {protegida ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                          <Shield size={11} />
                          Sistema
                        </span>
                      ) : (
                        <span className="text-neutral-200 text-xs">—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => !protegida && openEdit(cat)}
                          disabled={protegida}
                          title={
                            protegida
                              ? "Categoria do sistema — não editável"
                              : "Editar"
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            protegida
                              ? "text-neutral-200 cursor-not-allowed"
                              : "text-neutral-400 hover:text-primary-600 hover:bg-primary-50"
                          }`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => !protegida && setDeleteTarget(cat)}
                          disabled={protegida}
                          title={
                            protegida
                              ? "Categoria do sistema — não excluível"
                              : "Excluir"
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            protegida
                              ? "text-neutral-200 cursor-not-allowed"
                              : "text-neutral-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {categorias.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-neutral-400"
                  >
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Modal de Criação / Edição ─────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-800">
                {editTarget ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Ex: Aluguel, Combustível..."
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tipo: e.target.value as Categoria["tipo"],
                    }))
                  }
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 bg-white outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                  <option value="AMBOS">Ambos</option>
                </select>
              </div>

              {/* Categoria Pai (subcategoria) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Categoria Pai{" "}
                  <span className="normal-case font-normal text-neutral-400">
                    (opcional — para criar subcategoria)
                  </span>
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      parentId: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 bg-white outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="">Nenhuma (categoria raiz)</option>
                  {catsPai
                    .filter(
                      (c) =>
                        !editTarget ||
                        c.id_categoria !== editTarget.id_categoria,
                    )
                    .map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-neutral-100 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {editTarget ? "Salvar Alterações" : "Criar Categoria"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Delete ─────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 p-2.5 rounded-xl">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-800">
                  Excluir Categoria
                </h3>
                <p className="text-xs text-neutral-400">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 mb-5">
              Deseja excluir a categoria{" "}
              <strong className="text-neutral-800">
                &quot;{deleteTarget.nome}&quot;
              </strong>
              ? Se houver lançamentos vinculados, a operação será bloqueada.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
