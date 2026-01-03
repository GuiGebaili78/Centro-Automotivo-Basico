import { useEffect, useState } from 'react';
import { Users, Wrench, DollarSign, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition `}
  >
    <div className={`p-4 rounded-full ${color.replace('-500', '-50')} ${color.replace('bg-', 'text-')}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-neutral-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-neutral-900">{value}</h3>
    </div>
  </div>
);

export function HomePage() {
  const navigate = useNavigate();
  const [recentOss, setRecentOss] = useState<any[]>([]);
  const [stats, setStats] = useState({
    clientes: 0,
    osAndamento: 0,
    osFinalizada: 0,
    pagamentosPendentes: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [osRes, cliRes, pagRes] = await Promise.all([
        api.get('/ordem-de-servico'),
        api.get('/cliente'),
        api.get('/pagamento-peca')
      ]);

      const oss = osRes.data;
      const clientes = cliRes.data;
      const pagamentos = pagRes.data;

      const osAndamento = oss.filter((o: any) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length;
      const osPronta = oss.filter((o: any) => o.status === 'PRONTO PARA FINANCEIRO').length;
      const osFinalizada = oss.filter((o: any) => o.status === 'FINALIZADA').length;
      const pagamentosPendentes = pagamentos.filter((p: any) => p.pago_ao_fornecedor === false).length;

      setStats({
        clientes: clientes.length,
        osAndamento,
        osFinalizada: osFinalizada + osPronta, 
        pagamentosPendentes
      });

      // Filter recent OSs to show active and recently completed ones
      // Show ALL recent OSs so user sees what is happening
      setRecentOss(oss.sort((a: any, b: any) => b.id_os - a.id_os));

    } catch (error) {
      console.error('Erro ao carregar estatísticas', error);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'FINALIZADA': return 'bg-green-100 text-green-700 ring-green-200';
      case 'PAGA_CLIENTE': return 'bg-neutral-100 text-neutral-600 ring-neutral-200';
      case 'PRONTO PARA FINANCEIRO': return 'bg-orange-100 text-orange-700 ring-orange-200 font-black animate-pulse';
      case 'ABERTA': return 'bg-blue-50 text-blue-600 ring-blue-200';
      case 'EM_ANDAMENTO': return 'bg-cyan-50 text-cyan-600 ring-cyan-200';
      default: return 'bg-gray-100 text-gray-500 ring-gray-200';
    }
  };

  const handleRowClick = (os: any) => {
      // If ready for finance, take them there to close it
      if (os.status === 'PRONTO PARA FINANCEIRO') {
          navigate(`/fechamento-financeiro?id_os=${os.id_os}`);
      } else {
          navigate(`/ordem-de-servico?id=${os.id_os}`);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">Visão Geral</h1>
        <span className="text-sm text-neutral-500">{new Date().toLocaleDateString()}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Clientes" 
            value={stats.clientes} 
            icon={Users} 
            color="bg-blue-500" 
            onClick={() => navigate('/cliente')}
        />
        <StatCard 
            title="Serviços em Aberto" 
            value={stats.osAndamento} 
            icon={Wrench} 
            color="bg-yellow-500" 
            onClick={() => navigate('/ordem-de-servico')}
        />
        <StatCard 
            title="Concluídos (Mês)" 
            value={stats.osFinalizada} 
            icon={CheckCircle} 
            color="bg-green-500" 
            onClick={() => navigate('/ordem-de-servico')}
        />
        <StatCard 
            title="Pagamentos Pendentes" 
            value={stats.pagamentosPendentes} 
            icon={DollarSign} 
            color="bg-red-500" 
            onClick={() => navigate('/fechamento-financeiro')}
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-neutral-100 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-neutral-900">Serviços Recentes</h2>
            <button 
              onClick={() => navigate('/ordem-de-servico')}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Ver Todas
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="p-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">OS / Data</th>
                  <th className="p-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">Veículo</th>
                  <th className="p-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">Diagnóstico / Ações</th>
                  <th className="p-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">Técnico</th>
                  <th className="p-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest">Cliente</th>
                  <th className="p-4 text-[10px] font-black uppercase text-neutral-500 tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentOss.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-neutral-400 italic">Nenhuma OS encontrada.</td>
                  </tr>
                ) : (
                  recentOss
                    .slice(0, 5) // Show top 5
                    .map((os: any) => (
                    <tr 
                      key={os.id_os} 
                      onClick={() => handleRowClick(os)}
                      className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                    >
                      <td className="p-4">
                        <p className="font-bold text-neutral-900">#{os.id_os}</p>
                        <p className="text-[10px] text-neutral-400 font-medium">{new Date(os.dt_abertura).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-neutral-700 tracking-tight text-sm uppercase">{os.veiculo?.placa} - {os.veiculo?.modelo}</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">({os.veiculo?.cor || 'Cor N/I'})</p>
                      </td>
                      {/* Diagnóstico / Ações */}
                      <td className="p-4 max-w-[200px]" title={os.diagnostico || os.defeito_relatado || 'Sem diagnóstico registrado'}>
                          <p className="text-xs font-medium text-neutral-600 line-clamp-2">
                             {os.diagnostico || os.defeito_relatado || <span className="text-neutral-300 italic">Pendente</span>}
                          </p>
                      </td>
                      {/* Técnico */}
                      <td className="p-4">
                          <p className="text-xs font-bold text-neutral-700 uppercase">
                              {os.funcionario?.pessoa_fisica?.pessoa?.nome?.split(' ')[0] || <span className="text-neutral-300">---</span>}
                          </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-neutral-600 truncate max-w-[150px]">
                          {os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social}
                        </p>
                        <p className="text-[10px] text-neutral-400 font-medium">{os.cliente?.telefone_1}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ${getStatusStyle(os.status)}`}>
                          {os.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">Atalhos Rápidos</h2>
          <div className="grid grid-cols-1 gap-3">
            <button 
                onClick={() => navigate('/ordem-de-servico')}
                className="w-full text-left p-4 bg-neutral-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-all text-blue-600">
                  <Wrench size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-800">Nova OS</p>
                  <p className="text-[10px] text-neutral-500">Abrir novo atendimento</p>
                </div>
              </div>
            </button>
            
            <button 
                onClick={() => navigate('/cliente')}
                className="w-full text-left p-4 bg-neutral-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-all text-blue-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-800">Novo Cliente</p>
                  <p className="text-[10px] text-neutral-500">Cadastrar no sistema</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}