import { useState, useEffect, type FormEvent } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import {
  Calculator,
  Save,
  Truck,
  Plus,
  BadgeCheck,
  Trash2,
  Pen,
  User,
  Car,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { PagamentoClienteForm } from "./PagamentoClienteForm";
import { FornecedorForm } from "./FornecedorForm";
import { LaborManager } from "../os/LaborManager";
import { Modal } from "../ui/Modal";
import { StatusBanner } from "../ui/StatusBanner";
import { Button } from "../ui/Button";
import { ActionButton } from "../ui/ActionButton";

interface FechamentoFinanceiroFormProps {
  preSelectedOsId?: number | null;
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
}

interface ItemOS {
  id_iten: number;
  id_pecas_estoque?: number;
  valor_total: number;
  descricao: string;
  quantidade: number;
  codigo_referencia?: string;
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
  id_pagamento_peca?: number; // ID se já existir
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
  cliente: {
    pessoa_fisica?: { pessoa: { nome: string } };
    pessoa_juridica?: { nome_fantasia: string };
    telefone_1?: string;
  };
  veiculo: {
    placa: string;
    modelo: string;
    cor: string;
  };
  pagamentos_cliente?: {
    id_pagamento_cliente: number;
    metodo_pagamento: string;
    valor: number;
    data_pagamento: string;
    bandeira_cartao?: string;
    codigo_transacao?: string;
    qtd_parcelas?: number;
    deleted_at?: string;
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

export const FechamentoFinanceiroForm = ({
  preSelectedOsId,
  onSuccess,
  onCancel,
}: FechamentoFinanceiroFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingOs, setFetchingOs] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  const [idOs, setIdOs] = useState(
    preSelectedOsId ? String(preSelectedOsId) : "",
  );
  const [osData, setOsData] = useState<OSData | null>(null);
  const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);

  const [itemsState, setItemsState] = useState<
    Record<number, ItemFinanceiroState>
  >({});
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [editItem, setEditItem] = useState<ItemOS | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    data: any;
  }>({ isOpen: false, data: null });

  const handleDeletePayment = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Pagamento",
      message: "Tem certeza que deseja excluir este pagamento?",
      onConfirm: async () => {
        try {
          await api.delete(`/pagamento-cliente/${id}`);
          setStatusMsg({ type: "success", text: "Pagamento removido!" });
          if (osData) fetchOsData(osData.id_os);
        } catch (error) {
          setStatusMsg({ type: "error", text: "Erro ao remover pagamento." });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Employees State (for LaborManager)
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadFornecedores();
    loadEmployees();
    if (preSelectedOsId) {
      fetchOsData(preSelectedOsId);
    }
  }, [preSelectedOsId]);

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
      // Ensure we map to the format expected by select options or LaborManager
      setEmployees(response.data);
    } catch (error) {
      console.error("Erro ao carregar funcionários");
    }
  };

  const fetchOsData = async (id: number) => {
    setFetchingOs(true);
    setStatusMsg({ type: null, text: "" });
    try {
      const response = await api.get(`/ordem-de-servico/${id}`);
      const os: OSData = response.data;
      setOsData(os);

      const initialItemsState: Record<number, ItemFinanceiroState> = {};
      os.itens_os.forEach((item) => {
        const existingPayment =
          item.pagamentos_peca && item.pagamentos_peca.length > 0
            ? item.pagamentos_peca[0]
            : null;

        const initialCost = existingPayment
          ? Number(existingPayment.custo_real).toFixed(2)
          : item.pecas_estoque?.valor_custo
            ? "0.00" // Stock parts are already paid, so cost for this closing is 0
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
    } catch (error) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: "OS não encontrada ou erro ao buscar dados.",
      });
    } finally {
      setFetchingOs(false);
    }
  };

  const handleSearchOs = () => {
    if (!idOs) return;
    fetchOsData(Number(idOs));
  };

  // Auto-save logic
  const saveItemCost = async (
    id_iten: number,
    partialState: ItemFinanceiroState,
  ) => {
    const item = osData?.itens_os.find((i) => i.id_iten === id_iten);
    // Don't save if stock item (double check)
    if (item?.pecas_estoque) return;

    if (!item || !partialState.id_fornecedor || !partialState.custo_real)
      return;

    try {
      const payload = {
        id_item_os: id_iten,
        id_fornecedor: Number(partialState.id_fornecedor),
        custo_real: Number(partialState.custo_real),
        data_compra: new Date().toISOString(),
        pago_ao_fornecedor: partialState.pago_fornecedor,
      };

      if (partialState.id_pagamento_peca) {
        await api.put(
          `/pagamento-peca/${partialState.id_pagamento_peca}`,
          payload,
        );
      } else {
        const res = await api.post("/pagamento-peca", payload);
        // Update the state with the new ID to avoid duplicates on next save
        setItemsState((prev) => ({
          ...prev,
          [id_iten]: {
            ...prev[id_iten],
            id_pagamento_peca: res.data.id_pagamento_peca,
          },
        }));
      }
    } catch (error) {
      console.error("Erro no auto-save do item", error);
    }
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
  };

  const handleItemBlur = (id_iten: number) => {
    let state = itemsState[id_iten];
    if (state) {
      // Format to 2 decimals
      if (state.custo_real && !isNaN(Number(state.custo_real))) {
        const formatted = Number(state.custo_real).toFixed(2);
        if (formatted !== state.custo_real) {
          setItemsState((prev) => ({
            ...prev,
            [id_iten]: { ...prev[id_iten], custo_real: formatted },
          }));
          state = { ...state, custo_real: formatted };
        }
      }
      saveItemCost(id_iten, state);
    }
  };

  // ITEM EDITING
  const handleSaveItemEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editItem || !osData) return;

    try {
      const valorTotal =
        Number(editItem.quantidade) *
        Number((editItem as any).valor_venda_unitario);

      await api.put(`/itens-os/${editItem.id_iten}`, {
        descricao: editItem.descricao,
        quantidade: Number(editItem.quantidade),
        valor_venda: Number((editItem as any).valor_venda_unitario),
        valor_total: valorTotal,
        codigo_referencia: editItem.codigo_referencia,
      });

      // Refresh Data
      fetchOsData(osData.id_os);
      setEditItem(null);
      setStatusMsg({ type: "success", text: "Item atualizado!" });
      setTimeout(() => setStatusMsg({ type: null, text: "" }), 2000);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao atualizar item." });
    }
  };

  const handleDeleteItemOS = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Item",
      message: "Tem certeza que deseja remover este item da OS?",
      onConfirm: async () => {
        try {
          await api.delete(`/itens-os/${id}`);
          setStatusMsg({ type: "success", text: "Item removido com sucesso!" });
          if (osData) fetchOsData(osData.id_os);
        } catch (error) {
          setStatusMsg({ type: "error", text: "Erro ao remover item." });
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const calculateTotals = () => {
    if (!osData) return { totalReceita: 0, totalCusto: 0, lucro: 0, margem: 0 };

    // Recalculate total revenue based on items + labor (since items might have changed)
    const totalItemsRevenue = osData.itens_os.reduce(
      (acc, item) => acc + Number(item.valor_total),
      0,
    );
    const totalReceita =
      totalItemsRevenue + Number(osData.valor_mao_de_obra || 0);

    let totalCusto = 0;
    Object.values(itemsState).forEach((st) => {
      totalCusto += Number(st.custo_real || 0);
    });

    const lucro = totalReceita - totalCusto;
    const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

    return { totalReceita, totalCusto, lucro, margem, totalItemsRevenue };
  };

  const { totalReceita, totalCusto, lucro, totalItemsRevenue } =
    calculateTotals();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!osData) return;

    try {
      // Validação: Verificar se há pagamentos registrados (Receita)
      const totalPago =
        osData.pagamentos_cliente?.reduce(
          (acc, p) => (p.deleted_at ? acc : acc + Number(p.valor)),
          0,
        ) || 0;

      if (totalPago === 0) {
        setStatusMsg({
          type: "error",
          text: "Nenhum recebimento registrado. Adicione o pagamento do cliente (seção Recebimentos) antes de finalizar.",
        });
        setLoading(false);
        return;
      }

      // 1. Processar Pagamentos (Upsert)
      const pagamentoPromises = osData.itens_os.map(async (item) => {
        const st = itemsState[item.id_iten];

        // Validação de preenchimento dos custos (Ignorar se for peça de estoque)
        if (
          (!st ||
            !st.id_fornecedor ||
            !st.custo_real ||
            Number(st.custo_real) <= 0) &&
          !item.pecas_estoque
        ) {
          throw new Error(
            `Item "${item.descricao}" está sem Fornecedor ou Custo Real definido.`,
          );
        }

        // Salvar apenas se NÃO for peca de estoque
        if (
          st &&
          st.id_fornecedor &&
          Number(st.custo_real) > 0 &&
          !item.pecas_estoque
        ) {
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

      // 2. Atualizar status da OS para PRONTO PARA FINANCEIRO (ANTES de consolidar)
      if (
        osData.status !== "FINALIZADA" &&
        osData.status !== "PRONTO PARA FINANCEIRO"
      ) {
        try {
          await api.put(`/ordem-de-servico/${idOs}`, {
            status: "PRONTO PARA FINANCEIRO",
            valor_final: totalReceita,
            valor_pecas: totalItemsRevenue,
          });
        } catch (err) {
          console.error("Erro ao atualizar status da OS:", err);
        }
      }

      // 3. CONSOLIDAR FINANCEIRAMENTE (Novo endpoint que faz TUDO)
      const consolidarPayload = {
        idOs: Number(idOs),
        custoTotalPecasReal: totalCusto,
      };

      let response;
      if (osData.fechamento_financeiro) {
        // Se já existe fechamento, apenas atualiza os custos
        response = await api.put(
          `/fechamento-financeiro/${osData.fechamento_financeiro.id_fechamento_financeiro}`,
          {
            id_os: Number(idOs),
            custo_total_pecas_real: totalCusto,
          },
        );
      } else {
        // Se não existe, CONSOLIDA (cria fechamento + lançamentos no caixa + atualiza saldos + cria recebíveis)
        response = await api.post(
          "/fechamento-financeiro/consolidar",
          consolidarPayload,
        );
      }

      onSuccess(response.data);
      navigate("/");
    } catch (error: any) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text: error.message || "Erro ao processar fechamento financeiro.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClientName = () =>
    osData?.cliente?.pessoa_fisica?.pessoa?.nome ||
    osData?.cliente?.pessoa_juridica?.nome_fantasia ||
    "Cliente";

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "FINALIZADA":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
      case "PAGA_CLIENTE":
        return "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200";
      case "PRONTO PARA FINANCEIRO":
        return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
      case "ABERTA":
        return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
      case "EM_ANDAMENTO":
        return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
      default:
        return "bg-gray-50 text-gray-500 ring-1 ring-gray-200";
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 relative">
        <StatusBanner
          msg={statusMsg}
          onClose={() => setStatusMsg({ type: null, text: "" })}
        />

        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 border border-gray-100 flex gap-3">
          <Calculator className="text-gray-400 shrink-0" />
          <div>
            <strong className="block text-gray-900 mb-1">
              Consolidação Financeira
            </strong>
            {osData?.fechamento_financeiro
              ? "Edite os custos lançados anteriormente."
              : "Lance os custos reais de cada peça para calcular o lucro exato desta OS."}
          </div>
        </div>

        {!preSelectedOsId && (
          <div className="flex gap-2">
            <input
              type="number"
              value={idOs}
              onChange={(e) => setIdOs(e.target.value)}
              className="flex-1 border-2 border-gray-100 p-3 rounded-xl focus:border-gray-900 focus:outline-none transition-colors font-bold"
              required
              placeholder="Digite o ID da OS..."
            />
            <button
              type="button"
              onClick={handleSearchOs}
              className="bg-gray-900 text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
              Buscar OS
            </button>
          </div>
        )}

        {fetchingOs && (
          <div className="text-center p-4 text-gray-500">
            Carregando dados da OS...
          </div>
        )}

        {osData && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* OS Summary Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* HEADER */}
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase bg-gray-900 text-white tracking-wide">
                    OS Nº {osData.id_os}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase whitespace-nowrap ${getStatusStyle(osData.status)}`}
                  >
                    {osData.status === "PRONTO PARA FINANCEIRO"
                      ? "FINANCEIRO"
                      : osData.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Data de Entrada:{" "}
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    {new Date(
                      osData.dt_abertura || new Date(),
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* GRID INFO */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* COL 1: Client & Vehicle (Span 5) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl h-fit">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Cliente
                      </p>
                      <h3 className="font-black text-lg text-gray-900 leading-tight">
                        {getClientName()}
                      </h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">
                        {osData.cliente.telefone_1 || "Sem telefone"}
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-100 w-full" />
                  <div className="flex gap-4">
                    <div className="bg-orange-50 p-3 rounded-xl h-fit">
                      <Car className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Veículo
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-xl text-gray-800 uppercase">
                          {osData.veiculo.placa}
                        </span>
                        <span className="text-sm font-bold text-gray-500 uppercase">
                          {osData.veiculo.modelo}
                        </span>
                      </div>
                      {osData.veiculo.cor && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="text-xs font-bold text-gray-500 uppercase">
                            {osData.veiculo.cor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* COL 2: Defect & Diagnosis (Span 4) */}
                <div className="lg:col-span-4 space-y-4 lg:border-l lg:border-gray-100 lg:pl-8 lg:border-dashed">
                  <div>
                    <p className="text-[10px] font-black text-red-400 uppercase mb-1 tracking-wider flex items-center gap-2">
                      <AlertCircle size={12} /> Defeito Relatado
                    </p>
                    <div className="text-sm font-medium text-gray-700 leading-relaxed bg-red-50/30 p-3 rounded-lg border border-red-50">
                      {osData.defeito_relatado || (
                        <span className="italic text-gray-400">
                          Não informado
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-wider flex items-center gap-2">
                      <Wrench size={12} /> Diagnóstico Técnico
                    </p>
                    <div className="text-sm font-medium text-gray-700 leading-relaxed bg-blue-50/30 p-3 rounded-lg border border-blue-50">
                      {osData.diagnostico || (
                        <span className="italic text-gray-400">
                          Não informado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* COL 3: Revenue (Span 3) */}
                <div className="lg:col-span-3 flex flex-col justify-center items-end text-right lg:border-l lg:border-gray-100 lg:border-dashed lg:pl-8">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Receita Total
                  </p>
                  <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 mb-2">
                    <p className="text-4xl font-black text-green-600 tracking-tight">
                      {formatCurrency(totalReceita)}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400">
                    Valor Final (Peças + Mão de Obra)
                  </p>
                </div>
              </div>

              {/* SEPARATOR */}
              <div className="h-px bg-gray-100 mx-6 mb-6" />

              {/* LABOR MANAGER */}
              <div className="px-6 pb-6">
                <div className="border border-blue-100 rounded-xl overflow-hidden text-left bg-blue-50/30">
                  <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                      <BadgeCheck size={14} /> Mão de Obra (Execução)
                    </span>
                  </div>
                  <div className="p-3">
                    <LaborManager
                      osId={osData.id_os}
                      mode="api"
                      employees={employees}
                      initialData={osData.servicos_mao_de_obra as any[]}
                      onChange={() => fetchOsData(osData.id_os)}
                      readOnly={false}
                      onTotalChange={(total) => {
                        setOsData((prev) => {
                          if (!prev || prev.valor_mao_de_obra === total)
                            return prev;
                          return { ...prev, valor_mao_de_obra: total };
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">
                  Detalhamento de Custos (Peças)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFornecedorModal(true)}
                  className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Novo Fornecedor
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-xs font-bold text-gray-400 uppercase">
                  <tr>
                    <th className="p-4 w-1/3">Item / Peça</th>
                    <th className="p-4">Ref / Nota</th>
                    <th className="p-4">Fornecedor (Origem)</th>
                    <th className="p-4 w-32">Custo Real (R$)</th>
                    <th className="p-4 text-center w-20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {osData.itens_os.map((item) => (
                    <tr
                      key={item.id_iten}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="p-4 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">
                              {item.descricao}
                            </p>
                            <p className="text-xs text-gray-400">
                              Qtd: {item.quantidade} x{" "}
                              {formatCurrency(
                                Number(item.valor_total) / item.quantidade,
                              )}{" "}
                              ={" "}
                              <span className="text-green-600 font-bold">
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
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={
                              itemsState[item.id_iten]?.id_fornecedor || ""
                            }
                            onChange={(e) =>
                              handleItemChange(
                                item.id_iten,
                                "id_fornecedor",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleItemBlur(item.id_iten)}
                          >
                            <option value="">-- Selecione --</option>
                            {fornecedores.map((f) => (
                              <option
                                key={f.id_fornecedor}
                                value={f.id_fornecedor}
                              >
                                {f.nome}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-4">
                        {item.pecas_estoque || item.id_pecas_estoque ? (
                          <div className="relative opacity-50">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                              R$
                            </span>
                            <input
                              disabled
                              value="0.00"
                              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-400 bg-gray-50 cursor-not-allowed"
                            />
                            <div className="text-[9px] text-gray-400 mt-1 text-center font-medium">
                              {item.pecas_estoque
                                ? `Custo Orig: ${formatCurrency(Number(item.pecas_estoque.valor_custo))}`
                                : "Estoque"}
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
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
                              onBlur={() => handleItemBlur(item.id_iten)}
                              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton
                            icon={Pen}
                            label="Editar Item"
                            onClick={() =>
                              setEditItem({
                                ...item,
                                valor_venda_unitario:
                                  Number(item.valor_total) / item.quantidade,
                              } as any)
                            }
                            variant="accent"
                          />
                          <ActionButton
                            icon={Trash2}
                            label="Excluir Item"
                            onClick={() => handleDeleteItemOS(item.id_iten)}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {osData.itens_os.length === 0 && (
                <div className="p-8 text-center text-gray-400 font-medium">
                  Nenhum item lançado nesta OS.
                </div>
              )}
            </div>

            {/* PAGAMENTOS RECEBIDOS (CRUD) */}
            <div className="border border-green-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
              <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex justify-between items-center">
                <h4 className="font-bold text-sm text-green-800 uppercase tracking-wide">
                  Recebimentos (Pagamentos do Cliente)
                </h4>
                <button
                  type="button"
                  onClick={() => setPaymentModal({ isOpen: true, data: null })}
                  className="text-[10px] font-black uppercase text-green-700 bg-white border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Novo Pagamento
                </button>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-white border-b border-green-100 text-green-400 font-bold uppercase">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Método</th>
                    <th className="p-3">Pars.</th>
                    <th className="p-3">NSU / Cód.</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {osData.pagamentos_cliente
                    ?.sort(
                      (a, b) =>
                        new Date(b.data_pagamento).getTime() -
                        new Date(a.data_pagamento).getTime(),
                    )
                    .map((pag) => {
                      const isDeleted = !!pag.deleted_at;
                      return (
                        <tr
                          key={pag.id_pagamento_cliente}
                          className={
                            isDeleted
                              ? "bg-red-50 opacity-60"
                              : "hover:bg-green-50/50"
                          }
                        >
                          <td
                            className={`p-3 ${isDeleted ? "line-through" : ""}`}
                          >
                            {new Date(pag.data_pagamento).toLocaleDateString()}
                          </td>
                          <td
                            className={`p-3 font-bold ${isDeleted ? "line-through" : ""}`}
                          >
                            {pag.metodo_pagamento}
                            {pag.bandeira_cartao && (
                              <span className="text-gray-400 font-normal ml-1">
                                ({pag.bandeira_cartao})
                              </span>
                            )}
                          </td>
                          <td
                            className={`p-3 font-bold text-center ${isDeleted ? "line-through" : ""}`}
                          >
                            {pag.qtd_parcelas && pag.qtd_parcelas > 1
                              ? `${pag.qtd_parcelas}x`
                              : "-"}
                          </td>
                          <td
                            className={`p-3 font-mono text-gray-500 ${isDeleted ? "line-through" : ""}`}
                          >
                            {pag.codigo_transacao || "-"}
                          </td>
                          <td
                            className={`p-3 text-right font-black ${isDeleted ? "line-through text-red-800" : "text-green-700"}`}
                          >
                            {formatCurrency(Number(pag.valor))}
                          </td>
                          <td className="p-3 text-center">
                            {isDeleted ? (
                              <span className="text-[9px] font-black text-red-500 uppercase rounded bg-white px-1">
                                Excluído
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-green-600 uppercase">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {!isDeleted && (
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentModal({ isOpen: true, data: pag })
                                  }
                                  className="text-gray-400 hover:text-blue-600"
                                >
                                  <BadgeCheck size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeletePayment(
                                      pag.id_pagamento_cliente,
                                    )
                                  }
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {(!osData.pagamentos_cliente ||
                    osData.pagamentos_cliente.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-400">
                        Nenhum pagamento registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div
              className={`p-6 rounded-2xl border-2 transition-colors ${lucro >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                    Valor Peças (Cobrado)
                  </p>
                  <p className="text-3xl font-black text-gray-900">
                    {formatCurrency(totalItemsRevenue || 0)}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">
                    Ref:{" "}
                    <span
                      className={lucro >= 0 ? "text-green-600" : "text-red-600"}
                    >
                      {formatCurrency((totalItemsRevenue || 0) - totalCusto)}
                    </span>
                  </p>
                </div>

                <div className="md:text-center">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                    Mão de Obra Total
                  </p>
                  <p className="text-3xl font-black text-blue-600">
                    {formatCurrency(Number(osData.valor_mao_de_obra || 0))}
                  </p>
                </div>

                <div className="md:text-right">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                    Valor Final (OS)
                  </p>
                  <p className="text-4xl font-black text-green-600">
                    {formatCurrency(totalReceita)}
                  </p>
                  {(() => {
                    const totalPago =
                      osData.pagamentos_cliente
                        ?.filter((p) => !p.deleted_at)
                        .reduce((acc, p) => acc + Number(p.valor), 0) || 0;
                    const restante = totalReceita - totalPago;
                    const isOk = restante <= 0.01;
                    return (
                      <div
                        className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase ${isOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {isOk ? (
                          <>
                            <BadgeCheck size={14} /> OK (QUITADO)
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />{" "}
                            PENDENTE
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              {osData.status === "FINALIZADA" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!osData) return;
                    try {
                      if (osData.fechamento_financeiro) {
                        await api.delete(
                          `/fechamento-financeiro/${osData.fechamento_financeiro.id_fechamento_financeiro}`,
                        );
                      }
                      await api.put(`/ordem-de-servico/${osData.id_os}`, {
                        status: "ABERTA",
                        valor_mao_de_obra: osData.valor_mao_de_obra,
                      });
                      setStatusMsg({
                        type: "success",
                        text: "OS Reaberta com sucesso!",
                      });
                      onSuccess(osData);
                    } catch (e) {
                      setStatusMsg({
                        type: "error",
                        text: "Erro ao reabrir OS.",
                      });
                    }
                  }}
                  className="flex-1 py-4 text-orange-600 font-bold hover:bg-orange-50 rounded-xl transition-colors border border-orange-100"
                >
                  Reabrir OS
                </button>
              )}

              <Button
                type="submit"
                isLoading={loading}
                variant="success"
                className="flex-1 py-4 shadow-xl shadow-green-200"
              >
                <Save size={18} />{" "}
                {osData.fechamento_financeiro
                  ? "Atualizar Dados"
                  : "Confirmar & Fechar OS"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* MODALS OUTSIDE THE MAIN FORM */}

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
              osData!.itens_os.reduce(
                (acc, i) => acc + Number(i.valor_total),
                0,
              ) +
              Number(osData!.valor_mao_de_obra || 0) -
              (osData!.pagamentos_cliente
                ?.filter(
                  (p) =>
                    !p.deleted_at &&
                    p.id_pagamento_cliente !==
                      paymentModal.data?.id_pagamento_cliente,
                )
                .reduce((acc, p) => acc + Number(p.valor), 0) || 0)
            }
            initialData={paymentModal.data}
            onSuccess={() => {
              setPaymentModal({ isOpen: false, data: null });
              fetchOsData(osData.id_os);
              setStatusMsg({ type: "success", text: "Pagamento salvo!" });
            }}
            onCancel={() => setPaymentModal({ isOpen: false, data: null })}
          />
        </Modal>
      )}

      {editItem && (
        <Modal title="Editar Item da OS" onClose={() => setEditItem(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Descrição
              </label>
              <input
                value={editItem.descricao}
                onChange={(e) =>
                  setEditItem({ ...editItem, descricao: e.target.value })
                }
                className="w-full border p-3 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Ref / Nota
              </label>
              <input
                value={editItem.codigo_referencia || ""}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    codigo_referencia: e.target.value,
                  })
                }
                className="w-full border p-3 rounded-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={editItem.quantidade}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      quantidade: Number(e.target.value),
                    })
                  }
                  className="w-full border p-3 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Valor Unitário (Venda)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(editItem as any).valor_venda_unitario}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      valor_venda_unitario: e.target.value,
                    } as any)
                  }
                  className="w-full border p-3 rounded-xl font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditItem(null)}
                className="px-4 py-2 text-gray-500 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItemEdit}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal
          title={confirmModal.title}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <div className="space-y-6">
            <p className="text-neutral-600 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
