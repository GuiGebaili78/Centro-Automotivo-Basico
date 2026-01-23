import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { CategoryManager } from "../components/financeiro/CategoryManager";
import {
  ArrowLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Search,
  Calendar,
  Wallet,
  ArrowRight,
  Settings,
} from "lucide-react";
import type { IContaBancaria } from "../types/backend";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/Modal";

export const ExtratoBancarioPage = () => {
  const { idConta } = useParams();
  const navigate = useNavigate();

  // State
  const [conta, setConta] = useState<IContaBancaria | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0], // Last 30 days
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    tipo_movimentacao: "SAIDA",
    categoria: "OUTROS",
    obs: "",
  });

  useEffect(() => {
    if (idConta) {
      loadData();
      loadCategories();
    }
  }, [idConta]);

  const loadCategories = async () => {
    try {
      const res = await api.get("/categoria-financeira");
      setCategories(res.data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [contaRes, movRes] = await Promise.all([
        api.get("/conta-bancaria"),
        api.get("/livro-caixa"),
      ]);

      const contaFound = contaRes.data.find(
        (c: any) => c.id_conta === Number(idConta),
      );
      setConta(contaFound || null);

      // 1. Livro Caixa (Manuais ou Automáticos que geraram registro) - FONTE ÚNICA
      const entriesLivro = movRes.data
        .filter((m: any) => m.id_conta_bancaria === Number(idConta))
        .map((m: any) => ({
          id: `cx-${m.id_livro_caixa}`,
          id_livro_caixa: m.id_livro_caixa,
          dt_movimentacao: m.dt_movimentacao,
          descricao: m.descricao,
          categoria: m.categoria,
          tipo_movimentacao: m.tipo_movimentacao,
          valor: Number(m.valor),
          obs: m.obs || "",
          deleted_at: m.deleted_at,
          origem: "LIVRO_CAIXA",
          paymentMethod:
            m.categoria === "CONCILIACAO_CARTAO"
              ? "CARTÃO"
              : m.descricao.includes("PIX")
                ? "PIX"
                : m.origem === "MANUAL"
                  ? "MANUAL"
                  : "OUTROS",
        }));

      const allMovs = entriesLivro.sort(
        (a: any, b: any) =>
          new Date(b.dt_movimentacao).getTime() -
          new Date(a.dt_movimentacao).getTime(),
      );

      setMovimentacoes(allMovs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Apply Filters
  const filteredMovimentacoes = movimentacoes.filter((mov) => {
    const matchesSearch =
      mov.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov.obs && mov.obs.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory
      ? mov.categoria === selectedCategory
      : true;
    const matchesType = selectedType
      ? mov.tipo_movimentacao === selectedType
      : true;

    const movDate = new Date(mov.dt_movimentacao).toISOString().split("T")[0];
    const matchesDate =
      (!dateRange.start || movDate >= dateRange.start) &&
      (!dateRange.end || movDate <= dateRange.end);

    return matchesSearch && matchesCategory && matchesType && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div className="p-8 text-center bg-surface min-h-screen">
        <h2 className="text-xl font-bold text-neutral-800">
          Conta não encontrada
        </h2>
        <Button
          onClick={() => navigate("/financeiro/livro-caixa")}
          variant="ghost"
          className="mt-4"
        >
          Voltar
        </Button>
      </div>
    );
  }

  // Apply Totals (Based on Filtered Data)
  const totalEntradas = filteredMovimentacoes
    .filter((m) => m.tipo_movimentacao === "ENTRADA")
    .reduce((acc: any, m: any) => acc + Number(m.valor), 0);

  const totalSaidas = filteredMovimentacoes
    .filter((m) => m.tipo_movimentacao === "SAIDA")
    .reduce((acc: any, m: any) => acc + Number(m.valor), 0);

  return (
    <div className="min-h-screen bg-neutral-50 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 max-w-7xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/financeiro/livro-caixa")}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} />
          Voltar para Gestão Financeira
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-surface p-8 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                <Wallet size={24} />
              </div>
              <h1 className="text-3xl font-bold text-neutral-900">
                {conta.nome}
              </h1>
              <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 uppercase tracking-wide border border-neutral-200">
                {conta.banco}
              </span>
            </div>
            <p className="text-neutral-500 font-medium ml-1">
              {conta.agencia && `Ag: ${conta.agencia}`}{" "}
              {conta.conta && `CC: ${conta.conta}`}
            </p>
          </div>

          <div className="text-right flex items-center gap-6 relative z-10">
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Saldo Atual
              </p>
              <p
                className={`text-4xl font-black ${Number(conta.saldo_atual) >= 0 ? "text-neutral-900" : "text-red-500"}`}
              >
                {formatCurrency(Number(conta.saldo_atual))}
              </p>
            </div>

            <div className="h-12 w-px bg-neutral-200 hidden md:block"></div>
            <CategoryManager
              isOpen={isCategoryModalOpen}
              onClose={() => setIsCategoryModalOpen(false)}
              onUpdate={() => {
                loadCategories();
              }}
            />
            <Button
              onClick={() => setIsCategoryModalOpen(true)}
              variant="secondary"
              icon={Settings}
            >
              Categorias
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              size="lg"
              icon={Plus}
              className="shadow-xl shadow-primary-500/20"
            >
              Novo Lançamento
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filter Bar */}
        <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col xl:flex-row gap-4 items-end">
          <div className="flex-1 w-full xl:w-auto">
            <Input
              label="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Descrição ou observação..."
              icon={Search}
            />
          </div>
          <div className="w-full xl:w-auto flex gap-2">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                De
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-[11px] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all uppercase w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                Até
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-[11px] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all uppercase w-full"
              />
            </div>
          </div>
          <div className="w-full xl:w-48">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
              Tipo
            </label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SAIDA">Saídas</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <ArrowDownCircle size={14} />
              </div>
            </div>
          </div>
          <div className="w-full xl:w-56">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
              Categoria
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-[42px] bg-neutral-50 border border-neutral-200 px-3 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id_categoria} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <ArrowDownCircle size={14} />
              </div>
            </div>
          </div>
          <div className="w-full xl:w-auto">
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm("");
                setDateRange({
                  start: new Date(new Date().setDate(new Date().getDate() - 30))
                    .toISOString()
                    .split("T")[0],
                  end: new Date().toISOString().split("T")[0],
                });
                setSelectedCategory("");
                setSelectedType("");
              }}
              className="h-[42px] w-full"
            >
              Limpar
            </Button>
          </div>
        </div>

        {/* Summary Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Entradas
              </p>
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(totalEntradas)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpCircle size={24} />
            </div>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Saídas
              </p>
              <p className="text-2xl font-black text-red-600">
                {formatCurrency(totalSaidas)}
              </p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <ArrowDownCircle size={24} />
            </div>
          </div>
          <div className="bg-neutral-900 p-6 rounded-xl shadow-xl flex items-center justify-between text-neutral-25">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                Resultado
              </p>
              <p
                className={`text-2xl font-black ${totalEntradas - totalSaidas >= 0 ? "text-neutral-25" : "text-red-400"}`}
              >
                {formatCurrency(totalEntradas - totalSaidas)}
              </p>
            </div>
            <div className="p-3 bg-neutral-800 text-neutral-400 rounded-xl">
              <ArrowRight size={24} />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-surface rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200">
                <th className="p-4 w-40">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4 w-32">Forma Pagto</th>
                <th className="p-4 w-40">Categoria</th>
                <th className="p-4 w-32 text-center">Tipo</th>
                <th className="p-4 w-40 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredMovimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="opacity-20 mb-2" />
                      <p className="font-bold">
                        Nenhuma movimentação encontrada.
                      </p>
                      <p className="text-xs">Tente ajustar os filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovimentacoes.map((mov) => (
                  <tr
                    key={mov.id_livro_caixa}
                    className={`hover:bg-neutral-50 transition-colors group ${mov.deleted_at ? "opacity-50" : ""}`}
                  >
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-700">
                          <Calendar size={14} className="text-neutral-400" />
                          {new Date(mov.dt_movimentacao).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] font-bold text-neutral-400 pl-5">
                          {new Date(mov.dt_movimentacao).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-bold text-neutral-900 ${mov.deleted_at ? "line-through" : ""}`}
                        >
                          {mov.descricao}
                        </span>
                        {mov.obs && (
                          <span className="text-xs font-medium text-neutral-500 mt-0.5 italic truncate max-w-[300px]">
                            {mov.obs}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-neutral-100 ${!mov.paymentMethod || mov.paymentMethod === "MANUAL" ? "text-neutral-500" : "text-primary-600 bg-primary-50"}`}
                      >
                        {mov.paymentMethod || "MANUAL"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-neutral-200">
                        {mov.categoria === "CONCILIACAO_CARTAO"
                          ? "Recebimento (Cartão)"
                          : mov.categoria === "VENDA"
                            ? "Faturamento"
                            : mov.categoria}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {mov.tipo_movimentacao === "ENTRADA" ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <ArrowUpCircle size={16} />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 border border-red-100">
                          <ArrowDownCircle size={16} />
                        </div>
                      )}
                    </td>
                    <td
                      className={`p-4 text-right font-black text-sm whitespace-nowrap ${
                        mov.deleted_at
                          ? "text-neutral-400 line-through"
                          : mov.tipo_movimentacao === "ENTRADA"
                            ? "text-emerald-600"
                            : "text-red-600"
                      }`}
                    >
                      {mov.tipo_movimentacao === "SAIDA" ? "- " : "+ "}
                      {formatCurrency(Number(mov.valor))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <Modal
          title="Novo Lançamento Bancário"
          onClose={() => setIsModalOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setFormLoading(true);
                await api.post("/livro-caixa", {
                  ...formData,
                  id_conta_bancaria: Number(idConta),
                  origem: "MANUAL",
                });
                setIsModalOpen(false);
                setFormData({
                  descricao: "",
                  valor: "",
                  tipo_movimentacao: "SAIDA",
                  categoria: "OUTROS",
                  obs: "",
                });
                loadData(); // Recarrega extrato e saldo
              } catch (error) {
                console.error(error);
                alert("Erro ao criar lançamento.");
              } finally {
                setFormLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Input
                label="Descrição"
                required
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Ex: Taxa Bancária, Material de Limpeza..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Valor (R$)"
                  required
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                  Tipo
                </label>
                <div className="relative">
                  <select
                    value={formData.tipo_movimentacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_movimentacao: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 px-3 py-[11px] rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="ENTRADA">Entrada (+)</option>
                    <option value="SAIDA">Saída (-)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <ArrowDownCircle size={14} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={formData.categoria}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                  className="w-full bg-neutral-50 border border-neutral-200 px-3 py-[11px] rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id_categoria} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ArrowDownCircle size={14} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 ml-1 mb-1.5">
                Observação (Opcional)
              </label>
              <textarea
                rows={3}
                value={formData.obs}
                onChange={(e) =>
                  setFormData({ ...formData, obs: e.target.value })
                }
                className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-lg font-medium text-neutral-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
              />
            </div>
            <div className="pt-4 flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={formLoading}
                className="shadow-lg shadow-primary-500/20"
              >
                {formLoading ? "Salvando..." : "Confirmar Lançamento"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
