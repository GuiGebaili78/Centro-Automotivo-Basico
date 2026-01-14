import { useState, useEffect } from 'react';
import { api } from '../services/api';
// Removed FechamentoFinanceiroForm import
import { Modal } from '../components/ui/Modal';
import { Search, Trash2, Edit } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    defeito_relatado?: string;
    diagnostico?: string;
}

export const FechamentoFinanceiroPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [fechamentos, setFechamentos] = useState<IFechamentoFinanceiro[]>([]);
    const [pendingOss, setPendingOss] = useState<IOS[]>([]);
    // Removed showModal state
    // Removed selectedOsId state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    // Date Filters
    const [filterStart, setFilterStart] = useState(new Date().toLocaleDateString('en-CA'));
    const [filterEnd, setFilterEnd] = useState(new Date().toLocaleDateString('en-CA'));

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
            
            const allOss = osRes.data;
            // Filter OSs: Em Andamento, Aberta, Pronto Para Financeiro (and Finalizada if pending logic applies, usually Finalizada has fechamento)
            // But if Finalizada DOES NOT have Fechamento, we show it too.
            const pending = allOss.filter((os: IOS) => 
                ['ABERTA', 'EM_ANDAMENTO', 'PRONTO PARA FINANCEIRO', 'FINALIZADA'].includes(os.status) && 
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
        navigate(`/fechamento-financeiro/${id_os}`);
    };

    const handleEditFechamento = (fechamento: IFechamentoFinanceiro) => {
        navigate(`/fechamento-financeiro/${fechamento.id_os}`);
    };

    const handleDelete = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar Fechamento',
            message: 'Tem certeza que deseja cancelar este fechamento financeiro? Isso não apaga a OS, apenas a consolidação.',
            onConfirm: async () => {
                try {
                    await api.delete(`/fechamento-financeiro/${id}`);
                    setStatusMsg({ type: 'success', text: 'Fechamento cancelado com sucesso!' });
                    loadData();
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                } catch (error) {
                    setStatusMsg({ type: 'error', text: 'Erro ao deletar fechamento' });
                }
            }
        });
    };



    const getClientName = (os: IOS) => {
        return os.cliente?.pessoa_fisica?.pessoa?.nome || 
               os.cliente?.pessoa_juridica?.nome_fantasia || 
               os.cliente?.pessoa_juridica?.razao_social || 'Cliente N/I';
    };

    const applyQuickFilter = (type: 'TODAY' | 'WEEK' | 'MONTH') => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');
        
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
        if (filterStart) {
            const recordDate = new Date(f.data_fechamento_financeiro);
            const recordDateLocal = recordDate.toLocaleDateString('en-CA');
            if (recordDateLocal < filterStart) return false;
        }
        if (filterEnd) {
             const recordDate = new Date(f.data_fechamento_financeiro);
             const recordDateLocal = recordDate.toLocaleDateString('en-CA');
             if (recordDateLocal > filterEnd) return false;
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
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Consolidação</h1>
                    <p className="text-gray-500 mt-1">Consolidação de custos e serviços.</p>
                </div>
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
                                    <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Defeito / Diagnóstico</th>
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
                                            <div className="flex flex-col gap-2 max-w-xs">
                                                <div className="leading-tight">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Defeito</span>
                                                    <span className="text-xs text-gray-700 font-medium line-clamp-2" title={os.defeito_relatado}>{os.defeito_relatado || '-'}</span>
                                                </div>
                                                <div className="leading-tight">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase block">Diagnóstico</span>
                                                    <span className="text-xs text-blue-700 font-medium line-clamp-2" title={os.diagnostico}>{os.diagnostico || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                os.status === 'ABERTA' ? 'bg-blue-100 text-blue-700' : 
                                                os.status === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {os.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Reopen OS currently ONLY makes sense if it was FINALIZED but not Closed financially? Or logic in handleReopen handles it. */}
                                                <button 
                                                    onClick={() => handleOpenFechamento(os.id_os)}
                                                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-gray-800 transition-all hover:-translate-y-0.5"
                                                >
                                                    Fechar Financeiro
                                                </button>
                                            </div>
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

            {confirmModal.isOpen && (
                <Modal title={confirmModal.title} onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}>
                    <p className="mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmModal.onConfirm}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
                            Confirmar
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
