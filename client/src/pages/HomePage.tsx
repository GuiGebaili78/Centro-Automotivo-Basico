import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, color, onClick, subtext }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300 group`}
  >
    <div className="flex flex-col justify-between h-full items-center text-center">
       <div>
         <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">{title}</p>
         <h3 className={`text-4xl font-black ${color.replace('bg-', 'text-')}`}>{value}</h3>
       </div>
       {subtext && <div className="mt-4 pt-4 border-t border-neutral-50 w-full">
           <p className="text-[10px] text-neutral-400 font-bold uppercase">{subtext}</p>
       </div>}
    </div>
  </div>
);

export function HomePage() {
  const navigate = useNavigate();
  const [recentOss, setRecentOss] = useState<any[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<'HOJE' | 'SEMANA' | 'MES'>('HOJE');
  
  const [stats, setStats] = useState({
    osAberta: 0,
    contasPagar: 0,
    livroCaixaEntries: 0,
    livroCaixaExits: 0,
    autoPecasPendentes: 0,
    consolidacao: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [osRes, contasRes, pagPecaRes, pagCliRes] = await Promise.all([
        api.get('/ordem-de-servico'),
        api.get('/contas-pagar'),
        api.get('/pagamento-peca'),
        api.get('/pagamento-cliente')
      ]);

      const oss = osRes.data;
      const contas = contasRes.data;
      const pagPecas = pagPecaRes.data;
      const pagClients = pagCliRes.data;

      // 1. Serviços em Aberto
      const osAberta = oss.filter((o: any) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length;
      
      // 2. Contas a Pagar (Geral) -> Status PENDENTE
      const contasPagar = contas.filter((c: any) => c.status === 'PENDENTE').length;

      // Robust matcher for local date string match (ignores timezone shifts from DB midnight)
      const isToday = (dateStr: string) => {
          if (!dateStr) return false;
          // Create Date object from ISO string (e.g. 2026-01-04T02:00:00Z)
          const date = new Date(dateStr);
          // Get local date string YYYY-MM-DD (e.g. 2026-01-03)
          const localDateStr = date.toLocaleDateString('en-CA');
          
          const todayStr = new Date().toLocaleDateString('en-CA');
          return localDateStr === todayStr;
      };

      const todayEntries = pagClients.filter((p: any) => isToday(p.data_pagamento) && !p.deleted_at).length;
      
      const todayExits = pagPecas.filter((p: any) => {
          if (!p.pago_ao_fornecedor) return false;
          if (!p.data_pagamento_fornecedor) return false;
          return isToday(p.data_pagamento_fornecedor) && !p.deleted_at;
      }).length;

      // 4. Auto Peças (Pecas não pagas ao fornecedor)
      const autoPecasPendentes = pagPecas.filter((p: any) => !p.pago_ao_fornecedor && !p.deleted_at).length;

      // 5. Consolidação (OS Pronta para Financeiro E SEM Fechamento)
      const consolidacao = oss.filter((o: any) => o.status === 'PRONTO PARA FINANCEIRO' && !o.fechamento_financeiro).length;

      setStats({
          osAberta,
          contasPagar,
          livroCaixaEntries: todayEntries,
          livroCaixaExits: todayExits,
          autoPecasPendentes,
          consolidacao
      });

      setRecentOss(oss);

    } catch (error) {
      console.error('Erro ao carregar dados', error);
    }
  };

  const getFilteredRecentServices = () => {
      const now = new Date();
      // Set to start of day for comparisons
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      return recentOss.filter(os => {
          // Use updated_at timestamp. If unavailable, use dt_abertura.
          // Note: updated_at was recently added, so older records might have it = null or old date.
          // Fallback logic: check both or prefer updated_at if valid.
          const dateRef = os.updated_at ? new Date(os.updated_at) : new Date(os.dt_abertura);
          
          if (filterPeriod === 'HOJE') {
              // Compare if dateRef is >= today 00:00
              return dateRef >= startOfToday;
          } else if (filterPeriod === 'SEMANA') {
              const weekAgo = new Date(startOfToday);
              weekAgo.setDate(startOfToday.getDate() - 7);
              return dateRef >= weekAgo;
          } else { // MES
              const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              return dateRef >= firstDayMonth;
          }
      }).sort((a,b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.dt_abertura).getTime();
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.dt_abertura).getTime();
          return dateB - dateA;
      });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'FINALIZADA': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
      case 'PAGA_CLIENTE': return 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200';
      case 'PRONTO PARA FINANCEIRO': return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
      case 'ABERTA': return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
      case 'EM_ANDAMENTO': return 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200';
      default: return 'bg-gray-50 text-gray-500 ring-1 ring-gray-200';
    }
  };

  const filteredServices = getFilteredRecentServices();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Visão Geral</h1>
            <p className="text-neutral-500">Acompanhamento diário da oficina.</p>
        </div>
        <span className="text-sm font-bold text-neutral-400 bg-neutral-100 px-3 py-1 rounded-lg uppercase">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
            title="Serviços Abertos" 
            value={stats.osAberta} 
            color="bg-blue-500" 
            onClick={() => navigate('/ordem-de-servico')}
            subtext="Em produção"
        />
        <StatCard 
            title="Contas a Pagar" 
            value={stats.contasPagar} 
            color="bg-red-500" 
            onClick={() => navigate('/financeiro/contas-pagar')}
            subtext="Geral / Fixas"
        />
        <StatCard 
            title="Livro Caixa" 
            value={stats.livroCaixaEntries + stats.livroCaixaExits} 
            color="bg-neutral-900" 
            onClick={() => navigate('/financeiro/livro-caixa')}
            subtext={`Ent: ${stats.livroCaixaEntries}  |  Sai: ${stats.livroCaixaExits}`}
        />
        <StatCard 
            title="Auto Peças" 
            value={stats.autoPecasPendentes} 
            color="bg-orange-500" 
            onClick={() => navigate('/financeiro/pagamento-pecas')}
            subtext="Pendentes Pagto"
        />
        <StatCard 
            title="Consolidação" 
            value={stats.consolidacao} 
            color="bg-emerald-500" 
            onClick={() => navigate('/fechamento-financeiro')}
            subtext="Aguardando Financ."
        />
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate('/ordem-de-servico?new=true')} 
                className="bg-neutral-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-neutral-900/20 transition-transform hover:-translate-y-0.5"
            >
                <Plus size={20} /> Nova OS
            </button>
      </div>

      {/* Recent Services - FULL WIDTH */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">Serviços Recentes</h2>
            
            {/* Date Tabs */}
            <div className="flex bg-neutral-100 p-1 rounded-xl">
                {['HOJE', 'SEMANA', 'MES'].map((p) => (
                    <button
                        key={p}
                        onClick={() => setFilterPeriod(p as any)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterPeriod === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                        {p === 'MES' ? 'Mês' : p}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
                <th className="p-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">OS / Data</th>
                <th className="p-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Veículo</th>
                <th className="p-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Diagnóstico</th>
                <th className="p-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Cliente</th>
                <th className="p-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Status</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
            {filteredServices.length === 0 ? (
                <tr>
                <td colSpan={5} className="p-12 text-center text-neutral-400 font-medium italic">
                    Nenhuma atualização neste período.
                </td>
                </tr>
            ) : (
                filteredServices.map((os: any) => (
                <tr 
                    key={os.id_os} 
                    onClick={() => navigate(os.status === 'PRONTO PARA FINANCEIRO' ? `/fechamento-financeiro?id_os=${os.id_os}` : `/ordem-de-servico?id=${os.id_os}`)}
                    className="hover:bg-neutral-25 cursor-pointer transition-colors group"
                >
                    <td className="p-4">
                        <div className="font-black text-neutral-800">#{os.id_os}</div>
                        <div className="text-[10px] text-neutral-400 font-bold">{new Date(os.dt_abertura).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-neutral-700 uppercase text-xs">
                                {os.veiculo?.modelo || 'Modelo N/I'}
                            </span>
                            <span className="text-[10px] font-black text-neutral-400 uppercase">
                                {os.veiculo?.placa || '---'}
                            </span>
                             {os.veiculo?.cor && (
                                <span className="text-[9px] font-bold text-neutral-500 uppercase flex items-center gap-1 mt-0.5">
                                    <span className="w-2 h-2 rounded-full border border-neutral-200" style={{backgroundColor: os.veiculo.cor === 'PRATA' ? '#ccc' : os.veiculo.cor === 'BRANCO' ? '#fff' : os.veiculo.cor === 'PRETO' ? '#000' : 'gray'}}></span>
                                    {os.veiculo.cor}
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="p-4 max-w-[250px]">
                        <p className="text-xs font-medium text-neutral-600 line-clamp-1">
                            {os.diagnostico || os.defeito_relatado || <span className="text-neutral-300 italic">---</span>}
                        </p>
                    </td>
                    <td className="p-4">
                        <div className="font-bold text-neutral-700 text-xs truncate max-w-[150px]">
                            {os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social}
                        </div>
                    </td>
                    <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase whitespace-nowrap ${getStatusStyle(os.status)}`}>
                            {os.status.replace(/_/g, ' ')}
                        </span>
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