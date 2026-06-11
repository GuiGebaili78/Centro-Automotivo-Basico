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
import { OsItemForm } from "../components/os/OsItemForm";
import { OsItemsService } from "../services/osItems.service";
import { FinanceiroService } from "../services/financeiro.service";
import { Modal, Button, ActionButton, Card, Input, Select, TextArea } from "../components/ui";
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
    id_fornecedor?: number;
    id_pessoa?: number;
    custo_real: number;
    pago_ao_fornecedor: boolean;
    nf_numero?: string;
  }[];
}

interface IFornecedor {
  id_fornecedor: number;
  nome: string;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  nome_completo?: string | null;
}

interface ItemFinanceiroState {
  id_pagamento_peca?: number;
  id_fornecedor: string;
  custo_real: string;
  pago_fornecedor: boolean;
  nf_numero?: string;
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

  const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
  const [nfsFornecedor, setNfsFornecedor] = useState<Record<string, { loading: boolean; nfs: any[] }>>({});

  const loadNfsFornecedor = useCallback(async (id_fornecedor: string) => {
    if (!id_fornecedor) return;
    setNfsFornecedor((prev) => ({ ...prev, [id_fornecedor]: { loading: true, nfs: prev[id_fornecedor]?.nfs || [] } }));
    try {
      const res = await FinanceiroService.getNfsPendentes({ id_fornecedor: Number(id_fornecedor) });
      setNfsFornecedor((prev) => ({ ...prev, [id_fornecedor]: { loading: false, nfs: res.data || [] } }));
    } catch (error) {
      console.error(error);
      setNfsFornecedor((prev) => ({ ...prev, [id_fornecedor]: { loading: false, nfs: prev[id_fornecedor]?.nfs || [] } }));
    }
  }, []);

  useEffect(() => {
    const fornecedoresToLoad = new Set<string>();
    Object.values(itemsState).forEach((item) => {
      if (item.id_fornecedor && !nfsFornecedor[item.id_fornecedor]) {
        fornecedoresToLoad.add(item.id_fornecedor);
      }
    });

    fornecedoresToLoad.forEach((id) => {
      loadNfsFornecedor(id);
    });
  }, [itemsState, nfsFornecedor, loadNfsFornecedor]);

  const searchParts = async (query: string) => {
    if (query.length < 2) {
      setPartSearchResults([]);
      return;
    }
    try {
      const [stockRes, historyRes] = await Promise.all([
        OsItemsService.searchStock(query),
        OsItemsService.search(query),
      ]);

      const historyFormatted = historyRes.map((h: any) => ({
        id_pecas_estoque: null,
        nome: h.descricao,
        valor_venda: h.valor_venda,
        fabricante: "Histórico",
        isHistory: true,
      }));

      const combined = [...stockRes, ...historyFormatted];
      const unique = combined.filter(
        (v, i, a) => a.findIndex((t) => t.nome === v.nome) === i,
      );
      setPartSearchResults(unique);
    } catch (e) {
      console.error(e);
    }
  };

  const checkStockAvailability = async (stockId: string | number) => {
    try {
      return await OsItemsService.checkAvailability(Number(stockId));
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleAddItem = async (itemData: any) => {
    if (!osData) return false;
    try {
      const payload = {
        id_os: Number(osData.id_os),
        id_pecas_estoque: itemData.id_pecas_estoque
          ? Number(itemData.id_pecas_estoque)
          : null,
        descricao: itemData.descricao,
        quantidade: Number(itemData.quantidade),
        valor_venda: Number(itemData.valor_venda),
        valor_total: Number(itemData.quantidade) * Number(itemData.valor_venda),
        codigo_referencia: itemData.codigo_referencia,
        id_fornecedor: itemData.id_fornecedor
          ? Number(itemData.id_fornecedor)
          : null,
        is_interno: itemData.is_interno,
      };

      await OsItemsService.create(payload);
      toast.success("Item adicionado com sucesso!");
      fetchOsData(osData.id_os);
      setIsDirty(true);
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar item.");
      return false;
    }
  };

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

        const existingPaymentIdPessoa = existingPayment
          ? (existingPayment.id_pessoa || existingPayment.id_fornecedor)
          : null;

        initialItemsState[item.id_iten] = {
          id_pagamento_peca: existingPayment?.id_pagamento_peca,
          id_fornecedor: existingPaymentIdPessoa
            ? String(existingPaymentIdPessoa)
            : "",
          custo_real: initialCost,
          pago_fornecedor: existingPayment
            ? existingPayment.pago_ao_fornecedor
            : false,
          nf_numero: existingPayment?.nf_numero || "",
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
        faturamentoPecasExternas: 0,
        custoPecasExternas: 0,
        faturamentoEstoque: 0,
        custoEstoque: 0,
        faturamentoMaoDeObra: 0,
        consumoInterno: 0,
      };

    let faturamentoPecasExternas = 0;
    let custoPecasExternas = 0;
    let faturamentoEstoque = 0;
    let custoEstoque = 0;
    let faturamentoMaoDeObra = 0;
    let consumoInterno = 0;

    osData.itens_os.forEach((i) => {
      const valorVenda = Number(i.valor_total);
      const custoReal = Number(
        itemsState[i.id_iten]?.custo_real || i.pecas_estoque?.valor_custo || 0
      );

      if (i.id_pecas_estoque) {
        if (i.is_interno) {
           consumoInterno += custoReal;
        } else {
           faturamentoEstoque += valorVenda;
           custoEstoque += custoReal;
        }
      } else {
        if (i.is_interno) {
           consumoInterno += custoReal;
        } else {
           faturamentoPecasExternas += valorVenda;
           custoPecasExternas += custoReal;
        }
      }
    });

    faturamentoMaoDeObra = osData.servicos_mao_de_obra?.reduce(
      (acc, s) => acc + Number(s.valor),
      0,
    ) || 0;

    const totalReceita = faturamentoPecasExternas + faturamentoEstoque + faturamentoMaoDeObra;
    const totalCusto = custoPecasExternas + custoEstoque + consumoInterno;
    const lucro = totalReceita - totalCusto;
    const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

    return {
      totalReceita,
      totalCusto,
      lucro,
      margem,
      faturamentoPecasExternas,
      custoPecasExternas,
      faturamentoEstoque,
      custoEstoque,
      faturamentoMaoDeObra,
      consumoInterno,
    };
  };

  const {
    totalReceita,
    totalCusto,
    lucro,
    faturamentoPecasExternas,
    custoPecasExternas,
    faturamentoEstoque,
    custoEstoque,
    faturamentoMaoDeObra,
    consumoInterno,
  } = calculateTotals();

  const handleSave = async (finalize: boolean = false) => {
    setLoading(true);
    if (!osData) return;

    try {
      const pagamentoPromises = osData.itens_os.map(async (item) => {
        const st = itemsState[item.id_iten];
        if (!st) return null;

        const hasFornecedor = st.id_fornecedor && st.id_fornecedor.trim() !== "";
        const hasCusto = st.custo_real && st.custo_real.trim() !== "";

        // Only save if there is a cost or if there is an existing payment being modified
        if (hasCusto || st.id_pagamento_peca) {
          const payload = {
            id_item_os: Number(item.id_iten),
            id_fornecedor: hasFornecedor ? Number(st.id_fornecedor) : undefined,
            id_pessoa: hasFornecedor ? Number(st.id_fornecedor) : undefined,
            custo_real: Number(st.custo_real),
            data_compra: new Date().toISOString(),
            pago_ao_fornecedor: Boolean(st.pago_fornecedor),
          };

          if (st.id_pagamento_peca) {
            return api.put(`/pagamento-peca/${st.id_pagamento_peca}`, payload);
          } else if (hasFornecedor) {
            // Only create new payment record if a valid supplier is selected
            return api.post("/pagamento-peca", payload);
          }
        }
        return null;
      });

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
            valor_pecas: faturamentoPecasExternas + faturamentoEstoque,
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
        "Tem certeza que deseja reabrir esta OS? Se existirem recebimentos já lançados no Caixa, o sistema bloqueará a ação. O Fechamento Financeiro será revertido e o status voltará para ABERTA.",
      onConfirm: async () => {
        try {
          await api.post(`/ordem-de-servico/${osData.id_os}/reabrir`);
          toast.success("OS Reaberta com sucesso! Você será redirecionado.");
          setTimeout(() => navigate(`/ordem-de-servico/${osData.id_os}`), 1000);
        } catch (error: any) {
          console.error(error);
          const msg =
            error.response?.data?.details ||
            error.response?.data?.error ||
            "Erro ao reabrir OS.";
          toast.error(`Falha: ${msg}`, { autoClose: 7000 });
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
            <ActionButton
              icon={ArrowLeft}
              label="Voltar"
              onClick={() => navigate("/fechamento-financeiro")}
              variant="neutral"
            />

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
              <ActionButton
                icon={Edit}
                label="Editar Veículo"
                onClick={() =>
                  navigate(`/cadastro/${osData.cliente?.id_cliente}`)
                }
                variant="primary"
              />
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
              <ActionButton
                icon={Edit}
                label="Editar Cliente"
                onClick={() =>
                  navigate(`/cadastro/${osData.cliente?.id_cliente}`)
                }
                variant="primary"
              />
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
              <TextArea
                className="w-full !bg-green-100 border !border-green-300 text-emerald-950 p-3 rounded-xl text-base font-medium h-32 outline-none resize-none transition-all focus:shadow-sm print:bg-transparent print:text-black placeholder-shown:!bg-neutral-50 placeholder-shown:!border-neutral-200 placeholder-shown:text-neutral-700 placeholder-shown:focus:!border-red-300 placeholder-shown:focus:!bg-white"
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
              <TextArea
                className="w-full !bg-green-100 border !border-green-300 text-emerald-950 p-3 rounded-xl text-base font-medium h-32 outline-none resize-none transition-all focus:shadow-sm print:bg-transparent print:text-black placeholder-shown:!bg-neutral-50 placeholder-shown:!border-neutral-200 placeholder-shown:text-neutral-700 placeholder-shown:focus:!border-blue-300 placeholder-shown:focus:!bg-white"
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
        <table className="tabela-limpa w-full text-left border-separate border-spacing-y-2">
          <thead className="bg-neutral-50/50 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="p-4 w-1/3 border-b border-neutral-50">Peça</th>
              <th className="p-4 border-b border-neutral-50">Ref / Nota</th>
              <th className="p-4 border-b border-neutral-50">Fornecedor</th>
              <th className="p-4 border-b border-neutral-50">Nota Fiscal</th>
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
                  className="group !bg-green-100 [&>td]:!bg-green-100 hover:[&>td]:!bg-green-100 [&>td]:border-t [&>td]:border-b [&>td]:!border-green-300 [&>td:first-child]:border-l [&>td:last-child]:border-r transition-none border-b-0 print:bg-transparent print:[&>td]:border-transparent"
                >
                  <td className="p-4 relative first:rounded-l-lg last:rounded-r-lg">
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
                  <td className="p-4 text-xs font-mono font-bold text-gray-500 first:rounded-l-lg last:rounded-r-lg">
                    {item.codigo_referencia || "-"}
                  </td>
                  <td className="p-4 first:rounded-l-lg last:rounded-r-lg">
                    {item.pecas_estoque || item.id_pecas_estoque ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg border border-neutral-200 text-neutral-500 font-bold text-xs uppercase tracking-wider justify-center">
                        <Truck size={14} /> Estoque Próprio
                      </div>
                    ) : (
                      <Select
                        className="!py-1.5 !px-3 !text-sm"
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
                            {String(f.nome_fantasia || f.razao_social || f.nome_completo || f.nome || "").toUpperCase()}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className="p-4 first:rounded-l-lg last:rounded-r-lg">
                    {item.pecas_estoque || item.id_pecas_estoque ? (
                       <span className="text-xs text-neutral-400 font-medium">-</span>
                    ) : (
                      <Select
                        className="!py-1.5 !px-3 !text-sm max-w-[150px]"
                        value={itemsState[item.id_iten]?.nf_numero || ""}
                        disabled={!itemsState[item.id_iten]?.id_fornecedor || nfsFornecedor[itemsState[item.id_iten]?.id_fornecedor]?.loading}
                        onChange={(e) =>
                          handleItemChange(
                            item.id_iten,
                            "nf_numero",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">Nenhuma NF</option>
                        {itemsState[item.id_iten]?.id_fornecedor && nfsFornecedor[itemsState[item.id_iten]?.id_fornecedor]?.nfs.map((nf) => (
                          <option key={nf.nf_numero} value={nf.nf_numero}>
                            {nf.nf_numero} ({formatCurrency(nf.valor)})
                          </option>
                        ))}
                      </Select>
                    )}
                    {itemsState[item.id_iten]?.id_fornecedor && nfsFornecedor[itemsState[item.id_iten]?.id_fornecedor]?.loading && (
                      <div className="text-[10px] text-gray-400 mt-1 animate-pulse">Carregando...</div>
                    )}
                  </td>
                  <td className="p-4 first:rounded-l-lg last:rounded-r-lg">
                    {item.pecas_estoque || item.id_pecas_estoque ? (
                      <div className="opacity-50">
                        <div className="flex items-center border border-neutral-100 rounded-lg bg-neutral-50 px-3 py-2 w-full">
                          <span className="text-gray-400 text-xs font-bold mr-2">
                            R$
                          </span>
                          <Input
                            disabled
                            value="0.00"
                            className="!p-0 bg-transparent border-0 focus:ring-0 text-sm font-bold text-gray-400 cursor-not-allowed"
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
                        <Input
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
                          className="!p-0 bg-transparent border-0 focus:ring-0 text-sm font-bold text-gray-900"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center first:rounded-l-lg last:rounded-r-lg">
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
          <table className="tabela-limpa w-full text-left border-separate border-spacing-y-2">
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
                      className="group !bg-green-100 [&>td]:!bg-green-100 hover:[&>td]:!bg-green-100 [&>td]:border-t [&>td]:border-b [&>td]:!border-green-300 [&>td:first-child]:border-l [&>td:last-child]:border-r transition-none border-b-0 print:bg-transparent print:[&>td]:border-transparent"
                    >
                      <td className="p-4 font-bold text-neutral-700 first:rounded-l-lg last:rounded-r-lg">
                        {item.descricao}
                      </td>
                      <td className="p-4 text-xs font-mono text-neutral-400 first:rounded-l-lg last:rounded-r-lg">
                        {item.codigo_referencia || "-"}
                      </td>
                      <td className="p-4 first:rounded-l-lg last:rounded-r-lg">
                        <Select
                          className="!py-1.5 !px-3 !text-sm"
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
                              {String(f.nome_fantasia || f.razao_social || f.nome_completo || f.nome || "").toUpperCase()}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-4 first:rounded-l-lg last:rounded-r-lg">
                        <div className="flex items-center border border-amber-100 rounded-lg bg-white px-3 py-2">
                          <Input
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
                            className="!p-0 bg-transparent border-0 focus:ring-0 text-sm font-bold text-amber-700"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center first:rounded-l-lg last:rounded-r-lg">
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
                        <ActionButton
                          icon={Edit}
                          label="Editar"
                          onClick={() => setPaymentModal({ isOpen: true, data: pag })}
                          variant="accent"
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Excluir"
                          onClick={() => handleDeletePayment(pag.id_pagamento_cliente)}
                          variant="danger"
                        />
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
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-primary-100 uppercase tracking-widest mb-1 opacity-80">
              Peças Externas
            </p>
            <p className="text-sm text-primary-200">
              Fat: {formatCurrency(faturamentoPecasExternas)}
            </p>
            <p className="text-sm text-red-300">
              Custo: {formatCurrency(custoPecasExternas)}
            </p>
            <p className="text-sm font-bold text-emerald-300 mt-1">
              Lucro: {formatCurrency(faturamentoPecasExternas - custoPecasExternas)}
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-primary-100 uppercase tracking-widest mb-1 opacity-80">
              Estoque Próprio
            </p>
            <p className="text-sm text-primary-200">
              Fat: {formatCurrency(faturamentoEstoque)}
            </p>
            <p className="text-sm text-red-300">
              Custo: {formatCurrency(custoEstoque)}
            </p>
            <p className="text-sm font-bold text-emerald-300 mt-1">
              Lucro: {formatCurrency(faturamentoEstoque - custoEstoque)}
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-primary-100 uppercase tracking-widest mb-1 opacity-80">
              Mão de Obra
            </p>
            <p className="text-sm text-primary-200">
              Fat: {formatCurrency(faturamentoMaoDeObra)}
            </p>
            <p className="text-sm text-primary-200">
              Custo: Já abatido das comissões
            </p>
            <p className="text-sm font-bold text-emerald-300 mt-1">
              Lucro Bruto M.O: {formatCurrency(faturamentoMaoDeObra)}
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-primary-100 uppercase tracking-widest mb-1 opacity-80">
              Consumo Interno / Prejuízo
            </p>
            <p className="text-sm text-primary-200">
              Fat: R$ 0,00 (Não cobrado)
            </p>
            <p className="text-sm font-bold text-red-300 mt-1">
              Custo Oficina: -{formatCurrency(consumoInterno)}
            </p>
          </div>

          <div className="bg-white/20 rounded-xl p-4 flex flex-col justify-center items-end border border-white/30">
            <p className="text-xs font-medium text-white uppercase tracking-widest mb-1">
              LUCRO LÍQUIDO FINAL
            </p>
            <p className="text-3xl font-black text-white tracking-tighter drop-shadow-md">
              {formatCurrency(lucro)}
            </p>
            <div className="flex justify-end gap-2 mt-2 w-full">
               <div
                  className={`inline-block px-3 py-1 rounded font-black uppercase text-[10px] tracking-wider ${
                    (osData.pagamentos_cliente?.reduce(
                      (acc, p) => (p.deleted_at ? acc : acc + Number(p.valor)),
                      0,
                    ) || 0) >= totalReceita
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-500 text-white animate-pulse"
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
          className="max-w-4xl"
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
            <Input
              label="Descrição"
              type="text"
              value={editItemForm.descricao}
              onChange={(e) =>
                setEditItemForm({
                  ...editItemForm,
                  descricao: e.target.value,
                })
              }
            />
            <div
              className={`grid ${editItemForm.is_interno ? "grid-cols-1" : "grid-cols-2"} gap-4`}
            >
              <Input
                label="Quantidade"
                type="number"
                value={editItemForm.quantidade}
                onChange={(e) =>
                  setEditItemForm({
                    ...editItemForm,
                    quantidade: Number(e.target.value),
                  })
                }
              />
              {!editItemForm.is_interno && (
                <Input
                  label="Valor Unit. Venda"
                  type="number"
                  step="0.1"
                  value={editItemForm.valor_venda}
                  onChange={(e) =>
                    setEditItemForm({
                      ...editItemForm,
                      valor_venda: Number(e.target.value),
                    })
                  }
                />
              )}
            </div>
            <Input
              label="Ref / Nota"
              type="text"
              value={editItemForm.codigo_referencia}
              onChange={(e) =>
                setEditItemForm({
                  ...editItemForm,
                  codigo_referencia: e.target.value,
                })
              }
              placeholder="Opcional"
            />
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
            <Input
              label="Descrição"
              type="text"
              value={addInternalForm.descricao}
              onChange={(e) =>
                setAddInternalForm({
                  ...addInternalForm,
                  descricao: e.target.value,
                })
              }
              placeholder="Ex. Material de Limpeza, Estopa, etc..."
            />
            <Input
              label="Quantidade"
              type="number"
              value={addInternalForm.quantidade}
              onChange={(e) =>
                setAddInternalForm({
                  ...addInternalForm,
                  quantidade: Number(e.target.value),
                })
              }
            />
            <Input
              label="Ref / Nota"
              type="text"
              value={addInternalForm.codigo_referencia}
              onChange={(e) =>
                setAddInternalForm({
                  ...addInternalForm,
                  codigo_referencia: e.target.value,
                })
              }
              placeholder="Opcional"
            />
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
