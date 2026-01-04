import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FechamentoFinanceiroForm } from '../components/forms/FechamentoFinanceiroForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { StatusBanner } from '../components/ui/StatusBanner';

interface IFechamentoFinanceiro {
    id_fechamento_financeiro: number;
    id_os: number;
    custo_total_pecas_real: number;
    data_fechamento_financeiro: string;
    ordem_de_servico: IOS;
}

interface IOS {
    id_os: number;
    status: string;
    valor_total_cliente: number;
    cliente: {
        pessoa_fisica?: { pessoa: { nome: string } };
        pessoa_juridica?: { nome_fantasia: string; razao_social: string };
    };
    veiculo: {
        placa: string;
        modelo: string;
        cor: string;
    };
    fechamento_financeiro?: IFechamentoFinanceiro;
    servicos_mao_de_obra?: {
        funcionario: {
            pessoa_fisica: {
                pessoa: {
                    nome: string;
                }
            }
        }
    }[];
}

export const FechamentoFinanceiroPage = () => {
    const location = useLocation();
    const [fechamentos, setFechamentos] = useState<IFechamentoFinanceiro[]>([]);
    const [pendingOss, setPendingOss] = useState<IOS[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedOsId, setSelectedOsId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    
    // Date Filters
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlIdOs = params.get('id_os');
        if (urlIdOs) {
            handleOpenFechamento(Number(urlIdOs));
        }
    }, [location.search]);

    const loadData = async () => {
        try {
            const [fechamentosRes, osRes] = await Promise.all([
                api.get('/fechamento-financeiro'),
                api.get('/ordem-de-servico')
            ]);
            
            setFechamentos(fechamentosRes.data);
            
            // Filter OSs that are ready for finance but don't have a closing record yet
            const allOss = osRes.data;
            // Also include FINALIZADA because sometimes they might need closing adjustments? 
            // The prompt says "Aguardando Consolidação" -> Usually PRONTO PARA FINANCEIRO
            const pending = allOss.filter((os: IOS) => 
                (os.status === 'PRONTO PARA FINANCEIRO' || os.status === 'FINALIZADA') && 
                !os.fechamento_financeiro &&
                !fechamentosRes.data.some((f: IFechamentoFinanceiro) => f.id_os === os.id_os)
            );
            setPendingOss(pending);

        } catch (error) {
            console.error('Erro ao carregar dados', error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar dados financeiros' });
        }
    };

    const handleOpenFechamento = (id_os: number) => {
        setSelectedOsId(id_os);
        setShowModal(true);
    };

    const handleEditFechamento = (fechamento: IFechamentoFinanceiro) => {
        setSelectedOsId(fechamento.id_os);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if(!confirm("Tem certeza que deseja cancelar este fechamento financeiro? Isso não apaga a OS, apenas a consolidação.")) return;
        try {
            await api.delete(`/fechamento-financeiro/${id}`);
            setStatusMsg({ type: 'success', text: 'Fechamento cancelado com sucesso!' });
            loadData();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao deletar fechamento' });
        }
    };

    const getClientName = (os: IOS) => {
        return os.cliente?.pessoa_fisica?.pessoa?.nome || 
               os.cliente?.pessoa_juridica?.nome_fantasia || 
               os.cliente?.pessoa_juridica?.razao_social || 'Cliente N/I';
    };

    const applyQuickFilter = (type: 'TODAY' | 'WEEK' | 'MONTH') => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // Local YYYY-MM-DD
        
        if (type === 'TODAY') {
            setFilterStart(todayStr);
            setFilterEnd(todayStr);
        } else if (type === 'WEEK') {
             const weekAgo = new Date(now);
             weekAgo.setDate(now.getDate() - 7);
             setFilterStart(weekAgo.toLocaleDateString('en-CA'));
             setFilterEnd(todayStr);
        } else if (type === 'MONTH') {
             const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
             setFilterStart(firstDay.toLocaleDateString('en-CA'));
             setFilterEnd(todayStr);
        }
    };

    const filteredFechamentos = fechamentos.filter(f => {
        // Date Filter
        if (filterStart) {
            const date = new Date(f.data_fechamento_financeiro);
            const start = new Date(filterStart);
            // reset time for date comparison or use string comparison
            // Simplest: Compare YYYY-MM-DD strings
            if (f.data_fechamento_financeiro < filterStart) return false; 
            // Note: String comparison works for ISO dates. data_fechamento likely ISO
        }
        if (filterEnd) {
             const dateStr = f.data_fechamento_financeiro.split('T')[0];
             if (dateStr > filterEnd) return false;
        }

        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        
        const id = String(f.id_fechamento_financeiro);
        const fullId = `#${id}`;
        const osId = String(f.id_os);
        const fullOsId = `#${osId}`;
        const plate = f.ordem_de_servico?.veiculo?.placa?.toLowerCase() || '';
        const model = f.ordem_de_servico?.veiculo?.modelo?.toLowerCase() || '';
        const color = f.ordem_de_servico?.veiculo?.cor?.toLowerCase() || '';
        
        return [id, fullId, osId, fullOsId, plate, model, color].join(' ').includes(q);
    }).sort((a, b) => b.id_fechamento_financeiro - a.id_fechamento_financeiro);


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestão Financeira</h1>
                    <p className="text-gray-500 mt-1">Consolidação de custos e serviços.</p>
                </div>
                <button 
                    onClick={() => { setSelectedOsId(null); setShowModal(true); }}
                    className="hidden md:flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-gray-200 transition-all hover:bg-gray-800 hover:scale-[1.02]"
                >
                    <Plus size={20} />
                    Lançamento Manual
                </button>
            </div>

            {/* PENDING OS LIST */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
                    Aguardando Consolidação
                </h2>
                
                {pendingOss.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-400 italic font-medium">
                        Nenhum fechamento pendente
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">OS ID</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Veículo</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pendingOss.map(os => (
                                    <tr key={os.id_os} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-5 font-bold text-gray-900">#{os.id_os}</td>
                                        <td className="p-5 text-gray-600 font-medium">{getClientName(os)}</td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 uppercase">{os.veiculo?.placa}</span>
                                                <span className="text-xs text-gray-400">{os.veiculo?.modelo}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 uppercase">
                                                {os.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => handleOpenFechamento(os.id_os)}
                                                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-gray-800 transition-all hover:-translate-y-0.5"
                                            >
                                                Fechar Financeiro
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* HISTORY LIST */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-2 h-8 bg-green-600 rounded-full"></span>
                        Histórico de Fechamentos
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                         {/* Quick Filters */}
                         <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => applyQuickFilter('TODAY')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-white hover:shadow-sm text-gray-500 hover:text-gray-900 transition-all">Hoje</button>
                            <button onClick={() => applyQuickFilter('WEEK')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-white hover:shadow-sm text-gray-500 hover:text-gray-900 transition-all">Semana</button>
                            <button onClick={() => applyQuickFilter('MONTH')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-white hover:shadow-sm text-gray-500 hover:text-gray-900 transition-all">Mês</button>
                        </div>

                         {/* Date Inputs */}
                         <div className="flex gap-2">
                            <input 
                                type="date" 
                                value={filterStart}
                                onChange={e => setFilterStart(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
                            />
                            <input 
                                type="date" 
                                value={filterEnd}
                                onChange={e => setFilterEnd(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={18} />
                            <input 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                placeholder="Buscar por ID ou Placa..." 
                                className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none w-48 bg-white shadow-sm font-medium text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">OS</th>
                                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Veículo (Placa/Cor)</th>
                                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Serviço</th>
                                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Mão de Obra (Execução)</th>
                                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredFechamentos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-400 italic">
                                        {searchTerm || filterStart ? 'Nenhum registro encontrado para a busca.' : 'Nenhum fechamento realizado ainda.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredFechamentos.map((fech) => (
                                    <tr key={fech.id_fechamento_financeiro} className="hover:bg-gray-50 group transition-colors">
                                        <td className="p-5">
                                            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">OS #{fech.id_os}</span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 uppercase">
                                                    {fech.ordem_de_servico?.veiculo?.placa || '-'} - {fech.ordem_de_servico?.veiculo?.modelo} 
                                                </span>
                                                <span className="text-xs text-gray-400 uppercase">
                                                    ({fech.ordem_de_servico?.veiculo?.cor || 'Cor N/I'})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 w-fit px-3 py-1 rounded-lg">
                                                <span className="text-xs">R$</span>
                                                {Number(fech.ordem_de_servico?.valor_total_cliente || 0).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1">
                                                {fech.ordem_de_servico?.servicos_mao_de_obra && fech.ordem_de_servico.servicos_mao_de_obra.length > 0 ? (
                                                     Array.from(new Set(fech.ordem_de_servico.servicos_mao_de_obra
                                                        .map(svc => svc.funcionario?.pessoa_fisica?.pessoa?.nome?.split(' ')[0])
                                                        .filter(Boolean)
                                                     )).map((name, idx) => (
                                                         <span key={idx} className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded w-fit">
                                                             {name}
                                                         </span>
                                                     ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Não informado</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm text-gray-500">
                                            {new Date(fech.data_fechamento_financeiro).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEditFechamento(fech)}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="Editar Detalhes"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(fech.id_fechamento_financeiro)}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                    title="Cancelar Fechamento"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <Modal title={selectedOsId ? "Detalhes do Fechamento" : "Novo Fechamento"} onClose={() => setShowModal(false)} className="max-w-5xl">
                    <FechamentoFinanceiroForm 
                        preSelectedOsId={selectedOsId}
                        onSuccess={() => {
                            setShowModal(false);
                            loadData();
                            setStatusMsg({ type: 'success', text: 'Operação realizada com sucesso!' });
                            setTimeout(() => setStatusMsg({type: null, text: ''}), 3000);
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
