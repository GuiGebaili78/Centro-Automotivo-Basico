import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { IOrdemDeServico } from '../types/backend';
import { Search, Plus, Phone, CheckCircle } from 'lucide-react';


import { StatusBanner } from '../components/ui/StatusBanner';
import { Modal } from '../components/ui/Modal';

export const OrdemDeServicoPage = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState(''); // NEW: Localizar Search
    const [dateFilter, setDateFilter] = useState<'ALL' | 'HOJE' | 'SEMANA' | 'MES'>('HOJE');

    const [oss, setOss] = useState<IOrdemDeServico[]>([]);
    
    // Status Feedback
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    const location = useLocation();

    // --- DATA LOADING ---
    const loadOss = useCallback(async () => {
        try {
            const response = await api.get('/ordem-de-servico');
            setOss(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar Ordens de Serviço.' });
        }
    }, []);




    // Wizard State for New OS
    const [newOsWizardStep, setNewOsWizardStep] = useState<'NONE' | 'OS'>('NONE');
    const [wizardClient, setWizardClient] = useState<any>(null);
    const [wizardVehicle, setWizardVehicle] = useState<any>(null);

    useEffect(() => {
        loadOss();

        const params = new URLSearchParams(location.search);
        const osId = params.get('id');
        const paramClientId = params.get('clientId');
        const paramVehicleId = params.get('vehicleId');

        if (osId) {
            handleOpenFromId(Number(osId));
        } else if (paramClientId && paramVehicleId) {
             const loadForDirectOpen = async () => {
                try {
                    const [cRes, vRes] = await Promise.all([
                        api.get(`/cliente/${paramClientId}`),
                        api.get(`/veiculo/${paramVehicleId}`)
                    ]);
                    setWizardClient(cRes.data);
                    setWizardVehicle(vRes.data);
                    setNewOsWizardStep('OS');
                } catch (e) {
                    console.error("Error loading for direct open", e);
                }
             };
             loadForDirectOpen();
        }
    }, [loadOss, location.search]);

    const handleOpenNewOsForExisting = (vehicle: any, client: any) => {
        if (!vehicle || !client) return;
        setWizardClient(client);
        setWizardVehicle(vehicle);
        setNewOsWizardStep('OS');
    };

    const handleCreateOsFinal = async (
        mechanicId: number | null = null, 
        km: number = 0, 
        defect: string = '',
        overrideVehicle: any = null,
        overrideClient: any = null
    ) => {
        const client = overrideClient || wizardClient;
        const vehicle = overrideVehicle || wizardVehicle;

        if (!client || !vehicle) return;

        try {
             const payload = {
                id_cliente: client.id_cliente,
                id_veiculo: vehicle.id_veiculo,
                id_funcionario: mechanicId || null,
                km_entrada: km,
                defeito_relatado: defect,
                status: 'ABERTA',
                valor_total_cliente: 0,
                valor_mao_de_obra: 0,
                parcelas: 1
            };
            const res = await api.post('/ordem-de-servico', payload);
            setNewOsWizardStep('NONE');
            setWizardClient(null);
            setWizardVehicle(null);
            handleNewOsSuccess(res.data.id_os);
            setStatusMsg({ type: 'success', text: 'OS Criada com Sucesso!' });
        } catch (e) {
            setStatusMsg({ type: 'error', text: 'Erro ao criar OS.' });
        }
    };

    // --- HANDLERS ---

    const handleOpenFromId = (id: number) => {
        navigate(`/ordem-de-servico/${id}`);
    };

    const handleNewOsSuccess = async (newOsId: number) => {
        handleOpenFromId(newOsId);
    };

    const handleManageItem = (os: IOrdemDeServico) => {
        handleOpenFromId(os.id_os);
    };


    // FILTER LOGIC
    const filteredOss = (Array.isArray(oss) ? oss : []).filter(os => {
        // 1. Date Filter
        if (dateFilter !== 'ALL') {
             const now = new Date();
             const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
             const osDate = new Date(os.dt_abertura);
             
             if (dateFilter === 'HOJE') {
                 if (osDate < startOfToday) return false;
             } else if (dateFilter === 'SEMANA') {
                 const weekAgo = new Date(startOfToday);
                 weekAgo.setDate(startOfToday.getDate() - 7);
                 if (osDate < weekAgo) return false;
             } else if (dateFilter === 'MES') {
                 const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                 if (osDate < firstDayMonth) return false;
             }
        }

        if (!searchTerm) {
            // User requested to show ALL OSs (subject to Date Filter)
            // Previously restricted to 'ABERTA'. Now we show everything matching the date filter.
            return true; 
        }

        const q = searchTerm.toLowerCase();
        const plate = os.veiculo?.placa?.toLowerCase() || '';
        const model = os.veiculo?.modelo?.toLowerCase() || '';
        const brand = os.veiculo?.marca?.toLowerCase() || '';
        const color = os.veiculo?.cor?.toLowerCase() || '';
        const owner = (os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social || '').toLowerCase();
        const id = String(os.id_os);
        const fullIdHash = `#${os.id_os}`;
        
        return [plate, model, brand, color, owner, id, fullIdHash].join(' ').includes(q);
    });


    

    // --- RENDER ---
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

    return (
        <div className="space-y-6">
            {statusMsg.text && (
                <div className="fixed bottom-8 right-8 z-60">
                     <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({ type: null, text: '' })} />
                </div>
            )}

            {/* HEADER */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Ordens de Serviço</h1>
                        <p className="text-neutral-500">Gestão centralizada de atendimentos.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/novo-cadastro')}
                        className="group bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Novo Cadastro
                    </button>
                </div>
            </div>


            {/* MAIN INTERFACE: SEARCH & LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-neutral-700 transition-all placeholder:text-neutral-400 placeholder:font-normal"
                            placeholder="Buscar por Placa, Cliente ou Modelo..."
                        />
                    </div>
                    
                    {/* Date Filters */}
                    <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                         {['ALL', 'HOJE', 'SEMANA', 'MES'].map((f) => (
                             <button
                                 key={f}
                                 onClick={() => setDateFilter(f as any)}
                                 className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${dateFilter === f ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                             >
                                 {f === 'ALL' ? 'Todos' : f === 'MES' ? 'Mês' : f}
                             </button>
                         ))}
                    </div>
                </div>

                {/* SEARCH RESULTS */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">OS / Data</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">Veículo</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">Diagnóstico / Ações</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">Técnico</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">Cliente</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest text-center">Status</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredOss.sort((a,b) => b.id_os - a.id_os).map((os) => (
                                <tr key={os.id_os} className="hover:bg-neutral-25 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-bold text-neutral-900">#{os.id_os}</div>
                                        <div className="text-[10px] text-neutral-400 font-medium">{new Date(os.dt_abertura).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-neutral-700 tracking-tight text-sm uppercase">
                                            {os.veiculo?.placa} - {os.veiculo?.modelo} 
                                        </div>
                                        <div className="text-[10px] text-neutral-400 font-bold uppercase">
                                             ({os.veiculo?.cor || 'Cor N/I'})
                                        </div>
                                    </td>
                                    <td className="p-4 max-w-[200px]" title={os.diagnostico || os.defeito_relatado || 'Sem diagnóstico registrado'}>
                                        <p className="text-xs font-medium text-neutral-600 line-clamp-2">
                                            {os.diagnostico || os.defeito_relatado || <span className="text-neutral-300 italic">Pendente</span>}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs font-bold text-neutral-700 uppercase truncate max-w-[120px]" title="Responsável Técnico">
                                            {(() => {
                                                // @ts-ignore
                                                const mechanics = os.servicos_mao_de_obra?.map(s => s.funcionario?.pessoa_fisica?.pessoa?.nome?.split(' ')[0]).filter(Boolean);
                                                const uniqueMechanics = [...new Set(mechanics || [])];
                                                
                                                if (uniqueMechanics.length > 0) {
                                                    return uniqueMechanics.join(', ');
                                                }
                                                // Fallback to OS Creator/Owner
                                                return os.funcionario?.pessoa_fisica?.pessoa?.nome?.split(' ')[0] || <span className="text-neutral-300">---</span>;
                                            })()}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-neutral-700 text-sm truncate max-w-[150px]">
                                            {os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social || 'Desconhecido'}
                                        </div>
                                        <div className="text-[10px] text-neutral-400 font-medium">{os.cliente?.telefone_1}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ${getStatusStyle(os.status)}`}>
                                            {os.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleManageItem(os)} 
                                                className="h-9 px-4 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-lg font-bold text-xs uppercase hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors shadow-sm"
                                            >
                                                Gerenciar
                                            </button>
                                            
                                            {(os.status === 'FINALIZADA' || os.status === 'PRONTO PARA FINANCEIRO' || os.status === 'PAGA_CLIENTE') && (
                                                <button 
                                                    onClick={() => handleOpenNewOsForExisting(os.veiculo, os.cliente)}
                                                    className="h-9 px-4 bg-primary-50 border border-primary-100 text-primary-600 rounded-lg font-bold text-xs uppercase hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors flex items-center gap-2 shadow-sm"
                                                    title="Nova OS para este veículo"
                                                    >
                                                    <Plus size={16} /> Nova OS
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {/* Empty/No Results: Show 'INICIAR NOVA OS' Button */}
                            {filteredOss.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <p className="font-bold text-neutral-400 mb-2">Nenhum registro encontrado.</p>
                                        <p className="text-sm text-neutral-400 mb-4">Deseja iniciar um novo atendimento?</p>
                                        <button 
                                            onClick={() => navigate('/novo-cadastro')}
                                            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
                                        >
                                            <Plus size={20} /> NOVO CADASTRO
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS (SHARED) --- */}
            {/* WIZARD MODALS */}


            {/* WIZARD MODALS */}
            {/* Step 1 & 2 replaced by CadastroUnificadoPage. Only Step 3 (OS Confirmation) remains. */}


            {newOsWizardStep === 'OS' && wizardClient && wizardVehicle && (
                 <Modal title="Passo 3: Confirmar Abertura" onClose={() => setNewOsWizardStep('NONE')} className="max-w-xl">
                     <div className="space-y-6">
                         <div className="bg-primary-50 p-6 rounded-xl border border-primary-100 space-y-4">
                            <div className="flex justify-between items-start border-b border-primary-100 pb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-primary-400 uppercase mb-1">Cliente</p>
                                    <p className="font-bold text-primary-900 text-lg leading-tight">{wizardClient.pessoa_fisica?.pessoa?.nome || wizardClient.pessoa_juridica?.razao_social}</p>
                                    <p className="text-sm text-primary-600 font-bold mt-1 flex items-center gap-1">
                                        <Phone size={14} className="text-primary-400" /> {wizardClient.telefone_1 || wizardClient.telefone_2 || 'Sem telefone'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-primary-400 uppercase mb-1">Veículo</p>
                                    <div className="flex items-center gap-3">
                                         {/* Gray Circle Removed */}
                                         <div>
                                            <p className="font-black text-primary-900 text-xl tracking-tight">{wizardVehicle.placa}</p>
                                            <p className="text-xs text-primary-600 font-bold uppercase">{wizardVehicle.modelo} • {wizardVehicle.cor}</p>
                                         </div>
                                    </div>
                                </div>
                            </div>
                         </div>
                         
                         <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
                             <p className="text-neutral-500 text-sm font-medium">Confirme os dados acima para iniciar a Ordem de Serviço.</p>
                         </div>
                         
                         <form onSubmit={(e) => {
                             e.preventDefault();
                             handleCreateOsFinal(null, 0, ''); // No mechanic, No KM, No Defect for now
                         }}>
                             <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setNewOsWizardStep('NONE')} className="flex-1 py-4 text-sm font-bold text-neutral-500 hover:bg-neutral-50 rounded-xl transition-colors">CANCELAR</button>
                                <button type="submit" style={{ flex: 2 }} className="py-4 bg-neutral-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform hover:-translate-y-1 flex items-center justify-center gap-2">
                                    <CheckCircle size={20} /> ABRIR ORDEM DE SERVIÇO
                                </button>
                             </div>
                         </form>
                     </div>
                 </Modal>
            )}

        </div>
    );
};
