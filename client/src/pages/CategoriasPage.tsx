import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "../components/ui/PageLayout";
import { CategoryManager } from "../components/shared/financeiro/CategoryManager";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";
import { toast } from "react-toastify";
import { ActionButton } from "../components/ui/ActionButton";
import { Plus, Pencil, Shield, Tag, ChevronRight } from "lucide-react";

// ─── Categorias protegidas do sistema ─────────────────────────────────────────
const CATEGORIAS_SISTEMA = [
  "Fornecedor / Pg. Fornecedor",
  "Fornecedor / Estoque",
  "Receita / Serviços",
  "Colaboradores / (Adiantamento, Comissão, Prêmio e Contrato)",
];

interface Categoria {
  id_categoria: number;
  nome: string;
  tipo: string;
  parentId: number | null;
}

const TIPO_LABELS: Record<string, string> = {
  DESPESA: "Despesa",
  RECEITA: "Receita",
  AMBOS: "Ambos",
  ENTRADA: "Entrada",
  SAIDA: "Saída",
};

const TIPO_COLORS: Record<string, string> = {
  DESPESA: "text-red-600 bg-red-50",
  RECEITA: "text-emerald-600 bg-emerald-50",
  AMBOS: "text-violet-600 bg-violet-50",
  ENTRADA: "text-emerald-600 bg-emerald-50",
  SAIDA: "text-red-600 bg-red-50",
};

// ─── Componente principal ──────────────────────────────────────────────────────
export const CategoriasPage = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Categorias Financeiras"
      subtitle="Gerencie as categorias e subcategorias para classificação de receitas e despesas"
      actions={
        <Button
          onClick={() => setIsManagerOpen(true)}
          variant="secondary"
          icon={Plus}
        >
          Nova Categoria
        </Button>
      }
    >
      {/* Modal CategoryManager — o mesmo usado em Contas a Pagar */}
      <CategoryManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        onUpdate={fetchCategorias}
      />

      {/* Topo: Resumo */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-neutral-500">
          <span className="font-semibold text-neutral-700">
            {categorias.length}
          </span>{" "}
          categorias cadastradas
        </p>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-neutral-400">
            <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-3" />
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
                      protegida ? "opacity-75" : ""
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
                          <Tag size={14} className="text-orange-400 shrink-0" />
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
                      <div className="flex items-center justify-end">
                        <ActionButton
                          onClick={() => setIsManagerOpen(true)}
                          icon={Pencil}
                          label="Gerenciar"
                          variant="accent"
                        />
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
    </PageLayout>
  );
};
