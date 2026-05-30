import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { FinanceiroService } from "../../services/financeiro.service";
import {
  Modal,
  ActionButton,
  Button,
  Card,
  FilterButton,
  Input,
  Select,
} from "../ui";
import { toast } from "react-toastify";
import { CategoryManager } from "./CategoryManager";
import {
  Plus,
  Calendar,
  CheckCircle,
  Search,
  Trash2,
  Edit,
  FileText,
  User,
  Settings,
  Square,
  CheckSquare,
  X,
} from "lucide-react";
import type { IContasPagar } from "../../types/backend";
import { ContaPagarModal } from "./ContaPagarModal";
import { useAlerts } from "../../contexts/AlertsContext";

interface ContasGeraisTabProps {
  onUpdate: () => void;
}

export const ContasGeraisTab = ({ onUpdate }: ContasGeraisTabProps) => {
  const { getSyncedDate } = useAlerts();

  const formatDateToYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [contas, setContas] = useState<IContasPagar[]>([]);
  const [loading, setLoading] = useState(false);

  // Categories
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState("PENDENTE"); // TODOS, PENDENTE, PAGO
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");    // id da categoria raiz
  const [filterSubcategoria, setFilterSubcategoria] = useState(""); // id da subcategoria
  const [activeFilter, setActiveFilter] = useState<
    "TODAY" | "WEEK" | "MONTH" | "ALL" | "CUSTOM"
  >("ALL");

  // Date Filters - Start empty for ALL filter
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Payment Confirmation Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [paymentValue, setPaymentValue] = useState("");

  // Confirm Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadContas();
    loadAccounts();
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      const data = await FinanceiroService.getCategoriasFinanceiras();
      setCategorias(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await FinanceiroService.getContasBancarias();
      setBankAccounts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadContas = async () => {
    try {
      setLoading(true);
      const data = await FinanceiroService.getContasPagar();
      setContas(data);
    } catch (error) {
      toast.error("Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deleteAll: boolean) => {
    if (!confirmDeleteId) return;
    try {
      setLoading(true);
      await FinanceiroService.deleteContaPagar(
        confirmDeleteId,
        deleteAll,
      );
      toast.success(
        deleteAll ? "Contas pendentes do parcelamento excluídas." : "Conta excluída.",
      );
      await loadContas();
      onUpdate();
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error("Erro ao excluir conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPay = (conta: any) => {
    setSelectedConta(conta);
    setPaymentDate(formatDateToYYYYMMDD(getSyncedDate())); // Default to today (Server Time)
    setPaymentValue(Number(conta.valor).toFixed(2));
    setSelectedBank(""); // Reset bank selection
    setPayModalOpen(true);
  };

  const executePay = async () => {
    if (!selectedConta) return;
    try {
      await FinanceiroService.updateContaPagar(selectedConta.id_conta_pagar, {
        status: "PAGO",
        valor: Number(paymentValue),
        dt_pagamento: new Date(paymentDate).toISOString(),
      } as any);

      toast.success("Conta marcada como PAGA.");
      loadContas();
      onUpdate();
      setPayModalOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
    }
  };

  const handleEdit = (conta: IContasPagar) => {
    setEditingId(conta.id_conta_pagar);
    setModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH" | "ALL") => {
    setActiveFilter(type as any);
    const now = getSyncedDate();
    const todayStr = formatDateToYYYYMMDD(now);

    if (type === "TODAY") {
      setFilterStart(todayStr);
      setFilterEnd(todayStr);
    } else if (type === "WEEK") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7); // Last 7 days
      setFilterStart(formatDateToYYYYMMDD(weekStart));
      setFilterEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStart(formatDateToYYYYMMDD(firstDay));
      setFilterEnd(formatDateToYYYYMMDD(lastDay));
    } else if (type === "ALL") {
      setFilterStart("");
      setFilterEnd("");
    }
  };

  // Derivadas de categoria para filtros
  const categoriasRaiz = categorias.filter((c) => !c.parentId);
  const subcategoriasDaRaiz = categorias.filter(
    (c) => c.parentId === Number(filterCategoria)
  );

  // Calculations
  const filteredContas = contas.filter((c) => {
    // Date Filter - Only apply if not ALL
    if (activeFilter !== "ALL") {
      // Se a conta está PAGA, o filtro de data deve aplicar sobre a data de pagamento (dt_pagamento)
      // Se está PENDENTE, aplica sobre a data de vencimento (dt_vencimento)
      const dateToCompare = (c.status === "PAGO" && c.dt_pagamento) ? c.dt_pagamento : c.dt_vencimento;
      const datePart = dateToCompare ? dateToCompare.split("T")[0] : "";

      if (filterStart) {
        if (datePart < filterStart) return false;
      }
      if (filterEnd) {
        if (datePart > filterEnd) return false;
      }
    }

    if (filterStatus !== "TODOS" && c.status !== filterStatus) return false;

    // Filtro de Subcategoria (mais específico — aplicado primeiro)
    if (filterSubcategoria) {
      if (c.id_categoria !== Number(filterSubcategoria)) return false;
    } else if (filterCategoria) {
      // Filtro de Categoria Raiz: aceita a própria categoria OU qualquer filha dela
      const matchRaiz = c.id_categoria === Number(filterCategoria);
      const matchFilho = (c as any).categoria_financeira?.parentId === Number(filterCategoria);
      if (!matchRaiz && !matchFilho) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.descricao.toLowerCase().includes(term) ||
        c.categoria?.toLowerCase().includes(term) ||
        c.credor?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalPending = filteredContas
    .filter((c) => c.status === "PENDENTE")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalPaid = filteredContas
    .filter((c) => c.status === "PAGO")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const selectedContaForDelete = contas.find(c => c.id_conta_pagar === confirmDeleteId);
  const hasOtherInstallments = selectedContaForDelete?.id_grupo_recorrencia
    ? contas.some(c => c.id_grupo_recorrencia === selectedContaForDelete.id_grupo_recorrencia && c.id_conta_pagar !== selectedContaForDelete.id_conta_pagar)
    : false;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CategoryManager
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdate={() => {
          onUpdate();
        }}
      />

      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            Contas e Despesas
          </h3>
          <p className="text-sm text-gray-500">
            Gerencie contas a pagar e despesas gerais
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="outline"
            size="sm"
            icon={Settings}
          >
            Categorias
          </Button>
          <Button
            onClick={openNewModal}
            variant="primary"
            size="sm"
            icon={Plus}
          >
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="text-sm font-black text-red-400 uppercase tracking-widest mb-1">
            Total Pendente (Filtro)
          </p>
          <div className="flex items-center gap-2">
            <Square className="text-red-300" size={20} />
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
          <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-1">
            Total Pago (Filtro)
          </p>
          <div className="flex items-center gap-2">
            <CheckSquare className="text-emerald-300" size={20} />
            <p className="text-3xl font-bold text-emerald-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div className="w-full md:flex-1">
            <Input
              label="Buscar"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Descrição, Credor..."
              icon={Search}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Status da Conta
            </label>
            <div className="flex bg-neutral-50 p-1 rounded-xl items-center border border-neutral-200 gap-1">
              {["TODOS", "PENDENTE", "PAGO"].map((s) => (
                <FilterButton
                  key={s}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                >
                  {s}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        {/* FILTROS DE CATEGORIA E SUBCATEGORIA */}
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:flex-1">
            <Select
              label="Categoria"
              value={filterCategoria}
              onChange={(e) => {
                setFilterCategoria(e.target.value);
                setFilterSubcategoria(""); // reseta subcategoria ao trocar pai
              }}
            >
              <option value="">Todas as categorias</option>
              {categoriasRaiz.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:flex-1">
            <Select
              label="Subcategoria"
              value={filterSubcategoria}
              onChange={(e) => setFilterSubcategoria(e.target.value)}
              disabled={!filterCategoria || subcategoriasDaRaiz.length === 0}
            >
              <option value="">Todas as subcategorias</option>
              {subcategoriasDaRaiz.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end md:items-center gap-4 border-t border-neutral-100 pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-widest min-w-[90px]">
              Vencimento:
            </span>
            <div className="flex bg-neutral-50 p-1 rounded-xl shrink-0 gap-1">
              <FilterButton
                active={activeFilter === "TODAY"}
                onClick={() => applyQuickFilter("TODAY")}
              >
                Hoje
              </FilterButton>
              <FilterButton
                active={activeFilter === "WEEK"}
                onClick={() => applyQuickFilter("WEEK")}
              >
                Semana
              </FilterButton>
              <FilterButton
                active={activeFilter === "MONTH"}
                onClick={() => applyQuickFilter("MONTH")}
              >
                Mês
              </FilterButton>
              <FilterButton
                active={activeFilter === "ALL"}
                onClick={() => applyQuickFilter("ALL")}
              >
                Todos
              </FilterButton>
            </div>

            <div className="flex gap-2 items-center">
              <div className="w-36">
                <Input
                  type="date"
                  value={filterStart}
                  onChange={(e) => {
                    setFilterStart(e.target.value);
                    setActiveFilter("CUSTOM");
                  }}
                  className={activeFilter === "CUSTOM" ? "border-primary-600 text-primary-700" : ""}
                />
              </div>
              <span className="text-neutral-400 self-center">-</span>
              <div className="w-36">
                <Input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => {
                    setFilterEnd(e.target.value);
                    setActiveFilter("CUSTOM");
                  }}
                  className={activeFilter === "CUSTOM" ? "border-primary-600 text-primary-700" : ""}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setSearchTerm("");
              setFilterStatus("PENDENTE");
              setFilterCategoria("");
              setFilterSubcategoria("");
              applyQuickFilter("ALL");
            }}
            variant="outline"
            size="sm"
            icon={X}
            className="md:ml-auto"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <Card className="p-0 overflow-hidden">
        <table className="tabela-limpa w-full">
          <thead>
            <tr className="bg-neutral-50 text-neutral-400 text-sm uppercase tracking-wider font-bold">
              <th className="p-4 text-left rounded-tl-xl">Vencimento</th>
              <th className="p-4 text-left">Descrição</th>
              <th className="p-4 text-left">Credor / Docs</th>
              <th className="p-4 text-right">Valor</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right rounded-tr-xl">Ações</th>
            </tr>
          </thead>
          <tbody className="">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-400">
                  Carregando...
                </td>
              </tr>
            ) : filteredContas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-neutral-400 italic"
                >
                  Nenhuma conta encontrada.
                </td>
              </tr>
            ) : (
              filteredContas.map((conta) => (
                <tr
                  key={conta.id_conta_pagar}
                  className="hover:bg-neutral-50 transition-colors group"
                >
                  <td className="p-4">
                    <div className="text-base text-gray-900 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(conta.dt_vencimento)
                        .getUTCDate()
                        .toString()
                        .padStart(2, "0")}
                      /
                      {(new Date(conta.dt_vencimento).getUTCMonth() + 1)
                        .toString()
                        .padStart(2, "0")}
                      /{new Date(conta.dt_vencimento).getUTCFullYear()}
                    </div>
                    {conta.dt_cadastro && (
                      <div className="text-sm text-neutral-400 mt-0.5 ml-6">
                        Criado:{" "}
                        {new Date(conta.dt_cadastro).toLocaleDateString()}
                      </div>
                    )}
                    {conta.dt_pagamento && conta.status === "PAGO" && (
                      <div className="text-sm text-emerald-600 font-bold mt-1 ml-6">
                        Pago:{" "}
                        {new Date(conta.dt_pagamento).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-base text-neutral-800">
                      {conta.descricao}
                      {conta.id_grupo_recorrencia && (
                        <span className="ml-2 text-sm bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          Recorrente
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-500 uppercase bg-neutral-100 px-2 py-0.5 rounded w-fit mt-1 border border-neutral-200">
                      {conta.categoria_financeira
                        ? (conta.categoria_financeira.parent
                            ? `${conta.categoria_financeira.parent.nome} / ${conta.categoria_financeira.nome}`
                            : conta.categoria_financeira.nome)
                        : conta.categoria?.split(' - ').pop()?.trim() || conta.categoria}
                    </div>
                    {conta.obs && (
                      <div className="text-sm text-neutral-500 mt-1 italic max-w-[200px] truncate">
                        {conta.obs}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {conta.credor && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1">
                        <User size={12} className="text-gray-400" />{" "}
                        {conta.credor}
                      </div>
                    )}
                    {conta.num_documento && (
                      <div className="flex items-center gap-1.5 text-sm text-neutral-500 font-bold">
                        <FileText size={12} className="text-neutral-400" /> Doc:{" "}
                        {conta.num_documento}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-neutral-800">
                    {formatCurrency(Number(conta.valor))}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        conta.status === "PAGO"
                          ? "bg-green-100 text-green-700"
                          : conta.status === "ATRASADO"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {conta.status === "PAGO"
                        ? "PAGO"
                        : new Date(conta.dt_vencimento) < getSyncedDate()
                          ? "ATRASADO"
                          : "PENDENTE"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {conta.status !== "PAGO" && (
                        <ActionButton
                          onClick={() => handleQuickPay(conta)}
                          icon={CheckCircle}
                          label="Pagar"
                          variant="primary"
                          disabled={loading}
                        />
                      )}
                      <ActionButton
                        onClick={() => handleEdit(conta)}
                        icon={Edit}
                        label="Editar"
                        variant="accent"
                        disabled={loading}
                      />
                      <ActionButton
                        onClick={() => setConfirmDeleteId(conta.id_conta_pagar)}
                        icon={Trash2}
                        label="Excluir"
                        variant="danger"
                        disabled={loading}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* CONFIRM DELETE MODAL */}
      {!!confirmDeleteId && selectedContaForDelete && (
        <Modal
          title="Confirmar Exclusão"
          onClose={() => {
            setConfirmDeleteId(null);
          }}
        >
          <div className="space-y-4 pt-2">
            {hasOtherInstallments ? (
              // --- CASO SEJA RECORRENTE / PARCELADA ---
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900">Conta com Parcelamento</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Esta conta faz parte de um parcelamento. Deseja excluir apenas este boleto ou todos os boletos pendentes deste grupo?
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                    Conta Selecionada
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedContaForDelete.descricao} - {formatCurrency(Number(selectedContaForDelete.valor))}
                  </p>
                  {selectedContaForDelete.numero_parcela && selectedContaForDelete.total_parcelas && (
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      Parcela {selectedContaForDelete.numero_parcela} de {selectedContaForDelete.total_parcelas}
                    </p>
                  )}
                </div>

                {/* Safety Disclaimer */}
                <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl">
                  <p className="text-xs font-bold text-red-700 leading-normal">
                    Nota de Segurança: Se você optar por excluir todos os boletos do grupo, parcelas que já foram pagas ou baixadas serão mantidas para proteger o histórico de caixa.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    disabled={loading}
                    onClick={() => {
                      setConfirmDeleteId(null);
                    }}
                    className="w-full sm:w-auto font-bold uppercase text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleDelete(false)}
                    className="w-full sm:w-auto font-bold uppercase text-xs border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    Apenas este
                  </Button>
                  <Button
                    variant="danger"
                    disabled={loading}
                    onClick={() => handleDelete(true)}
                    className="w-full sm:w-auto font-bold uppercase text-xs shadow-md"
                  >
                    Todos os pendentes
                  </Button>
                </div>
              </div>
            ) : (
              // --- CASO SEJA PARCELA ÚNICA / SIMPLES ---
              <div className="space-y-4">
                <p className="text-base text-slate-700 leading-normal">
                  Tem certeza que deseja excluir esta conta? Esta ação não poderá ser desfeita.
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                    Detalhes da Conta
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedContaForDelete.descricao} - {formatCurrency(Number(selectedContaForDelete.valor))}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    disabled={loading}
                    onClick={() => setConfirmDeleteId(null)}
                    className="font-bold uppercase text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={loading}
                    onClick={() => handleDelete(false)}
                    className="font-bold uppercase text-xs shadow-md"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* PAY MODAL */}
      {payModalOpen && selectedConta && (
        <Modal
          title="Registrar Pagamento"
          onClose={() => setPayModalOpen(false)}
        >
          <div className="space-y-4 pt-2">
            <Input
              label="Valor Pago"
              type="number"
              value={paymentValue}
              onChange={(e) => setPaymentValue(e.target.value)}
            />
            <Input
              label="Data Pagamento"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <Select
              label="Conta Bancária (Opcional)"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
            >
              <option value="">Selecione...</option>
              {bankAccounts.map((b: any) => (
                <option key={b.id_conta_bancaria} value={b.id_conta_bancaria}>
                  {b.nome_banco} - {b.agencia}/{b.conta}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={executePay}
                variant="primary"
              >
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ContaPagarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          loadContas();
          onUpdate();
        }}
        editingId={editingId}
      />
    </div>
  );
};
