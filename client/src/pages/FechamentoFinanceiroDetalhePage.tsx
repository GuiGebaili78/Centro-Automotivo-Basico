import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
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
import { PagamentoClienteForm } from "../components/forms/PagamentoClienteForm";
import { FornecedorForm } from "../components/forms/FornecedorForm";
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
      const response = await api.get(`/ordem-de-servico/${osId}`);
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
    });
    setEditItemModal({ isOpen: true, item });
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
      const valorTotal =
        Number(editItemForm.quantidade) * Number(editItemForm.valor_venda);
      await api.put(`/itens-os/${editItemModal.item.id_iten}`, {
        descricao: editItemForm.descricao,
        quantidade: Number(editItemForm.quantidade),
        valor_venda: Number(editItemForm.valor_venda),
        valor_total: valorTotal,
        codigo_referencia: editItemForm.codigo_referencia,
      });

      setEditItemModal({ isOpen: false, item: null });
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
      };

    const totalItemsRevenue = osData.itens_os.reduce(
      (acc, i) => acc + Number(i.valor_total),
      0,
    );
    const totalItemsCost = osData.itens_os.reduce(
      (acc, i) => acc + Number(itemsState[i.id_iten]?.custo_real || 0),
      0,
    );
    const totalLaborRevenue =
      osData.servicos_mao_de_obra?.reduce(
        (acc, s) => acc + Number(s.valor),
        0,
      ) || 0;
    const totalReceita = totalItemsRevenue + totalLaborRevenue;
    const totalCusto = totalItemsCost; // Updated to use totalItemsCost

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
    };
  };

  const {
    totalReceita,
    totalCusto,
    totalItemsRevenue,
    totalItemsCost,
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
        // Upsert Fechamento ONLY when finalizing
        const fechamentoPayload = {
          id_os: Number(osData.id_os),
          custo_total_pecas_real: totalCusto,
        };
        if (osData.fechamento_financeiro) {
          await api.put(
            `/fechamento-financeiro/${osData.fechamento_financeiro.id_fechamento_financeiro}`,
            fechamentoPayload,
          );
        } else {
          await api.post("/fechamento-financeiro", fechamentoPayload);
        }

        // Update Defect/Diagnosis
        await api.put(`/ordem-de-servico/${osData.id_os}`, {
          status: osData.status, // Preserve status unless finalizing
          defeito_relatado: osData.defeito_relatado,
          diagnostico: osData.diagnostico,
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

  const getStatusStyle = (st: string) => {
    switch (st) {
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

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-all text-neutral-500 hover:text-neutral-700 active:scale-95"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-700 leading-none m-0 tracking-tight">
            Fechamento Financeiro #{osData.id_os}
          </h1>
          <span className="h-6 w-px bg-neutral-300 mx-1"></span>
          <span
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(osData.status)}`}
          >
            {osData.status === "PRONTO PARA FINANCEIRO"
              ? "FINANCEIRO"
              : osData.status.replace(/_/g, " ")}
          </span>
          {isDirty && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <AlertCircle size={10} /> Alterações Pendentes
            </span>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Col 1: Vehicle */}
          {/* Col 1: Vehicle */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Veículo
              </p>
              <button
                onClick={() =>
                  navigate(`/cadastro/${osData.cliente?.id_cliente}`)
                }
                className="text-primary-600 hover:text-primary-700 p-0.5 hover:bg-primary-50 rounded transition-colors"
                title="Editar Veículo"
              >
                <Edit size={12} />
              </button>
            </div>
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-neutral-600 leading-none tracking-tight">
                {osData.veiculo?.modelo} - {osData.veiculo?.cor || "Cor N/I"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-primary-600 uppercase tracking-widest  px-2 py-0.5 rounded-md">
                  {osData.veiculo?.placa}
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Client */}
          <div className="md:border-l md:border-gray-100 md:pl-8">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Cliente
              </p>
              <button
                onClick={() =>
                  navigate(`/cadastro/${osData.cliente?.id_cliente}`)
                }
                className="text-primary-600 hover:text-primary-700 p-0.5 hover:bg-primary-50 rounded transition-colors"
                title="Editar Cliente"
              >
                <Edit size={12} />
              </button>
            </div>
            <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">
              {getClientName()}
            </h3>
            <p className="text-gray-600 font-medium text-sm flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              {osData.cliente.telefone_1 || "Sem telefone"}
            </p>
          </div>

          {/* Col 3: Removed (Moved to body) */}
        </div>
      </div>

      {/* SPLIT LAYOUT: Obs (Left) & Labor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
        {/* LEFT COL: Obs */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-4 p-4">
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>{" "}
                Defeito Relatado
              </label>
              <textarea
                className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-32 outline-none focus:border-red-300 focus:bg-white resize-none transition-all focus:shadow-sm"
                placeholder="Descreva o defeito..."
                value={osData.defeito_relatado || ""}
                onChange={(e) => {
                  setOsData({ ...osData, defeito_relatado: e.target.value });
                  setIsDirty(true);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{" "}
                Observações / Diagnóstico
              </label>
              <textarea
                className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-32 outline-none focus:border-blue-300 focus:bg-white resize-none transition-all focus:shadow-sm"
                placeholder="Insira observações ou diagnóstico..."
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
          <Card className="h-full p-4 space-y-2">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-neutral-50">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <BadgeCheck size={14} />
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
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">
            Custos de Peças (Fornecedores)
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
              <th className="p-4 w-1/3">Peça</th>
              <th className="p-4">Ref / Nota</th>
              <th className="p-4">Fornecedor</th>
              <th className="p-4 w-44">Custo (R$)</th>
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
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 w-full">
                        <span className="text-gray-400 text-xs font-bold mr-2">
                          R$
                        </span>
                        <input
                          disabled
                          value="0.00"
                          className="w-full bg-transparent text-sm font-bold text-gray-400 cursor-not-allowed outline-none"
                        />
                      </div>
                      <div className="text-[9px] text-gray-400 mt-1 text-center font-medium">
                        {item.pecas_estoque
                          ? `Custo Orig: ${formatCurrency(Number(item.pecas_estoque.valor_custo))}`
                          : "Estoque"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center border border-gray-200 rounded-lg bg-white px-3 py-2 w-full focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent transition-all shadow-sm">
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
                        className="w-full text-sm font-bold text-red-600 outline-none placeholder-gray-300"
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

      {/* RECEBIMENTOS */}
      <div className="border border-green-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-green-100 px-4 py-3 border-b border-green-200 flex justify-between items-center">
          <h4 className="font-bold text-sm text-green-800 uppercase tracking-wide">
            Recebimentos
          </h4>
          <button
            type="button"
            onClick={() => setPaymentModal({ isOpen: true, data: null })}
            className="text-[10px] font-black uppercase text-green-700 bg-white border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> Novo Pagamento
          </button>
        </div>
        <div className="p-4">
          {/* Using a simplified list here or reuse Table logic */}
          {osData.pagamentos_cliente?.filter((p) => !p.deleted_at).length ===
          0 ? (
            <p className="text-gray-400 text-sm text-center">
              Nenhum recebimento.
            </p>
          ) : (
            <div className="space-y-2">
              {osData.pagamentos_cliente
                ?.filter((p) => !p.deleted_at)
                .map((pag) => (
                  <div
                    key={pag.id_pagamento_cliente}
                    className="flex justify-between items-center bg-green-50/50 p-2 rounded-lg text-sm border border-green-100 group"
                  >
                    <span className="font-bold text-green-800">
                      {formatCurrency(Number(pag.valor))}
                    </span>
                    <span className="text-gray-500">
                      {pag.metodo_pagamento} -{" "}
                      {new Date(pag.data_pagamento).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setPaymentModal({ isOpen: true, data: pag })
                        }
                        className="text-neutral-400 hover:text-blue-600"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() =>
                          handleDeletePayment(pag.id_pagamento_cliente)
                        }
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SUMMARY CARD */}
      <div className="bg-neutral-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              Total Peças
            </p>
            <p className="text-2xl font-black text-white">
              {formatCurrency(totalItemsRevenue)}
            </p>
            <p className="text-[10px] font-bold text-emerald-400 mt-1">
              Ref: {formatCurrency(Number(totalItemsRevenue) - totalItemsCost)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              Total Mão de Obra
            </p>
            <p className="text-2xl font-black text-white">
              {formatCurrency(totalLaborRevenue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              Total Geral
            </p>
            <p className="text-3xl font-black text-white">
              {formatCurrency(totalReceita)}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-block px-4 py-2 rounded-xl font-black uppercase text-xs tracking-wider ${
                (osData.pagamentos_cliente?.reduce(
                  (acc, p) => (p.deleted_at ? acc : acc + Number(p.valor)),
                  0,
                ) || 0) >= totalReceita
                  ? "bg-emerald-500 text-emerald-950"
                  : "bg-amber-500 text-amber-950"
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
            <div className="grid grid-cols-2 gap-4">
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
