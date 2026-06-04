import { useState, useEffect } from "react";
import { FinanceiroService } from "../services/financeiro.service";
import { formatCurrency } from "../utils/formatCurrency";
import {
  PageLayout,
  Card,
  Modal,
  Button,
  Input,
} from "../components/ui";
import { NfSyncBadge } from "../components/financeiro/NfSyncBadge";
import { toast } from "react-toastify";
import {
  Search,
  Eye,
  Calendar,
  FileText,
  DollarSign,
  Package,
  Wrench,
  X,
} from "lucide-react";

export const NotasFiscaisPage = () => {
  const [loading, setLoading] = useState(false);
  const [nfs, setNfs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  // Modal de Detalhes
  const [selectedNf, setSelectedNf] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadNotasFiscais();
  }, []);

  const loadNotasFiscais = async () => {
    try {
      setLoading(true);
      const data = await FinanceiroService.getNotasFiscaisCentral();
      setNfs(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar Central de Notas Fiscais.");
    } finally {
      setLoading(false);
    }
  };

  // Busca profunda cruzada local
  const filteredNfs = nfs.filter((nf) => {
    if (!search) return true;
    const s = search.toLowerCase();

    // 1. Busca nos campos gerais da NF
    if (
      nf.nf_numero.toLowerCase().includes(s) ||
      nf.credor.toLowerCase().includes(s)
    ) {
      return true;
    }

    // 2. Busca nos boletos (Contas a Pagar)
    const matchesBoleto = nf.boletos.some(
      (b: any) =>
        (b.descricao && b.descricao.toLowerCase().includes(s)) ||
        (b.nf_boleto && b.nf_boleto.toLowerCase().includes(s)) ||
        (b.status && b.status.toLowerCase().includes(s))
    );
    if (matchesBoleto) return true;

    // 3. Busca nas peças de estoque físico (EntradaEstoque)
    const matchesEstoque = nf.pecas_estoque.some(
      (e: any) =>
        (e.obs && e.obs.toLowerCase().includes(s)) ||
        (e.fornecedor && e.fornecedor.toLowerCase().includes(s)) ||
        (e.nota_fiscal && e.nota_fiscal.toLowerCase().includes(s))
    );
    if (matchesEstoque) return true;

    // 4. Busca nas peças aplicadas em Ordens de Serviço (PagamentoPeca)
    const matchesOs = nf.pecas_os.some(
      (p: any) =>
        (p.descricao && p.descricao.toLowerCase().includes(s)) ||
        String(p.id_os).includes(s) ||
        (p.cliente && p.cliente.toLowerCase().includes(s)) ||
        (p.veiculo && p.veiculo.toLowerCase().includes(s))
    );
    if (matchesOs) return true;

    return false;
  });

  const handleOpenDetails = (nf: any) => {
    setSelectedNf(nf);
    setModalOpen(true);
  };

  return (
    <PageLayout
      title="Central de Notas Fiscais"
      subtitle="Busca cruzada e paridade física-financeira de todas as Notas Fiscais e boletos do sistema."
    >
      <div className="space-y-6">
        {/* BUSCA DE ALTA PERFORMANCE */}
        <div className="relative">
          <Input
            icon={Search}
            placeholder="Buscar por número da NF, fornecedor, placa de veículo, número da OS, cliente ou peça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>

        {/* TABELA DE NOTAS FISCAIS */}
        <Card className="p-0 overflow-hidden border-neutral-200">
          <div className="overflow-x-auto">
            <table className="tabela-limpa w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-gray-600">
                  <th className="p-4 text-left">Número da NF</th>
                  <th className="p-4 text-left">Fornecedor / Credor</th>
                  <th className="p-4 text-right">Valor Planejado (Contas)</th>
                  <th className="p-4 text-center">Status Pagamento</th>
                  <th className="p-4 text-left">Conciliação da NF</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400">
                      Carregando Central de NFs...
                    </td>
                  </tr>
                ) : filteredNfs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-neutral-400 italic"
                    >
                      Nenhuma Nota Fiscal encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredNfs.map((nf) => (
                    <tr
                      key={nf.nf_numero}
                      className="hover:bg-neutral-50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-neutral-400" />
                            <span className="text-base text-neutral-900 font-bold uppercase">
                              {nf.nf_numero}
                            </span>
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${nf.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-800'}`}>
                                {nf.status === 'PAGO' ? 'Itens: Pagos' : 'Itens: Pendentes'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-base text-neutral-700 font-normal uppercase">
                          {nf.credor}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-base text-neutral-900 font-medium">
                          {formatCurrency(nf.valor_total)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          const totalBoletos = nf.boletos?.length || 0;
                          const paidBoletos = nf.boletos?.filter((b: any) => b.status === "PAGO").length || 0;
                          
                          let badgeText = nf.status === "PAGO" ? "QUITADO" : "PENDENTE";
                          let badgeStyle = nf.status === "PAGO" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700";

                          if (totalBoletos > 0) {
                            if (paidBoletos === totalBoletos) {
                              badgeText = `PAGO ${paidBoletos}/${totalBoletos}`;
                              badgeStyle = "bg-emerald-100 text-emerald-700";
                            } else if (paidBoletos > 0) {
                              badgeText = `PAGO ${paidBoletos}/${totalBoletos}`;
                              badgeStyle = "bg-blue-100 text-blue-700";
                            } else {
                              badgeText = `PAGO 0/${totalBoletos}`;
                              badgeStyle = "bg-orange-100 text-orange-700";
                            }
                          }

                          return (
                            <span
                              className={`px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider ${badgeStyle}`}
                            >
                              {badgeText}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <NfSyncBadge nf_numero={nf.nf_numero} />
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(nf)}
                          icon={Eye}
                          className="text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 active:scale-95"
                        >
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* MODAL DE DETALHES DE NOTA FISCAL (2 SEÇÕES VERTICAIS UNIFICADAS) */}
      {modalOpen && selectedNf && (
        <Modal
          title={`Painel Integrado da Nota Fiscal: ${selectedNf.nf_numero}`}
          onClose={() => {
            setModalOpen(false);
            setSelectedNf(null);
          }}
          className="max-w-6xl"
        >
          <div className="space-y-6 pt-4">
            
            {/* CABEÇALHO RÁPIDO DO MODAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  Fornecedor / Credor Principal
                </p>
                <p className="text-lg font-bold text-neutral-800 uppercase mt-1">
                  {selectedNf.credor}
                </p>
              </div>
              <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                    Batimento Físico-Financeiro
                  </p>
                  <div className="mt-1">
                    <NfSyncBadge nf_numero={selectedNf.nf_numero} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                    Valor Planejado Contas
                  </p>
                  <p className="text-xl font-black text-neutral-800 mt-0.5">
                    {formatCurrency(selectedNf.valor_total)}
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 1: INFORMAÇÕES DE PAGAMENTO (BOLETOS / CONTAS A PAGAR) */}
            <Card className="border-neutral-200">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                  <DollarSign size={18} />
                </div>
                <h3 className="text-base font-bold text-neutral-800 uppercase tracking-wider">
                  Informações de Pagamento (Boletos / Parcelas)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="tabela-limpa w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="p-3 text-left">Parcela / Descrição</th>
                      <th className="p-3 text-left">Ref. Boleto</th>
                      <th className="p-3 text-left">Vencimento</th>
                      <th className="p-3 text-right">Valor</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-left">Data Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {selectedNf.boletos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-neutral-400 italic">
                          Sem boletos financeiros vinculados a esta NF.
                        </td>
                      </tr>
                    ) : (
                      selectedNf.boletos.map((b: any) => (
                        <tr key={b.id_conta_pagar} className="hover:bg-neutral-50/50">
                          <td className="p-3">
                            <div className="font-semibold text-neutral-800">
                              {b.nf_parcela && b.nf_total_parcelas
                                ? `Parcela ${b.nf_parcela}/${b.nf_total_parcelas}`
                                : b.numero_parcela && b.total_parcelas
                                  ? `Parcela ${b.numero_parcela}/${b.total_parcelas}`
                                  : "Parcela Única"}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">{b.descricao}</div>
                          </td>
                          <td className="p-3 font-mono text-neutral-600">{b.nf_boleto || "---"}</td>
                          <td className="p-3">
                            {new Date(b.dt_vencimento).getUTCDate().toString().padStart(2, "0")}/
                            {(new Date(b.dt_vencimento).getUTCMonth() + 1).toString().padStart(2, "0")}/
                            {new Date(b.dt_vencimento).getUTCFullYear()}
                          </td>
                          <td className="p-3 text-right font-bold text-neutral-800">
                            {formatCurrency(b.valor)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                b.status === "PAGO"
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "bg-orange-50 text-orange-600 border border-orange-100"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-500 font-normal">
                            {b.dt_pagamento
                              ? `${new Date(b.dt_pagamento).getUTCDate().toString().padStart(2, "0")}/${(new Date(b.dt_pagamento).getUTCMonth() + 1).toString().padStart(2, "0")}/${new Date(b.dt_pagamento).getUTCFullYear()}`
                              : "Pendente"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* SEÇÃO 2: ITENS DA NOTA FISCAL (TABELA UNIFICADA) */}
            <Card className="border-neutral-200">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
                <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
                  <Package size={18} />
                </div>
                <h3 className="text-base font-bold text-neutral-800 uppercase tracking-wider">
                  Itens da Nota Fiscal (Estoque e Aplicações em OS)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="tabela-limpa w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="p-3 text-left">Nome do Item / Lote</th>
                      <th className="p-3 text-left">Origem</th>
                      <th className="p-3 text-left">Destino / Aplicação</th>
                      <th className="p-3 text-right">Valor Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {getUnifiedItems(selectedNf).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-neutral-400 italic">
                          Sem itens físicos ou de OS vinculados a esta NF.
                        </td>
                      </tr>
                    ) : (
                      getUnifiedItems(selectedNf).map((item: any) => (
                        <tr key={item.id_unico} className="hover:bg-neutral-50/50">
                          <td className="p-3">
                            <div className="font-semibold text-neutral-800 uppercase">
                              {item.nome_item}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              Entrada em: {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "N/A"}
                            </div>
                            {item.obs && (
                              <div className="text-xs text-neutral-400 italic mt-0.5">{item.obs}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                item.tipo_origem === "ESTOQUE"
                                  ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-100"
                              }`}
                            >
                              {item.tipo_origem === "ESTOQUE" ? "Estoque" : "Peça OS"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                item.tipo_origem === "ESTOQUE"
                                  ? "bg-neutral-100 text-neutral-700 border border-neutral-200"
                                  : "bg-blue-50/70 text-blue-800 border border-blue-100"
                              }`}
                            >
                              {item.destino_string}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-neutral-800">
                            {formatCurrency(item.custo)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* BOTÃO DE FECHAMENTO DO MODAL */}
            <div className="flex justify-end pt-4 border-t border-neutral-100">
              <Button
                variant="primary"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedNf(null);
                }}
                icon={X}
              >
                Fechar Painel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};

// Mapper helper defined outside the component to keep codebase structured
const getUnifiedItems = (nf: any) => {
  if (!nf) return [];

  const estoqueItems = (nf.pecas_estoque || []).map((e: any) => ({
    id_unico: `estoque_${e.id_entrada_estoque}`,
    nome_item: e.nota_fiscal
      ? `Nota Fiscal: ${e.nota_fiscal}`
      : `Entrada de Estoque #${e.id_entrada_estoque}`,
    custo: Number(e.valor_total),
    destino_string: "Em estoque físico",
    tipo_origem: "ESTOQUE",
    data: e.data_compra,
    obs: e.obs || null,
  }));

  const osItems = (nf.pecas_os || []).map((p: any) => ({
    id_unico: `os_${p.id_pagamento_peca}`,
    nome_item: p.descricao || "Peça Avulsa",
    custo: Number(p.custo_real),
    destino_string: `OS nº ${p.id_os || "---"} | Veículo: ${p.veiculo || "N/A"} | Cliente: ${p.cliente || "Desconhecido"}`,
    tipo_origem: "OS",
    data: p.data_compra,
    obs: null,
  }));

  return [...estoqueItems, ...osItems].sort(
    (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
  );
};
