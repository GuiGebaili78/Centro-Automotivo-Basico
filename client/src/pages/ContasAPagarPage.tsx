import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { FinanceiroService } from "../services/financeiro.service";
import { api } from "../services/api";
import {
  ActionButton,
  Button,
  PageLayout,
  Card,
  ConfirmModal,
  Checkbox,
} from "../components/ui";
import { CategoryManager } from "../components/financeiro/CategoryManager";
import { ModalPagamentoUnificado } from "../components/financeiro/ModalPagamentoUnificado";
import { UniversalFilters } from "../components/common/UniversalFilters";
import type { UniversalFiltersState } from "../components/common/UniversalFilters";
import { useUniversalFilter } from "../hooks/useUniversalFilter";
import { toast } from "react-toastify";
import {
  Plus,
  Calendar,
  CheckCircle,
  Trash2,
  Edit,
  FileText,
  User,
  Link,
  Settings,
} from "lucide-react";
import type { IContasPagar } from "../types/backend";
import { ContaPagarModal } from "../components/financeiro/ContaPagarModal";

export const ContasAPagarPage = () => {
  const [contas, setContas] = useState<IContasPagar[]>([]);
  const [loading, setLoading] = useState(false);

  // Categories
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Filters
  const [universalFilters, setUniversalFilters] = useState<UniversalFiltersState>({
    search: "", osId: "", status: "ALL", operadora: "", fornecedor: "",
    startDate: "", endDate: "", activePeriod: "ALL",
  });
  const [fornecedoresList, setFornecedoresList] = useState<any[]>([]);

  // Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Payment Confirmation Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Confirm Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteAllRecurrences, setDeleteAllRecurrences] = useState(false);

  useEffect(() => {
    loadContas();
    loadAccounts();
    loadFornecedores();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await FinanceiroService.getContasBancarias();
      setBankAccounts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFornecedores = async () => {
    try {
      const response = await api.get("/fornecedor");
      setFornecedoresList(response.data || []);
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

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await FinanceiroService.deleteContaPagar(
        confirmDeleteId,
        deleteAllRecurrences,
      );
      toast.success(
        deleteAllRecurrences ? "Série de contas excluída." : "Conta excluída.",
      );
      loadContas();
      setConfirmDeleteId(null);
      setDeleteAllRecurrences(false);
    } catch (error) {
      toast.error("Erro ao excluir conta.");
    }
  };

  const handleQuickPay = (conta: any) => {
    setSelectedConta(conta);
    setPayModalOpen(true);
  };

  const executePay = async (data: {
    accountId: number;
    date: string;
    discountValue: number;
  }) => {
    if (!selectedConta) return;
    try {
      // O valor final pago é o valor da conta menos o desconto
      const valorFinal = Number(selectedConta.valor) - data.discountValue;

      await FinanceiroService.updateContaPagar(selectedConta.id_conta_pagar, {
        status: "PAGO",
        valor: valorFinal,
        dt_pagamento: new Date(data.date).toISOString(),
        id_conta_bancaria: data.accountId || null,
      });
      toast.success("Conta marcada como PAGA.");
      loadContas();
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



  // Filtered via useUniversalFilter hook
  const filteredContas = useUniversalFilter(contas, universalFilters, {
    dateField: "dt_vencimento",
    statusField: "status",
    paidValue: "PAGO",
    pendingValue: "PENDENTE",
    fornecedorField: "credor",
  });

  const totalPending = filteredContas
    .filter((c) => c.status === "PENDENTE")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalPaid = filteredContas
    .filter((c) => c.status === "PAGO")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  return (
    <PageLayout
      title="Contas a Pagar"
      subtitle="Gerencie despesas operacionais da oficina."
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="secondary"
            icon={Settings}
          >
            Categorias
          </Button>
          <Button onClick={openNewModal} variant="primary" icon={Plus}>
            Nova Conta
          </Button>
        </div>
      }
    >
      <CategoryManager
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdate={() => {
          loadContas();
        }}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
            Total Pendente (Filtro)
          </p>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            Total Pago (Filtro)
          </p>
          <p className="text-3xl font-bold text-emerald-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-6">
        <UniversalFilters
          onFilterChange={setUniversalFilters}
          config={{
            enableFornecedor: true,
            enableOperadora: false,
            enableOsId: false,
            fornecedores: fornecedoresList.map(f => ({ id: f.nome, nome: f.nome })),
            statusOptions: [
              { value: "ALL", label: "Todas" },
              { value: "PENDING", label: "Pendentes" },
              { value: "PAID", label: "Pagas" },
            ],
          }}
        />
      </div>

      {/* TABLE */}
      <Card className="p-0 overflow-hidden">
        <table className="tabela-limpa w-full">
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Credor / Docs</th>
              <th className="text-right">Valor</th>
              <th className="text-center">Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
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
                    <div className="font-bold text-neutral-700 text-sm flex items-center gap-2">
                      <Calendar size={14} className="text-neutral-400" />
                      {/* Fix Timezone Display: Use UTC to calculate date */}
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
                    {conta.dt_vencimento && conta.dt_cadastro && (
                      <div className="text-sm text-neutral-400 mt-0.5 ml-6">
                        {new Date(conta.dt_cadastro).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    )}
                    {conta.dt_pagamento && conta.status === "PAGO" && (
                      <div className="text-sm text-emerald-600 font-bold mt-1 ml-6">
                        Pago em:{" "}
                        {new Date(conta.dt_pagamento)
                          .getUTCDate()
                          .toString()
                          .padStart(2, "0")}
                        /
                        {(new Date(conta.dt_pagamento).getUTCMonth() + 1)
                          .toString()
                          .padStart(2, "0")}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-neutral-900">
                      {conta.descricao}
                    </div>
                    <div className="text-sm font-bold text-neutral-400 uppercase bg-neutral-100 px-2 py-0.5 rounded w-fit mt-1">
                      {conta.categoria}
                    </div>
                    {conta.obs && (
                      <div className="text-sm text-neutral-500 mt-1 italic max-w-[200px] truncate">
                        {conta.obs}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {conta.credor && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 mb-1">
                        <User size={12} className="text-neutral-400" />{" "}
                        {conta.credor}
                      </div>
                    )}
                    {conta.num_documento && (
                      <div className="flex items-center gap-1.5 text-sm text-neutral-500 font-bold">
                        <FileText size={12} className="text-neutral-400" /> Doc:{" "}
                        {conta.num_documento}
                      </div>
                    )}
                    {conta.url_anexo && (
                      <a
                        href={conta.url_anexo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-500 font-bold hover:underline mt-1"
                      >
                        <Link size={12} /> Ver Anexo
                      </a>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-neutral-600">
                    {formatCurrency(Number(conta.valor))}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-md text-sm font-bold uppercase ${
                        conta.status === "PAGO"
                          ? "bg-emerald-100 text-emerald-700"
                          : // Check overdue
                            new Date(conta.dt_vencimento) < new Date() &&
                              conta.status !== "PAGO"
                            ? "bg-red-100 text-red-600"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {conta.status === "PAGO"
                        ? "PAGO"
                        : new Date(conta.dt_vencimento) < new Date() &&
                            conta.status !== "PAGO"
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
                          label="Marcar como Pago"
                          variant="primary"
                        />
                      )}
                      <ActionButton
                        onClick={() => handleEdit(conta)}
                        icon={Edit}
                        label="Editar"
                        variant="accent"
                      />
                      <ActionButton
                        onClick={() => setConfirmDeleteId(conta.id_conta_pagar)}
                        icon={Trash2}
                        label="Excluir"
                        variant="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <ContaPagarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadContas}
        editingId={editingId}
      />

      {/* Modal de Pagamento Unificado */}
      <ModalPagamentoUnificado
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onConfirm={executePay}
        totalAmount={Number(selectedConta?.valor || 0)}
        bankAccounts={bankAccounts}
        title="Baixa de Conta a Pagar"
        showDiscount={true}
        isLoading={loading}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => {
          setConfirmDeleteId(null);
          setDeleteAllRecurrences(false);
        }}
        onConfirm={handleDelete}
        title="Excluir Conta"
        description={
          <div className="space-y-3">
            <p>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser
              desfeita.
            </p>

            {/* Check if recurring */}
            {confirmDeleteId &&
              contas.find(
                (c) =>
                  c.id_conta_pagar === confirmDeleteId &&
                  (c.id_grupo_recorrencia ||
                    c.obs?.match(/\(Recorrência \d+\/\d+\)/)),
              ) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-900 mb-2">
                    Esta conta faz parte de uma série recorrente.
                  </p>
                  <Checkbox
                    label="Excluir todas as parcelas desta série"
                    checked={deleteAllRecurrences}
                    onChange={(e) =>
                      setDeleteAllRecurrences((e.target as any).checked)
                    }
                  />
                </div>
              )}
          </div>
        }
        confirmText={deleteAllRecurrences ? "Excluir Série" : "Excluir"}
        variant="danger"
      />
    </PageLayout>
  );
};
