import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import { getStatusStyle } from "../utils/osUtils";
import {
  Save,
  Plus,
  BadgeCheck,
  Trash2,
  ArrowLeft,
  Edit,
  AlertCircle,
  Truck,
  Phone,
} from "lucide-react";
import { PagamentoClienteForm } from "../components/financeiro/Forms/PagamentoClienteForm";
import { FornecedorForm } from "../components/fornecedores/Forms/FornecedorForm";
import { LaborManager } from "../components/os/LaborManager";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { ActionButton } from "../components/ui/ActionButton";
import { Card } from "../components/ui/Card";
import { toast } from "react-toastify";

interface ItemOS {
  id_iten: number;
  id_pecas_estoque?: number;
  valor_total: number;
  valor_venda: number;
  descricao: string;
  quantidade: number;
  codigo_referencia?: string;
  is_interno?: boolean;
  pecas_estoque?: {
    valor_custo: number;
    nome: string;
  };
  pagamentos_peca?: {
    id_pagamento_peca: number;
    id_fornecedor: number;
    custo_real: number;
    pago_ao_fornecedor: boolean;
  }[];
}

interface IFornecedor {
  id_fornecedor: number;
  nome: string;
}

interface ItemFinanceiroState {
  id_pagamento_peca?: number;
  id_fornecedor: string;
  custo_real: string;
  pago_fornecedor: boolean;
}

interface OSData {
  id_os: number;
  dt_abertura: string;
  status: string;
  valor_total_cliente: number;
  valor_mao_de_obra: number;
  valor_pecas: number;
  itens_os: ItemOS[];
  defeito_relatado?: string;
  diagnostico?: string;
  obs_interna?: string;
  cliente: {
    pessoa_fisica?: { pessoa: { nome: string } };
    pessoa_juridica?: { nome_fantasia: string };
    telefone_1?: string;
    id_cliente?: number;
  };
  veiculo: {
    placa: string;
    modelo: string;
    cor: string;
  };
  cliente_telefone?: string;
  pagamentos_cliente?: {
    id_pagamento_cliente: number;
    metodo_pagamento: string;
    valor: number;
    data_pagamento: string;
    bandeira_cartao?: string;
    codigo_transacao?: string;
    qtd_parcelas?: number;
    tipo_parcelamento?: string;
    deleted_at?: string;
    conta_bancaria?: { nome_banco: string; nome_conta: string };
    operadora?: { nome: string };
  }[];
  fechamento_financeiro?: {
    id_fechamento_financeiro: number;
  };
  servicos_mao_de_obra?: {
    id_servico_mao_de_obra: number;
    valor: number;
    funcionario?: {
      pessoa_fisica?: {
        pessoa: {
          nome: string;
        };
      };
      cargo?: string;
    };
  }[];
}

// ... existing code ...

export const FechamentoFinanceiroDetalhePage = () => {
  const { id } = useParams(); // Get ID from URL
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetchingOs, setFetchingOs] = useState(false);

  const [osData, setOsData] = useState<OSData | null>(null);
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);

  const [itemsState, setItemsState] = useState<
    Record<number, ItemFinanceiroState>
  >({});
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    data: any;
  }>({ isOpen: false, data: null });

  // Item Edit State
  const [editItemModal, setEditItemModal] = useState<{
    isOpen: boolean;
    item: ItemOS | null;
  }>({ isOpen: false, item: null });
  const [editItemForm, setEditItemForm] = useState({
    descricao: "",
    quantidade: 1,
    valor_venda: 0,
    codigo_referencia: "",
    is_interno: false,
  });

  const [addInternalModal, setAddInternalModal] = useState<{
    isOpen: boolean;
  }>({ isOpen: false });
  const [addInternalForm, setAddInternalForm] = useState({
    descricao: "",
    quantidade: 1,
    codigo_referencia: "",
  });

  // Dirty Check State
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const [employees, setEmployees] = useState<any[]>([]);

  const handleLaborTotalChange = useCallback((total: number) => {
    setOsData((prev) =>
      prev
        ? {
            ...prev,
            valor_mao_de_obra: total,
            valor_total_cliente: (prev.valor_pecas || 0) + total,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    loadFornecedores();
    loadEmployees();
    if (id) {
      fetchOsData(Number(id));
    }
  }, [id]);

  const loadFornecedores = async () => {
    try {
      const response = await api.get("/fornecedor");
      setFornecedores(response.data);
    } catch (error) {
      console.error("Erro ao carregar fornecedores");
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await api.get("/funcionario");
      setEmployees(response.data);
    } catch (error) {
      console.error("Erro ao carregar funcionários");
    }
  };

  const fetchOsData = async (osId: number) => {
    setFetchingOs(true);
    try {
      const response = await api.get(
        `/ordem-de-servico/${osId}?includeInternal=true`,
      );
      const os: OSData = response.data;
      setOsData(os);

      const initialItemsState: Record<number, ItemFinanceiroState> = {};
      os.itens_os.forEach((item) => {
        const existingPayment =
          item.pagamentos_peca && item.pagamentos_peca.length > 0
            ? item.pagamentos_peca[0]
            : null;

        const initialCost = existingPayment
          ? String(existingPayment.custo_real)
          : item.pecas_estoque?.valor_custo
            ? (
                Number(item.pecas_estoque.valor_custo) * item.quantidade
              ).toFixed(2)
            : "";

        initialItemsState[item.id_iten] = {
          id_pagamento_peca: existingPayment?.id_pagamento_peca,
          id_fornecedor: existingPayment
            ? String(existingPayment.id_fornecedor)
            : "",
          custo_real: initialCost,
          pago_fornecedor: existingPayment
            ? existingPayment.pago_ao_fornecedor
            : false,
        };
      });
      setItemsState(initialItemsState);
      setIsDirty(false); // Reset dirty after fetch
    } catch (error) {
      console.error(error);
      toast.error("OS não encontrada ou erro ao buscar dados.");
    } finally {
      setFetchingOs(false);
    }
  };

  const handleDeletePayment = (paymentId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Pagamento",
      message: "Tem certeza que deseja excluir este pagamento?",
      onConfirm: async () => {
        try {
          await api.delete(`/pagamento-cliente/${paymentId}`);
          toast.success("Pagamento removido!");
          if (osData) fetchOsData(osData.id_os);
        } catch (error) {
          toast.error("Erro ao remover pagamento.");
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleItemChange = (
    id_iten: number,
    field: keyof ItemFinanceiroState,
    value: any,
  ) => {
    setItemsState((prev) => {
      const newState = {
        ...prev,
        [id_iten]: {
          ...prev[id_iten],
          [field]: value,
        },
      };
      return newState;
    });
    setIsDirty(true);
  };

  // --- ITEM CRUD ---
  const handleOpenEditItem = (item: ItemOS) => {
    setEditItemForm({
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_venda:
        Number(item.valor_venda) || Number(item.valor_total) / item.quantidade,
      codigo_referencia: item.codigo_referencia || "",
      is_interno: !!item.is_interno,
    });
    setEditItemModal({ isOpen: true, item });
  };

  const handleOpenAddInternal = () => {
    setAddInternalForm({
      descricao: "",
      quantidade: 1,
      codigo_referencia: "",
    });
    setAddInternalModal({ isOpen: true });
  };

  const handleSaveAddInternal = async () => {
    if (!osData) return;
    try {
      if (!addInternalForm.descricao.trim()) {
        toast.error("A descrição é obrigatória.");
        return;
      }
      await api.post("/itens-os", {
        id_os: osData.id_os,
        descricao: addInternalForm.descricao,
        quantidade: Number(addInternalForm.quantidade),
        valor_venda: 0,
        valor_total: 0,
        codigo_referencia: addInternalForm.codigo_referencia,
        is_interno: true,
      });
      toast.success("Custo interno adicionado!");
      setAddInternalModal({ isOpen: false });
      fetchOsData(osData.id_os);
    } catch (error) {
      toast.error("Erro ao adicionar custo interno.");
    }
  };

  const handleDeleteItemOS = async (itemId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Item",
      message: "Tem certeza que deseja excluir este item da OS?",
      onConfirm: async () => {
        try {
          await api.delete(`/itens-os/${itemId}`);
          toast.success("Item removido com sucesso!");
          if (osData) fetchOsData(osData.id_os);
        } catch (error) {
          console.error(error);
          toast.error("Erro ao excluir item.");
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSaveEditItem = async () => {
    if (!editItemModal.item || !osData) return;
    try {
      const valorTotal = editItemModal.item.is_interno
        ? 0
        : Number(editItemForm.quantidade) * Number(editItemForm.valor_venda);
      await api.put(`/itens-os/${editItemModal.item.id_iten}`, {
        descricao: editItemForm.descricao,
        quantidade: Number(editItemForm.quantidade),
        valor_venda: editItemModal.item.is_interno
          ? 0
          : Number(editItemForm.valor_venda),
        valor_total: valorTotal,
        codigo_referencia: editItemForm.codigo_referencia,
      });

      setEditItemModal({ isOpen: false, item: null });
      fetchOsData(osData.id_os);
      toast.success("Item atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar item.");
    }
  };

  const calculateTotals = () => {
    if (!osData)
      return {
        totalReceita: 0,
        totalCusto: 0,
        lucro: 0,
        margem: 0,
        totalItemsRevenue: 0,
        totalItemsCost: 0,
        totalLaborRevenue: 0,
        totalInternalCost: 0,
      };

    // Client Revenue (excluding internal items)
    const totalItemsRevenue = osData.itens_os
      .filter((i) => !i.is_interno)
      .reduce((acc, i) => acc + Number(i.valor_total), 0);

    const totalLaborRevenue =
      osData.servicos_mao_de_obra?.reduce(
        (acc, s) => acc + Number(s.valor),
        0,
      ) || 0;
    const totalReceita = totalItemsRevenue + totalLaborRevenue;

    // Costs (including internal items)
    const totalItemsCost = osData.itens_os
      .filter((i) => !i.is_interno)
      .reduce(
        (acc, i) => acc + Number(itemsState[i.id_iten]?.custo_real || 0),
        0,
      );

    const totalInternalCost = osData.itens_os
      .filter((i) => i.is_interno)
      .reduce(
        (acc, i) => acc + Number(itemsState[i.id_iten]?.custo_real || 0),
        0,
      );

    const totalCusto = totalItemsCost + totalInternalCost;

    const lucro = totalReceita - totalCusto;
    const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

    return {
      totalReceita,
      totalCusto,
      lucro,
      margem,
      totalItemsRevenue,
      totalItemsCost,
      totalLaborRevenue,
      totalInternalCost,
    };
  };

  const {
    totalReceita,
    totalCusto,
    lucro,
    totalItemsRevenue,
    totalLaborRevenue,
  } = calculateTotals();

  const handleSave = async (finalize: boolean = false) => {
    setLoading(true);
    if (!osData) return;

    try {
      // Upsert Payments (Costs)
      const pagamentoPromises = osData.itens_os.map(async (item) => {
        const st = itemsState[item.id_iten];
        if (!st || !st.id_fornecedor) return null; // Skip incomplete items? Or strictly require?
        // If finalize is true, we might strictly require. If just saving, allow partial?
        // Let's allow partial save if not finalizing.

        if (st && st.id_fornecedor && st.custo_real) {
          const payload = {
            id_item_os: item.id_iten,
            id_fornecedor: Number(st.id_fornecedor),
            custo_real: Number(st.custo_real),
            data_compra: new Date().toISOString(),
            pago_ao_fornecedor: st.pago_fornecedor,
          };

          if (st.id_pagamento_peca) {
            return api.put(`/pagamento-peca/${st.id_pagamento_peca}`, payload);
          } else {
            return api.post("/pagamento-peca", payload);
          }
        }
        return null;
      });

      await Promise.all(pagamentoPromises);

      await Promise.all(pagamentoPromises);

      // Finalize OS if requested
      if (finalize) {
        // 1. CONSOLIDAR FINANCEIRAMENTE (Usa o novo endpoint que cria tudo de uma vez)
        const consolidarPayload = {
          idOs: Number(osData.id_os),
          custoTotalPecasReal: totalCusto,
        };

        await api.post("/fechamento-financeiro/consolidar", consolidarPayload);

        // 2. Atualizar Defeito e Diagnóstico se alterados (State machine agora permite isso mesmo se FINALIZADA)
        await api.put(`/ordem-de-servico/${osData.id_os}`, {
          defeito_relatado: osData.defeito_relatado,
          diagnostico: osData.diagnostico,
          obs_interna: osData.obs_interna,
        });

        // Validation: Check Revenue
        const totalPago =
          osData.pagamentos_cliente?.reduce(
            (acc, p) => (p.deleted_at ? acc : acc + Number(p.valor)),
            0,
          ) || 0;
        if (totalPago === 0) {
          toast.warn("Aviso: Nenhum recebimento registrado.");
        }

        if (osData.status !== "FINALIZADA") {
          await api.put(`/ordem-de-servico/${osData.id_os}`, {
            status: "FINALIZADA",
            valor_final: totalReceita,
            valor_pecas: totalItemsRevenue,
          });
        }
        toast.success("OS Finalizada com Sucesso!");
        setIsDirty(false);
        setTimeout(() => navigate("/fechamento-financeiro"), 1000);
      } else {
        // Also sync notes if not finalizing
        await api.put(`/ordem-de-servico/${osData.id_os}`, {
          defeito_relatado: osData.defeito_relatado,
          diagnostico: osData.diagnostico,
          obs_interna: osData.obs_interna,
        });

        toast.success("Dados Salvos!");
        setIsDirty(false);
        // Refresh data
        fetchOsData(osData.id_os);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const getClientName = () =>
    osData?.cliente?.pessoa_fisica?.pessoa?.nome ||
    osData?.cliente?.pessoa_juridica?.nome_fantasia ||
    "Cliente";

  const formatPhone = (phone?: string) => {
    if (!phone) return "Sem telefone";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean[2]} ${clean.slice(3, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  // --- RENDER ---
  if (fetchingOs)
    return (
      <div className="p-10 text-center text-neutral-500">
        Carregando detalhes...
      </div>
    );
  if (!osData)
    return (
      <div className="p-10 text-center text-neutral-500">
        OS não encontrada.
      </div>
    );

  const handleReopenOS = async () => {
    if (!osData) return;
    setConfirmModal({
      isOpen: true,
      title: "Reabrir OS",
      message:
        "Tem certeza que deseja reabrir esta OS? Isso irá ESTORNAR todos os lançamentos financeiros (Caixa, Recebíveis) e remover o fechamento. O status voltará para ABERTA.",
      onConfirm: async () => {
        try {
          // 1. Se houver Fechamento Financeiro, reverter primeiro
          if (osData.fechamento_financeiro?.id_fechamento_financeiro) {
            await api.post("/fechamento-financeiro/reverter", {
              idFechamento:
                osData.fechamento_financeiro.id_fechamento_financeiro,
            });
            toast.success("Consolidação Financeira revertida!");
          }

          // 2. Atualizar Status para ABERTA
          await api.put(`/ordem-de-servico/${osData.id_os}`, {
            status: "ABERTA",
          });

          toast.success("OS Reaberta com sucesso! Você será redirecionado.");
          setTimeout(() => navigate(`/ordem-de-servico/${osData.id_os}`), 1000);
        } catch (error: any) {
          console.error(error);
          const msg =
            error.response?.data?.details ||
            error.response?.data?.error ||
            "Erro ao reabrir OS.";
          toast.error(`Não foi possível reabrir: ${msg}`);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {blocker.state === "blocked" && (
        <Modal
          title="Salvar Alterações?"
          onClose={() => blocker.reset && blocker.reset()}
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Você tem alterações não salvas. Deseja salvar antes de sair?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => blocker.proceed && blocker.proceed()}
              >
                Descartar e Sair
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  await handleSave(false);
                  blocker.proceed && blocker.proceed();
                }}
              >
                Salvar e Sair
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONSOLIDATED HEADER CARD */}
      <Card className="p-0 overflow-hidden border border-neutral-200 shadow-sm mb-6 bg-white">
        {/* Top Header: Actions & ID */}
        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/fechamento-financeiro")}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-all text-neutral-400 hover:text-neutral-700 active:scale-95"
              title="Voltar"
            >
              <ArrowLeft size={24} />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 leading-none m-0 tracking-tight flex items-center">
                  OS |{" "}
                  <span className="text-primary-600 font-mono ml-4 mr-4">
                    {osData.id_os}
                  </span>{" "}
                  Fechamento Financeiro
                </h1>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest ring-1 ${getStatusStyle(osData.status)}`}
                >
                  {osData?.status === "FINANCEIRO"
                    ? "FINANCEIRO"
                    : (osData?.status as string).replace(/_/g, " ")}
                </span>
                {isDirty && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                    <AlertCircle size={10} /> ALTERAÇÕES PENDENTES
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400 mt-2">
                Gerenciamento Financeiro da Ordem de Serviço
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(osData?.status === "FINALIZADA" ||
              osData?.status === "FINANCEIRO") && (
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 h-11 px-6 font-bold"
                onClick={handleReopenOS}
              >
                REABRIR OS
              </Button>
            )}
          </div>
        </div>

        {/* Grid Info Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vehicle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Truck size={16} />
              <span className="text-sm font-medium uppercase tracking-widest">
                Veículo
              </span>
              <button
                onClick={() =>
                  navigate(`/cadastro/${osData.cliente?.id_cliente}`)
                }
                className="text-primary-500 hover:text-primary-600 p-0.5 rounded hover:bg-primary-50"
              >
                <Edit size={16} />
              </button>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-900 text-base font-bold uppercase">
                {osData?.veiculo?.modelo} • {osData?.veiculo?.cor || "N/I"}
              </span>
              <span className="text-base text-primary-600 uppercase mt-0.5 font-bold">
                {osData?.veiculo?.placa || "---"}
              </span>
            </div>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Phone size={16} />
              <span className="text-sm font-medium uppercase tracking-widest">
                Cliente
              </span>
              <button
                onClick={() =>
                  navigate(`/cadastro/${osData.cliente?.id_cliente}`)
                }
                className="text-primary-500 hover:text-primary-600 p-0.5 rounded hover:bg-primary-50"
              >
                <Edit size={16} />
              </button>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-tight uppercase">
                {getClientName()}
              </p>
              <p className="text-base font-medium text-gray-500 mt-1">
                {formatPhone(osData?.cliente?.telefone_1)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* SPLIT LAYOUT: Obs (Left) & Labor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
        {/* LEFT COL: Obs */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-4 p-4">
            <div className="space-y-1">
              <label className="flex items-center gap-3 pb-2 border-b border-neutral-100 text-sm font-medium text-gray-600 uppercase tracking-widest">
                <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                </div>
                Defeito Relatado (Impressão para o Cliente)
              </label>
              <textarea
                className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-base font-medium text-neutral-700 h-32 outline-none focus:border-red-300 focus:bg-white resize-none transition-all focus:shadow-sm"
                placeholder="Descreva o defeito..."
                value={osData.defeito_relatado || ""}
                onChange={(e) => {
                  setOsData({ ...osData, defeito_relatado: e.target.value });
                  setIsDirty(true);
                }}
              />
            </div>

            <div className="space-y-1 mt-4">
              <label className="flex items-center gap-3 pb-2 border-b border-neutral-100 text-sm font-medium text-gray-600 uppercase tracking-widest">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                  <BadgeCheck size={18} />
                </div>
                Diagnóstico (apenas informações internas da oficina)
              </label>
              <textarea
                className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-base font-medium text-neutral-700 h-32 outline-none focus:border-blue-300 focus:bg-white resize-none transition-all focus:shadow-sm"
                placeholder="Descreva o diagnóstico e a solução técnica..."
                value={osData.diagnostico || ""}
                onChange={(e) => {
                  setOsData({ ...osData, diagnostico: e.target.value });
                  setIsDirty(true);
                }}
              />
            </div>
          </Card>
        </div>

        {/* RIGHT COL: Labor Manager */}
        <div className="w-full space-y-2 h-full lg:col-span-2">
          <Card className="h-full p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest flex items-center gap-3 pb-4 border-b border-neutral-100 mb-2">
              <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                <BadgeCheck size={18} />
              </div>
              Mão de Obra (Execução)
            </h3>
            <LaborManager
              osId={osData.id_os}
              mode="api"
              employees={employees}
              initialData={osData.servicos_mao_de_obra as any[]}
              onChange={() => {
                fetchOsData(osData.id_os);
                setIsDirty(true);
              }}
              readOnly={false}
              onTotalChange={handleLaborTotalChange}
            />
          </Card>
        </div>
      </div>

      {/* PARTS COSTS */}
      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
          <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest flex items-center gap-3">
            <div className="p-1.5 bg-neutral-200 rounded-lg text-neutral-600">
              <Truck size={16} />
            </div>
            Custos de Peças (Fornecedores)
          </h4>
          <Button
            size="sm"
            onClick={() => setShowFornecedorModal(true)}
            className="text-sm"
          >
            <Plus size={12} className="mr-1" /> NOVO FORNECEDOR
          </Button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-neutral-50/50 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="p-4 w-1/3 border-b border-neutral-50">Peça</th>
              <th className="p-4 border-b border-neutral-50">Ref / Nota</th>
              <th className="p-4 border-b border-neutral-50">Fornecedor</th>
              <th className="p-4 w-44 border-b border-neutral-50">
                Custo (R$)
              </th>
              <th className="p-4 text-center w-20 border-b border-neutral-50">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {osData?.itens_os
              ?.filter((i) => !i.is_interno)
              .map((item) => (
                <tr
                  key={item.id_iten}
                  className="hover:bg-neutral-50/50 transition-colors group"
                >
                  <td className="p-4 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800 text-base">
                          {item.descricao}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Qtd: {item.quantidade} x{" "}
                          {formatCurrency(
                            Number(item.valor_total) / item.quantidade,
                          )}{" "}
                          ={" "}
                          <span className="text-emerald-600 font-bold">
                            {formatCurrency(Number(item.valor_total))}
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-mono font-bold text-gray-500">
                    {item.codigo_referencia || "-"}
                  </td>
                  <td className="p-4">
                    {item.pecas_estoque || item.id_pecas_estoque ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg border border-neutral-200 text-neutral-500 font-bold text-xs uppercase tracking-wider justify-center">
                        <Truck size={14} /> Estoque Próprio
                      </div>
                    ) : (
                      <select
                        className="w-full p-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
                        value={itemsState[item.id_iten]?.id_fornecedor || ""}
                        onChange={(e) =>
                          handleItemChange(
                            item.id_iten,
                            "id_fornecedor",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">-- Selecione --</option>
                        {fornecedores.map((f) => (
                          <option key={f.id_fornecedor} value={f.id_fornecedor}>
                            {f.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    {item.pecas_estoque || item.id_pecas_estoque ? (
                      <div className="opacity-50">
                        <div className="flex items-center border border-neutral-100 rounded-lg bg-neutral-50 px-3 py-2 w-full">
                          <span className="text-gray-400 text-xs font-bold mr-2">
                            R$
                          </span>
                          <input
                            disabled
                            value="0.00"
                            className="w-full bg-transparent text-sm font-bold text-gray-400 cursor-not-allowed outline-none"
                          />
                        </div>
                        <div className="text-sm text-gray-400 mt-1 text-center font-medium uppercase tracking-tighter">
                          {item.pecas_estoque
                            ? `Custo Orig: ${formatCurrency(Number(item.pecas_estoque.valor_custo))}`
                            : "Estoque"}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center border border-neutral-200 rounded-lg bg-white px-3 py-2 w-full focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all shadow-sm">
                        <span className="text-gray-400 text-xs font-bold mr-2">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={itemsState[item.id_iten]?.custo_real}
                          onChange={(e) =>
                            handleItemChange(
                              item.id_iten,
                              "custo_real",
                              e.target.value,
                            )
                          }
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val))
                              handleItemChange(
                                item.id_iten,
                                "custo_real",
                                val.toFixed(2),
                              );
                          }}
                          className="w-full text-base font-bold text-gray-900 outline-none placeholder-gray-300"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ActionButton
                        icon={Edit}
                        label="Editar"
                        onClick={() => handleOpenEditItem(item)}
                        variant="neutral"
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Excluir"
                        onClick={() => handleDeleteItemOS(item.id_iten)}
                        variant="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* INTERNAL CONSUMPTION (Hidden from client) */}
      <div className="border border-amber-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
          <h4 className="font-bold text-sm text-amber-800 uppercase tracking-widest flex items-center gap-3">
            <div className="p-1.5 bg-amber-200 rounded-lg text-amber-600">
              <Truck size={16} />
            </div>
            Consumo Interno de Peças (Custo Oficina)
          </h4>
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-700 hover:bg-amber-100 border border-amber-200 uppercase"
            onClick={handleOpenAddInternal}
          >
            <Plus size={14} className="mr-1" /> NOVO CUSTO INTERNO
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-amber-50/30 text-xs font-bold text-amber-600 uppercase tracking-widest">
              <tr>
                <th className="p-4 w-1/3">Descrição do Custo</th>
                <th className="p-4">Ref / Obs</th>
                <th className="p-4">Fornecedor</th>
                <th className="p-4 w-44">Custo Bruto (R$)</th>
                <th className="p-4 text-center w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {osData?.itens_os?.filter((i) => i.is_interno).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-amber-400 italic text-sm"
                  >
                    Nenhum custo interno registrado.
                  </td>
                </tr>
              ) : (
                osData.itens_os
                  .filter((i) => i.is_interno)
                  .map((item: any) => (
                    <tr
                      key={item.id_iten}
                      className="hover:bg-amber-50/20 transition-colors"
                    >
                      <td className="p-4 font-bold text-neutral-700">
                        {item.descricao}
                      </td>
                      <td className="p-4 text-xs font-mono text-neutral-400">
                        {item.codigo_referencia || "-"}
                      </td>
                      <td className="p-4">
                        <select
                          className="w-full p-2 bg-white border border-amber-100 rounded-lg text-sm"
                          value={itemsState[item.id_iten]?.id_fornecedor || ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id_iten,
                              "id_fornecedor",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">-- Selecione --</option>
                          {fornecedores.map((f: any) => (
                            <option
                              key={f.id_fornecedor}
                              value={f.id_fornecedor}
                            >
                              {f.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center border border-amber-100 rounded-lg bg-white px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={itemsState[item.id_iten]?.custo_real}
                            onChange={(e) =>
                              handleItemChange(
                                item.id_iten,
                                "custo_real",
                                e.target.value,
                              )
                            }
                            className="w-full text-base font-bold text-amber-700 outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ActionButton
                            icon={Edit}
                            label="Editar"
                            onClick={() => handleOpenEditItem(item)}
                            variant="neutral"
                          />
                          <ActionButton
                            icon={Trash2}
                            label="Excluir"
                            onClick={() => handleDeleteItemOS(item.id_iten)}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEBIMENTOS */}
      <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
          <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-widest">
            Recebimentos do Cliente
          </h4>
          <Button
            size="sm"
            variant="success"
            onClick={() => setPaymentModal({ isOpen: true, data: null })}
            className="text-sm"
          >
            <Plus size={12} className="mr-1" /> NOVO PAGAMENTO
          </Button>
        </div>
        <div className="p-6">
          {osData.pagamentos_cliente?.length === 0 ? (
            <p className="text-gray-400 text-base text-center italic">
              Nenhum recebimento registrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {osData.pagamentos_cliente?.map((pag) => (
                <div
                  key={pag.id_pagamento_cliente}
                  className={`flex flex-col gap-1 p-4 rounded-xl text-sm border group transition-all hover:shadow-md ${
                    pag.deleted_at
                      ? "bg-red-50/50 border-red-100 opacity-75 grayscale-[0.5]"
                      : "bg-neutral-50 border-neutral-100 hover:bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span
                        className={`font-black text-xl tracking-tight ${pag.deleted_at ? "text-red-400 line-through" : "text-emerald-600"}`}
                      >
                        {formatCurrency(Number(pag.valor))}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase mt-1">
                        <span
                          className={`tracking-wider px-2 py-0.5 rounded-md ${
                            pag.deleted_at
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {pag.metodo_pagamento}{" "}
                          {pag.deleted_at && "(CANCELADO)"}
                        </span>

                        {pag.metodo_pagamento === "PIX" &&
                          pag.conta_bancaria && (
                            <span className="flex items-center gap-1">
                              • {pag.conta_bancaria.nome_banco}
                            </span>
                          )}

                        {(pag.metodo_pagamento === "CREDITO" ||
                          pag.metodo_pagamento === "DEBITO") && (
                          <span className="flex items-center gap-1">
                            • {pag.operadora?.nome || "Operadora N/I"}
                            {pag.qtd_parcelas &&
                              pag.qtd_parcelas > 1 &&
                              ` (${pag.qtd_parcelas}x)`}
                          </span>
                        )}
                      </div>
                    </div>

                    {!pag.deleted_at && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            setPaymentModal({ isOpen: true, data: pag })
                          }
                          className="text-neutral-400 hover:text-primary-600 p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeletePayment(pag.id_pagamento_cliente)
                          }
                          className="text-neutral-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 border-t border-neutral-100 pt-3 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      📅 {new Date(pag.data_pagamento).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      🕒{" "}
                      {new Date(pag.data_pagamento).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {(pag.codigo_transacao || pag.bandeira_cartao) && (
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-100">
                        {pag.bandeira_cartao}{" "}
                        {pag.codigo_transacao
                          ? `| NSU: ${pag.codigo_transacao}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SUMMARY CARD */}
      <div className="bg-primary-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden mt-8">
        {/* Background Glow Effect */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
          <div>
            <p className="text-xs font-medium text-primary-100 uppercase tracking-widest mb-2 opacity-80">
              Custo Total (Peças + Interno)
            </p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(totalCusto)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-black bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider text-emerald-300">
                Lucro Líquido: {formatCurrency(lucro)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-primary-100 uppercase tracking-widest mb-2 opacity-80">
              Mão de Obra
            </p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(totalLaborRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-white uppercase tracking-widest mb-2">
              TOTAL À RECEBER
            </p>
            <p className="text-5xl font-bold text-white tracking-tighter drop-shadow-md">
              {formatCurrency(totalReceita)}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-block px-6 py-3 rounded-2xl font-black uppercase text-sm tracking-wider shadow-xl ${
                (osData.pagamentos_cliente?.reduce(
                  (acc, p) => (p.deleted_at ? acc : acc + Number(p.valor)),
                  0,
                ) || 0) >= totalReceita
                  ? "bg-emerald-500 text-white shadow-emerald-500/40"
                  : "bg-amber-500 text-white shadow-amber-500/40 animate-pulse"
              }`}
            >
              {(osData.pagamentos_cliente?.reduce(
                (acc, p) => (p.deleted_at ? acc : acc + Number(p.valor)),
                0,
              ) || 0) >= totalReceita
                ? "QUITADO"
                : "PENDENTE"}
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS (Inline now) */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Voltar
        </Button>

        <Button
          onClick={() => handleSave(false)}
          variant="primary"
          isLoading={loading}
        >
          <Save size={18} className="mr-2" /> Salvar Alterações
        </Button>

        <Button
          onClick={() => handleSave(true)}
          variant="success"
          isLoading={loading}
        >
          <BadgeCheck size={18} className="mr-2" /> Salvar e Consolidar
        </Button>
      </div>

      {/* MODALS */}
      {showFornecedorModal && (
        <Modal
          title="Novo Fornecedor"
          onClose={() => setShowFornecedorModal(false)}
        >
          <FornecedorForm
            onSuccess={() => {
              setShowFornecedorModal(false);
              loadFornecedores();
            }}
            onCancel={() => setShowFornecedorModal(false)}
          />
        </Modal>
      )}
      {paymentModal.isOpen && osData && (
        <Modal
          title={paymentModal.data ? "Editar Pagamento" : "Novo Pagamento"}
          onClose={() => setPaymentModal({ isOpen: false, data: null })}
        >
          <PagamentoClienteForm
            osId={osData.id_os}
            valorTotal={
              totalReceita -
              (osData.pagamentos_cliente
                ?.filter((p) => !p.deleted_at)
                .reduce((acc, p) => acc + Number(p.valor), 0) || 0) +
              (paymentModal.data ? Number(paymentModal.data.valor) : 0)
            }
            initialData={paymentModal.data}
            onSuccess={() => {
              setPaymentModal({ isOpen: false, data: null });
              fetchOsData(osData.id_os);
            }}
            onCancel={() => setPaymentModal({ isOpen: false, data: null })}
          />
        </Modal>
      )}

      {/* Edit Item Modal */}
      {editItemModal.isOpen && (
        <Modal
          title="Editar Item OS"
          onClose={() => setEditItemModal({ isOpen: false, item: null })}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={editItemForm.descricao}
                onChange={(e) =>
                  setEditItemForm({
                    ...editItemForm,
                    descricao: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div
              className={`grid ${editItemForm.is_interno ? "grid-cols-1" : "grid-cols-2"} gap-4`}
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={editItemForm.quantidade}
                  onChange={(e) =>
                    setEditItemForm({
                      ...editItemForm,
                      quantidade: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!editItemForm.is_interno && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Valor Unit. Venda
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editItemForm.valor_venda}
                    onChange={(e) =>
                      setEditItemForm({
                        ...editItemForm,
                        valor_venda: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Ref / Nota
              </label>
              <input
                type="text"
                value={editItemForm.codigo_referencia}
                onChange={(e) =>
                  setEditItemForm({
                    ...editItemForm,
                    codigo_referencia: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opcional"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditItemModal({ isOpen: false, item: null })}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveEditItem}>
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Internal Item Modal */}
      {addInternalModal.isOpen && (
        <Modal
          title="Novo Custo Interno"
          onClose={() => setAddInternalModal({ isOpen: false })}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={addInternalForm.descricao}
                onChange={(e) =>
                  setAddInternalForm({
                    ...addInternalForm,
                    descricao: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex. Material de Limpeza, Estopa, etc..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Quantidade
              </label>
              <input
                type="number"
                value={addInternalForm.quantidade}
                onChange={(e) =>
                  setAddInternalForm({
                    ...addInternalForm,
                    quantidade: Number(e.target.value),
                  })
                }
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Ref / Nota
              </label>
              <input
                type="text"
                value={addInternalForm.codigo_referencia}
                onChange={(e) =>
                  setAddInternalForm({
                    ...addInternalForm,
                    codigo_referencia: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opcional"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setAddInternalModal({ isOpen: false })}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveAddInternal}>
                Adicionar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmModal.isOpen && (
        <Modal
          title={confirmModal.title}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <p className="mb-6">{confirmModal.message}</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setConfirmModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmModal.onConfirm}>
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
