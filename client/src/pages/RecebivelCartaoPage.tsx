import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CheckCircle, XCircle, Calendar, CreditCard, TrendingUp, Clock } from 'lucide-react';

interface Recebivel {
  id_recebivel: number;
  id_os: number;
  id_operadora: number;
  num_parcela: number;
  total_parcelas: number;
  valor_bruto: number;
  valor_liquido: number;
  taxa_aplicada: number;
  data_venda: string;
  data_prevista: string;
  data_recebimento: string | null;
  status: string;
  confirmado_em: string | null;
  confirmado_por: string | null;
  operadora: {
    id_operadora: number;
    nome: string;
    conta_destino: {
      id_conta: number;
      nome: string;
      saldo_atual: number;
    };
  };
  ordem_de_servico?: {
    id_os: number;
    cliente: any;
    veiculo: any;
  };
}

interface Resumo {
  totalPendente: number;
  receberHoje: number;
  receberSeteDias: number;
  receberTrintaDias: number;
  totalRecebido: number;
}

export function RecebivelCartaoPage() {
  const [recebiveis, setRecebiveis] = useState<Recebivel[]>([]);
  const [filteredRecebiveis, setFilteredRecebiveis] = useState<Recebivel[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    totalPendente: 0,
    receberHoje: 0,
    receberSeteDias: 0,
    receberTrintaDias: 0,
    totalRecebido: 0
  });
  
  const [filtroOperadora, setFiltroOperadora] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('PENDENTE');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('TODOS');
  const [operadoras, setOperadoras] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchOperadoras();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [recebiveis, filtroOperadora, filtroStatus, filtroPeriodo]);

  const fetchData = async () => {
    try {
      const [recebiveisRes, resumoRes] = await Promise.all([
        api.get('/recebivel-cartao'),
        api.get('/recebivel-cartao/resumo')
      ]);
      
      setRecebiveis(recebiveisRes.data);
      setResumo(resumoRes.data);
    } catch (error) {
      console.error('Erro ao carregar recebíveis:', error);
    }
  };

  const fetchOperadoras = async () => {
    try {
      const res = await api.get('/operadora-cartao');
      setOperadoras(res.data);
    } catch (error) {
      console.error('Erro ao carregar operadoras:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...recebiveis];

    // Filtro de Operadora
    if (filtroOperadora !== 'TODOS') {
      filtered = filtered.filter(r => r.operadora.nome === filtroOperadora);
    }

    // Filtro de Status
    if (filtroStatus !== 'TODOS') {
      filtered = filtered.filter(r => r.status === filtroStatus);
    }

    // Filtro de Período
    if (filtroPeriodo !== 'TODOS') {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(r => {
        const dataPrevista = new Date(r.data_prevista);
        
        if (filtroPeriodo === 'HOJE') {
          return dataPrevista.toDateString() === hoje.toDateString();
        } else if (filtroPeriodo === '7_DIAS') {
          const seteDias = new Date(hoje);
          seteDias.setDate(hoje.getDate() + 7);
          return dataPrevista >= hoje && dataPrevista <= seteDias;
        } else if (filtroPeriodo === '30_DIAS') {
          const trintaDias = new Date(hoje);
          trintaDias.setDate(hoje.getDate() + 30);
          return dataPrevista >= hoje && dataPrevista <= trintaDias;
        }
        return true;
      });
    }

    setFilteredRecebiveis(filtered);
  };

  const handleConfirmarRecebimento = async (id: number) => {
    if (!confirm('Confirmar o recebimento deste valor? O saldo da conta bancária será atualizado.')) {
      return;
    }

    try {
      await api.post(`/recebivel-cartao/${id}/confirmar`, {
        confirmadoPor: 'Usuário' // TODO: Implementar autenticação
      });
      
      alert('Recebimento confirmado com sucesso!');
      fetchData();
    } catch (error: any) {
      alert('Erro ao confirmar recebimento: ' + (error.response?.data?.details || error.message));
    }
  };

  const handleEstornarRecebimento = async (id: number) => {
    if (!confirm('Estornar este recebimento? O saldo da conta bancária será revertido.')) {
      return;
    }

    try {
      await api.post(`/recebivel-cartao/${id}/estornar`);
      alert('Recebimento estornado com sucesso!');
      fetchData();
    } catch (error: any) {
      alert('Erro ao estornar recebimento: ' + (error.response?.data?.details || error.message));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Recebíveis de Cartão</h1>
        <p className="text-neutral-500">Gestão de valores a receber de operadoras de cartão</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-blue-600" size={24} />
            <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Hoje</p>
          </div>
          <h3 className="text-3xl font-black text-blue-700">{formatCurrency(resumo.receberHoje)}</h3>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-2xl border border-cyan-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-cyan-600" size={24} />
            <p className="text-xs font-black text-cyan-600 uppercase tracking-wider">7 Dias</p>
          </div>
          <h3 className="text-3xl font-black text-cyan-700">{formatCurrency(resumo.receberSeteDias)}</h3>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-purple-600" size={24} />
            <p className="text-xs font-black text-purple-600 uppercase tracking-wider">30 Dias</p>
          </div>
          <h3 className="text-3xl font-black text-purple-700">{formatCurrency(resumo.receberTrintaDias)}</h3>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="text-orange-600" size={24} />
            <p className="text-xs font-black text-orange-600 uppercase tracking-wider">Pendente</p>
          </div>
          <h3 className="text-3xl font-black text-orange-700">{formatCurrency(resumo.totalPendente)}</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-emerald-600" size={24} />
            <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Recebido (Mês)</p>
          </div>
          <h3 className="text-3xl font-black text-emerald-700">{formatCurrency(resumo.totalRecebido)}</h3>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">
              Operadora
            </label>
            <select
              value={filtroOperadora}
              onChange={(e) => setFiltroOperadora(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
            >
              <option value="TODOS">Todos</option>
              {operadoras.map(op => (
                <option key={op.id_operadora} value={op.nome}>{op.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
            >
              <option value="TODOS">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="RECEBIDO">Recebido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">
              Período
            </label>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
            >
              <option value="TODOS">Todos</option>
              <option value="HOJE">Hoje</option>
              <option value="7_DIAS">Próximos 7 dias</option>
              <option value="30_DIAS">Próximos 30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Recebíveis */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-lg font-black text-neutral-900 tracking-tight">
            Lista de Recebíveis ({filteredRecebiveis.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="p-4 text-left text-xs font-black uppercase text-neutral-400 tracking-widest">OS</th>
                <th className="p-4 text-left text-xs font-black uppercase text-neutral-400 tracking-widest">Veículo</th>
                <th className="p-4 text-left text-xs font-black uppercase text-neutral-400 tracking-widest">Operadora</th>
                <th className="p-4 text-left text-xs font-black uppercase text-neutral-400 tracking-widest">Conta Destino</th>
                <th className="p-4 text-left text-xs font-black uppercase text-neutral-400 tracking-widest">Data/Hora Venda</th>
                <th className="p-4 text-left text-xs font-black uppercase text-neutral-400 tracking-widest">Data Prevista</th>
                <th className="p-4 text-right text-xs font-black uppercase text-neutral-400 tracking-widest">Valor Bruto</th>
                <th className="p-4 text-right text-xs font-black uppercase text-neutral-400 tracking-widest">Taxa</th>
                <th className="p-4 text-right text-xs font-black uppercase text-neutral-400 tracking-widest">Valor Líquido</th>
                <th className="p-4 text-center text-xs font-black uppercase text-neutral-400 tracking-widest">Status</th>
                <th className="p-4 text-right text-xs font-black uppercase text-neutral-400 tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredRecebiveis.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-neutral-400 font-medium italic">
                    Nenhum recebível encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRecebiveis.map((recebivel) => (
                  <tr key={recebivel.id_recebivel} className="hover:bg-neutral-25 transition-colors">
                    <td className="p-4">
                      <span className="font-black text-neutral-800">#{recebivel.id_os}</span>
                      {recebivel.total_parcelas > 1 && (
                        <span className="ml-2 text-xs text-neutral-400">
                          ({recebivel.num_parcela}/{recebivel.total_parcelas})
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {recebivel.ordem_de_servico?.veiculo ? (
                        <div className="flex flex-col">
                          <span className="font-black text-neutral-800 uppercase text-sm">
                            {recebivel.ordem_de_servico.veiculo.placa}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {recebivel.ordem_de_servico.veiculo.modelo} • {recebivel.ordem_de_servico.veiculo.cor}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-neutral-700">{recebivel.operadora.nome}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-neutral-600">{recebivel.operadora.conta_destino.nome}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-700">{formatDate(recebivel.data_venda)}</span>
                        <span className="text-xs text-neutral-400">
                          {new Date(recebivel.data_venda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-neutral-700">{formatDate(recebivel.data_prevista)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-neutral-700">{formatCurrency(recebivel.valor_bruto)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-red-600">-{formatCurrency(recebivel.taxa_aplicada)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-emerald-600">{formatCurrency(recebivel.valor_liquido)}</span>
                    </td>
                    <td className="p-4 text-center">
                      {recebivel.status === 'PENDENTE' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-orange-100 text-orange-700 ring-1 ring-orange-200">
                          Pendente
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                          Recebido
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {recebivel.status === 'PENDENTE' ? (
                        <button
                          onClick={() => handleConfirmarRecebimento(recebivel.id_recebivel)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all hover:scale-105 shadow-md"
                        >
                          <CheckCircle size={16} className="inline mr-1" />
                          Confirmar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEstornarRecebimento(recebivel.id_recebivel)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all hover:scale-105 shadow-md"
                        >
                          <XCircle size={16} className="inline mr-1" />
                          Estornar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
