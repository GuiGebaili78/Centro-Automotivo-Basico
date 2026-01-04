import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { FormEvent } from 'react';
import { api } from '../services/api';
import type { IOrdemDeServico } from '../types/backend';
import { 
    Search, Plus, PenTool, Car, X,
    Package, Wrench, CheckCircle, BadgeCheck, DollarSign, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { StatusBanner } from '../components/ui/StatusBanner';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { PagamentoClienteForm } from '../components/forms/PagamentoClienteForm';
import { ClienteForm } from '../components/forms/ClienteForm';
import { VeiculoForm } from '../components/forms/VeiculoForm';
import { LaborManager } from '../components/os/LaborManager';

export const OrdemDeServicoPage = () => {
    const navigate = useNavigate();
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState(''); // NEW: Localizar Search
    const [dateFilter, setDateFilter] = useState<'ALL' | 'HOJE' | 'SEMANA' | 'MES'>('ALL');

    const [oss, setOss] = useState<IOrdemDeServico[]>([]);
    
    // Management Modal State
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [selectedOsForItems, setSelectedOsForItems] = useState<IOrdemDeServico | null>(null);
    const [osItems, setOsItems] = useState<any[]>([]);
    const [highlightIndex, setHighlightIndex] = useState(-1); // Keyboard Nav State
    const [availableParts, setAvailableParts] = useState<any[]>([]);
    const [laborServices, setLaborServices] = useState<any[]>([]);
    
    // Component State
    const [employees, setEmployees] = useState<any[]>([]);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    // Items / Parts Management
    const [partSearch, setPartSearch] = useState('');
    const [partResults, setPartResults] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ id_pecas_estoque: '', quantidade: '1', valor_venda: '', descricao: '', codigo_referencia: '', id_fornecedor: '' });
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const partInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    


    // Edit Item Modal
    const [editItemModalOpen, setEditItemModalOpen] = useState(false);
    const [editingItemData, setEditingItemData] = useState<any>(null);

    // Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });



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

    const loadEmployees = async () => {
        try {
            const response = await api.get('/funcionario');
            setEmployees(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadParts = async () => {
        try {
            const response = await api.get('/pecas-estoque');
            setAvailableParts(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadOsItems = async (idOs: number) => {
        try {
            const response = await api.get(`/itens-os/os/${idOs}`);
            setOsItems(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar itens.' });
        }
    };

    // Wizard State for New OS
    const [newOsWizardStep, setNewOsWizardStep] = useState<'NONE' | 'CLIENT' | 'VEHICLE' | 'OS'>('NONE');
    const [wizardClient, setWizardClient] = useState<any>(null);
    const [wizardVehicle, setWizardVehicle] = useState<any>(null); // If we have a vehicle selected
    const [wizardVehicleList, setWizardVehicleList] = useState<any[]>([]); // To show list of vehicles for existing client
    const [showVehicleForm, setShowVehicleForm] = useState(false);

    useEffect(() => {
        loadOss();
        loadEmployees();
        loadParts();

        const params = new URLSearchParams(location.search);
        const osId = params.get('id');
        const paramClientId = params.get('clientId');
        const paramVehicleId = params.get('vehicleId');

        if (osId) {
            handleOpenFromId(Number(osId));
        } else if (paramClientId && paramVehicleId) {
             // Quick start from URL (e.g. from Client Page)
             // We need to fetch objects first... or just assume IDs. 
             // Ideally we open the 'Quick OS Confirmation' or create immediately. 
             // Let's defer this implementation or handle it:
             // For now, ignore or implement if requested.
        }
    }, [loadOss, location.search]);

    const handleOpenNewOsForExisting = (vehicle: any, client: any) => {
        if (!vehicle || !client) return;
        setWizardClient(client);
        setWizardVehicle(vehicle);
        // Skip straight to OS creation confirmation/input (mechanic/km)
        // We reuse the same logic: open a small modal to confirm OS creation
        // Reuse 'confirmModal' or better, a unified 'Start OS Modal'
        setNewOsWizardStep('OS');
    };

    const handleClientWizardSuccess = async (client: any) => {
        setWizardClient(client);
        
        try {
            const res = await api.get('/veiculo');
            const myVehicles = res.data.filter((v: any) => v.id_cliente === client.id_cliente);
            
            if (myVehicles.length === 1) {
                // If only 1 vehicle, auto create OS immediately
                handleCreateOsFinal(null, 0, '', myVehicles[0], client);
            } else if (myVehicles.length > 1) {
                // Multiple choices: Show List, Hide Form initially
                setWizardVehicleList(myVehicles);
                setShowVehicleForm(false);
                setNewOsWizardStep('VEHICLE');
            } else {
                 // 0 Vehicles: Show Form
                 setWizardVehicleList([]);
                 setShowVehicleForm(true);
                 setNewOsWizardStep('VEHICLE');
            }
        } catch {
             setWizardVehicleList([]);
             setShowVehicleForm(true);
             setNewOsWizardStep('VEHICLE');
        }
    };

    const handleVehicleWizardSuccess = (vehicle: any) => {
        // Auto create OS immediately after selection
        handleCreateOsFinal(null, 0, '', vehicle, wizardClient);
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

    const handleOpenFromId = async (id: number) => {
        try {
            const response = await api.get(`/ordem-de-servico/${id}`);
            setSelectedOsForItems(response.data);
            setManageModalOpen(true);
            setOsItems(response.data.itens_os || []);
            setLaborServices(response.data.servicos_mao_de_obra || []);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao abrir OS.' });
        }
    };

    const handleNewOsSuccess = async (newOsId: number) => {
        await loadOss();
        handleOpenFromId(newOsId); // Open management modal
    };

    const handleManageItem = async (os: IOrdemDeServico) => {
        handleOpenFromId(os.id_os);
    };

    const updateOSField = async (field: string, value: any) => {
         if (!selectedOsForItems || selectedOsForItems.status === 'FINALIZADA' || selectedOsForItems.status === 'PAGA_CLIENTE') return;

         try {
             setSelectedOsForItems(prev => prev ? ({ ...prev, [field]: value }) : null);
             await api.put(`/ordem-de-servico/${selectedOsForItems.id_os}`, { [field]: value });
         } catch (error) {
             setStatusMsg({ type: 'error', text: 'Erro ao salvar alteração.' });
         }
    };

    // FILTER LOGIC
    const filteredOss = oss.filter(os => {
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

    const handlePartSearch = async (val: string) => {
        setPartSearch(val);
        if (val.length < 2) { setPartResults([]); return; }
        try {
            const [stockRes, historyRes] = await Promise.all([
                api.get(`/pecas-estoque/search?q=${val}`),
                api.get(`/itens-os/search/desc?q=${val}`)
            ]);
            const historyFormatted = historyRes.data.map((h: any) => ({
                id_pecas_estoque: null, nome: h.descricao, valor_venda: h.valor_venda, fabricante: 'Histórico', isHistory: true
            }));
            const combined = [...stockRes.data, ...historyFormatted];
            // Unique by namne
             const unique = combined.filter((v, i, a) => a.findIndex(t => t.nome === v.nome) === i);
            setPartResults(unique);
        } catch (e) { console.error(e); }
    };

    const selectPart = (p: any) => {
        setNewItem({ ...newItem, id_pecas_estoque: String(p.id_pecas_estoque), valor_venda: String(p.valor_venda), descricao: p.nome });
        setPartSearch(p.nome);
        setPartResults([]);
        setHighlightIndex(-1);
        requestAnimationFrame(() => referenceInputRef.current?.focus());
    };

    const handleAddItem = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedOsForItems) return;
        try {
            const part = availableParts.find(p => p.id_pecas_estoque === Number(newItem.id_pecas_estoque));
            const description = part ? part.nome : (newItem.descricao || partSearch || 'Item Diverso');
            const qtd = Number(newItem.quantidade);
            const val = Number(newItem.valor_venda);

            if (editingItemId) {
                await api.put(`/itens-os/${editingItemId}`, {
                    descricao: description, quantidade: qtd, valor_venda: val, valor_total: qtd * val,
                    codigo_referencia: newItem.codigo_referencia, id_fornecedor: newItem.id_fornecedor || null
                });
                setStatusMsg({ type: 'success', text: 'Item adicionado/atualizado!' });
            } else {
                await api.post('/itens-os', {
                    id_os: selectedOsForItems.id_os, id_pecas_estoque: newItem.id_pecas_estoque ? Number(newItem.id_pecas_estoque) : null,
                    descricao: description, quantidade: qtd, valor_venda: val, valor_total: qtd * val,
                    codigo_referencia: newItem.codigo_referencia, id_fornecedor: newItem.id_fornecedor || null
                });
                setStatusMsg({ type: 'success', text: 'Item adicionado!' });
            }
            setNewItem({ id_pecas_estoque: '', quantidade: '1', valor_venda: '', descricao: '', codigo_referencia: '', id_fornecedor: '' });
            setPartSearch('');
            setEditingItemId(null);
            loadOsItems(selectedOsForItems.id_os);
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 1500);
            // Focus back on search input for rapid entry
            requestAnimationFrame(() => partInputRef.current?.focus());
            setTimeout(() => partInputRef.current?.focus(), 100);
        } catch (error) { setStatusMsg({ type: 'error', text: 'Erro ao salvar item.' }); }
    };

    const handleDeleteItem = (id: number) => {
        if (!selectedOsForItems) return;
        setConfirmModal({
            isOpen: true, title: 'Excluir Item', message: 'Deseja excluir este item?',
            onConfirm: async () => {
                await api.delete(`/itens-os/${id}`);
                loadOsItems(selectedOsForItems.id_os);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleEditItem = (item: any) => {
         setEditingItemData({ ...item, id_fornecedor: item.pagamentos_peca?.[0]?.id_fornecedor || '' });
         setEditItemModalOpen(true);
    };

    const handleSaveItemEdit = async () => {
        if (!editingItemData || !selectedOsForItems) return;
        try {
            const qtd = Number(editingItemData.quantidade);
            const val = Number(editingItemData.valor_venda);
            await api.put(`/itens-os/${editingItemData.id_iten}`, {
                descricao: editingItemData.descricao, 
                quantidade: qtd, 
                valor_venda: val, 
                valor_total: qtd * val,
                codigo_referencia: editingItemData.codigo_referencia, 
                id_fornecedor: editingItemData.id_fornecedor ? Number(editingItemData.id_fornecedor) : null
            });
            loadOsItems(selectedOsForItems.id_os);
            setEditItemModalOpen(false);
            setEditingItemData(null);
        } catch (e) { setStatusMsg({ type: 'error', text: 'Erro ao editar item.' }); }
    };

    // --- FINISH Handlers
    const handleFinishService = async () => {
        if (!selectedOsForItems) return;
        const totalItems = osItems.reduce((acc, item) => acc + Number(item.valor_total), 0);
        
        // Se houver serviços de Mão de Obra cadastrados, usa a soma deles. 
        // Se não houver (lista vazia), preserva o valor manual que pode ter sido editado no Financeiro.
        const sumLaborServices = laborServices.reduce((acc, l) => acc + Number(l.valor), 0);
        const finalLaborValue = laborServices.length > 0 ? sumLaborServices : Number(selectedOsForItems.valor_mao_de_obra || 0);
        
        try {
             await api.put(`/ordem-de-servico/${selectedOsForItems.id_os}`, {
                valor_pecas: totalItems,
                valor_mao_de_obra: finalLaborValue,
                valor_total_cliente: totalItems + finalLaborValue,
                status: 'PRONTO PARA FINANCEIRO',
                dt_entrega: selectedOsForItems.dt_entrega ? new Date(selectedOsForItems.dt_entrega).toISOString() : new Date().toISOString()
            });
            setStatusMsg({ type: 'success', text: 'OS Finalizada! Enviada para Financeiro.' });
            setStatusMsg({ type: 'success', text: 'OS Finalizada! Enviada para Financeiro.' });
            setTimeout(() => {
                setStatusMsg({ type: null, text: '' });
                // loadOss(); // No longer needed if navigating away
                navigate('/');
            }, 1500);
        } catch (e) { setStatusMsg({ type: 'error', text: 'Erro ao finalizar OS.' }); }
    };
    

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
                                        <p className="text-xs font-bold text-neutral-700 uppercase">
                                            {os.funcionario?.pessoa_fisica?.pessoa?.nome?.split(' ')[0] || <span className="text-neutral-300">---</span>}
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
                                            onClick={() => setNewOsWizardStep('CLIENT')}
                                            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
                                        >
                                            <Plus size={20} /> INICIAR NOVA OS
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS (SHARED) --- */}

            {/* MANAGEMENT MODAL */}
            {manageModalOpen && selectedOsForItems && (
                 <Modal 
                    className="max-w-6xl"
                    title={
                        <div className="flex items-baseline gap-2">
                            <span>OS #{selectedOsForItems.id_os}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusStyle(selectedOsForItems.status)}`}>
                                {selectedOsForItems.status}
                            </span>
                        </div>
                    } 
                    onClose={() => {
                        setManageModalOpen(false);
                        navigate('/'); // Redirect to Dashboard on Close as requested
                    }}
                >
                    <div className="space-y-8">
                        {/* Header Info */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-primary-50/50 rounded-2xl border border-primary-100 items-center">
                             {/* Coluna 1: Veículo (Destacando Modelo e Cor) */}
                             <div className="space-y-1">
                                 <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">Veículo</p>
                                 <div className="flex flex-col">
                                     <h3 className="text-2xl font-black text-primary-900 leading-none tracking-tight">
                                        {selectedOsForItems.veiculo?.modelo}
                                     </h3>
                                     <div className="flex items-center gap-2 mt-1">
                                         <span className="text-base font-bold text-primary-700 uppercase bg-primary-100/50 px-2 py-0.5 rounded-md">
                                             {selectedOsForItems.veiculo?.cor || 'Cor N/I'}
                                         </span>
                                         <span className="text-sm font-medium text-primary-400 uppercase tracking-widest border border-primary-200 px-2 py-0.5 rounded-md">
                                             {selectedOsForItems.veiculo?.placa}
                                         </span>
                                     </div>
                                 </div>
                             </div>

                             {/* Coluna 2: Cliente */}
                             <div className="space-y-1">
                                 <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">Cliente / Contato</p>
                                 <div className="flex flex-col">
                                     <p className="font-bold text-lg text-primary-900 leading-tight">
                                         {selectedOsForItems.cliente?.pessoa_fisica?.pessoa?.nome || selectedOsForItems.cliente?.pessoa_juridica?.razao_social}
                                     </p>
                                     <p className="text-sm font-medium text-primary-600 flex items-center gap-1">
                                         {selectedOsForItems.cliente?.telefone_1 || 'Sem telefone'}
                                     </p>
                                 </div>
                             </div>

                             {/* Coluna 3: Entrada */}
                             <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">Data de Entrada</p>
                                  <div className="flex items-center gap-2">
                                      <div className="bg-white p-2 rounded-lg border border-primary-100 shadow-sm">
                                        <p className="font-black text-xl text-primary-900 leading-none">
                                            {new Date(selectedOsForItems.dt_abertura).getDate()}
                                        </p>
                                      </div>
                                      <div className="flex flex-col leading-none">
                                          <span className="text-xs font-bold text-primary-500 uppercase">
                                              {new Date(selectedOsForItems.dt_abertura).toLocaleString('default', { month: 'short' })}
                                          </span>
                                          <span className="text-[10px] font-medium text-primary-300">
                                              {new Date(selectedOsForItems.dt_abertura).getFullYear()}
                                          </span>
                                      </div>
                                  </div>
                             </div>

                             {/* Coluna 4: KM */}
                             <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">KM Atual</label>
                                  <div className="relative group">
                                      <input 
                                        className="w-full bg-white border border-primary-200 text-primary-900 font-black text-xl rounded-xl px-4 py-2 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all shadow-sm"
                                        type="number"
                                        value={selectedOsForItems.km_entrada}
                                        onChange={e => setSelectedOsForItems({...selectedOsForItems, km_entrada: Number(e.target.value)})}
                                        onBlur={e => updateOSField('km_entrada', Number(e.target.value))}
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary-300 group-focus-within:text-primary-500 uppercase tracking-wider">KM</span>
                                  </div>
                             </div>
                         </div>

                         {/* SPLIT LAYOUT: Defects/Diagnosis (Left) & Labor (Right) */}
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                             
                             {/* LEFT COL: Text Areas */}
                             <div className="space-y-4">
                                 <div className="space-y-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Defeito Relatado
                                    </label>
                                    <textarea 
                                        className="w-full bg-red-50/20 p-3 rounded-xl border border-red-100 text-xs font-medium text-neutral-700 h-24 outline-none focus:border-red-300 focus:bg-white resize-none transition-all focus:shadow-sm"
                                        placeholder="Descreva o defeito..."
                                        value={selectedOsForItems.defeito_relatado || ''}
                                        onChange={e => setSelectedOsForItems({...selectedOsForItems, defeito_relatado: e.target.value})}
                                        onBlur={e => updateOSField('defeito_relatado', e.target.value)}
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Diagnóstico Técnico
                                    </label>
                                    <textarea 
                                        className="w-full bg-blue-50/20 p-3 rounded-xl border border-blue-100 text-xs font-medium text-neutral-700 h-24 outline-none focus:border-blue-300 focus:bg-white resize-none transition-all focus:shadow-sm"
                                        placeholder="Insira o diagnóstico..."
                                        value={selectedOsForItems.diagnostico || ''}
                                        onChange={e => setSelectedOsForItems({...selectedOsForItems, diagnostico: e.target.value})}
                                        onBlur={e => updateOSField('diagnostico', e.target.value)}
                                    />
                                 </div>
                             </div>

                             {/* RIGHT COL: Labor Manager */}
                             <div className="w-full space-y-2 h-full">
                                  <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                                     <Wrench size={14} /> Mão de Obra
                                  </h3>
                                   <div className="h-full max-h-[380px] overflow-y-auto group scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 pr-1">
                                     <LaborManager 
                                         mode="api"
                                         osId={selectedOsForItems.id_os}
                                         initialData={laborServices}
                                         employees={employees}
                                         onChange={() => handleOpenFromId(selectedOsForItems.id_os)} 
                                         readOnly={selectedOsForItems.status === 'FINALIZADA' || selectedOsForItems.status === 'PAGA_CLIENTE'}
                                     />
                                   </div>
                             </div>
                         </div>
                        
                        {/* ITENS (PEÇAS) - FULL WIDTH */}
                        <div className="space-y-4 pt-4 border-t border-dashed border-neutral-200">
                        <h3 className="text-sm font-black text-neutral-600 uppercase tracking-widest flex items-center gap-3 pb-2 border-b border-neutral-100">
                            <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                                <Package size={16} />
                            </div>
                            Peças e Produtos
                        </h3>
                        {/* Form Add Item */}
                        {selectedOsForItems.status !== 'FINALIZADA' && selectedOsForItems.status !== 'PAGA_CLIENTE' && (
                            <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm">
                                    <div className="relative group mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                                    <input 
                                        ref={partInputRef}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 font-bold text-sm bg-white transition-all shadow-sm"
                                        placeholder="Buscar peça no estoque..."
                                        value={partSearch}
                                        onChange={e => {
                                            handlePartSearch(e.target.value);
                                            setHighlightIndex(-1);
                                        }}
                                        onKeyDown={(e) => {
                                            if (partResults.length === 0) return;
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setHighlightIndex(prev => Math.min(prev + 1, partResults.length - 1));
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setHighlightIndex(prev => Math.max(prev - 1, -1)); // -1 means input focus
                                            } else if (e.key === 'Enter') {
                                                if (highlightIndex >= 0 && partResults[highlightIndex]) {
                                                    e.preventDefault();
                                                    selectPart(partResults[highlightIndex]);
                                                    setHighlightIndex(-1);
                                                }
                                            }
                                        }}
                                    />
                                    {partResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                                            {partResults.map((p, idx) => (
                                                <button 
                                                    key={p.id_pecas_estoque || p.nome} 
                                                    onClick={() => selectPart(p)} 
                                                    className={`w-full text-left p-3 text-sm font-medium border-b border-neutral-50 flex justify-between group/item transition-colors ${idx === highlightIndex ? 'bg-primary-50 ring-1 ring-inset ring-primary-100 z-10' : 'hover:bg-neutral-50'}`}
                                                >
                                                    <span className="text-neutral-700 group-hover/item:text-neutral-900">{p.nome}</span>
                                                    <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">R$ {Number(p.valor_venda).toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    </div>
                                    <form onSubmit={handleAddItem} className="flex gap-2">
                                        <input 
                                            ref={referenceInputRef}
                                            className="w-32 p-2.5 rounded-xl border border-neutral-200 bg-white font-bold text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
                                            placeholder="Ref (Opcional)" 
                                            value={newItem.codigo_referencia} 
                                            onChange={e => setNewItem({...newItem, codigo_referencia: e.target.value})} 
                                        />
                                        <input 
                                            ref={quantityInputRef}
                                            className="w-24 p-2.5 rounded-xl border border-neutral-200 bg-white font-bold text-center text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
                                            placeholder="Qtd" 
                                            value={newItem.quantidade} 
                                            onChange={e => setNewItem({...newItem, quantidade: e.target.value})} 
                                        />
                                        <input 
                                            className="w-48 p-2.5 rounded-xl border border-neutral-200 bg-white font-bold text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
                                            placeholder="Valor Unit." 
                                            value={newItem.valor_venda} 
                                            onChange={e => setNewItem({...newItem, valor_venda: e.target.value})} 
                                        />
                                        <div className="flex-1 flex items-center justify-end px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                            Total: R$ {(Number(newItem.quantidade) * Number(newItem.valor_venda || 0)).toFixed(2)}
                                        </div>
                                        <button type="submit" className="bg-neutral-900 text-white px-6 py-2 rounded-xl hover:bg-black hover:scale-105 transition-all shadow-lg shadow-neutral-900/20 font-bold uppercase text-xs flex items-center gap-2"><Plus size={16} /> Adicionar</button>
                                    </form>
                            </div>
                        )}
                        {/* List Items */}
                        <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-left">
                                <thead className="bg-neutral-50 border-b border-neutral-100">
                                    <tr>
                                        <th className="p-3 pl-4 text-[10px] uppercase font-black text-neutral-400 tracking-wider">Item</th>
                                        <th className="p-3 text-[10px] uppercase font-black text-neutral-400 tracking-wider">Ref/Código</th>
                                        <th className="p-3 text-[10px] uppercase font-black text-neutral-400 tracking-wider text-center">Qtd</th>
                                        <th className="p-3 text-[10px] uppercase font-black text-neutral-400 tracking-wider text-right">Unit.</th>
                                        <th className="p-3 text-[10px] uppercase font-black text-neutral-400 tracking-wider text-right">Total</th>
                                        <th className="p-3 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50">
                                    {osItems.map(item => (
                                        <tr key={item.id_iten} className="hover:bg-neutral-50/50 transition-colors group">
                                            <td className="p-3 pl-4">
                                                <div className="font-bold text-sm text-neutral-700">{item.descricao}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="text-[10px] text-neutral-400 font-medium font-mono bg-neutral-100 px-2 py-0.5 rounded-md w-fit">{item.codigo_referencia || '-'}</div>
                                            </td>
                                            <td className="p-3 text-center font-bold text-neutral-600 text-xs">{item.quantidade}</td>
                                            <td className="p-3 text-right text-neutral-500 text-xs">R$ {Number(item.valor_venda).toFixed(2)}</td>
                                            <td className="p-3 text-right font-black text-neutral-800 text-xs">R$ {Number(item.valor_total).toFixed(2)}</td>
                                            <td className="p-3 text-right pr-4">
                                                    {selectedOsForItems.status !== 'FINALIZADA' && selectedOsForItems.status !== 'PAGA_CLIENTE' && (
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditItem(item)} className="p-1.5 hover:bg-blue-50 text-neutral-400 hover:text-blue-600 rounded-md transition-colors"><PenTool size={14} /></button>
                                                        <button onClick={() => handleDeleteItem(item.id_iten)} className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-md transition-colors"><X size={14} /></button>
                                                    </div>
                                                    )}
                                            </td>
                                        </tr>
                                    ))}
                                    {osItems.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-neutral-300 text-xs italic">Nenhum item adicionado à lista.</td>
                                        </tr>
                                    )}
                                </tbody>
                                </table>
                        </div>
                        </div>

                         {/* Totals & Actions - Keep as is (below everything) */}
                         <div className="relative overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
                             {/* Background Glow Effect */}
                             <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-900/20 rounded-full blur-3xl pointer-events-none"></div>

                             <div className="relative p-8 text-white space-y-8">
                                 {/* Totals Row */}
                                 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-neutral-800">
                                     <div className="flex gap-12">
                                         <div>
                                             <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Peças</p>
                                             <p className="font-medium text-lg text-neutral-300">R$ {osItems.reduce((acc, i) => acc + Number(i.valor_total), 0).toFixed(2)}</p>
                                         </div>
                                         <div>
                                             <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Mão de Obra</p>
                                             <p className="font-medium text-lg text-neutral-300">
                                                R$ {Number(laborServices.length > 0 
                                                    ? laborServices.reduce((acc, l) => acc + Number(l.valor), 0) 
                                                    : (selectedOsForItems.valor_mao_de_obra || 0)
                                                ).toFixed(2)}
                                             </p>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-xs font-black text-success-500 uppercase tracking-widest mb-1">VALOR TOTAL</p>
                                         <p className="font-black text-5xl tracking-tighter text-white drop-shadow-lg">
                                             R$ {(
                                             osItems.reduce((acc, i) => acc + Number(i.valor_total), 0) + 
                                             (laborServices.length > 0 ? laborServices.reduce((acc, l) => acc + Number(l.valor), 0) : Number(selectedOsForItems.valor_mao_de_obra || 0))
                                         ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                         </p>
                                     </div>
                                 </div>

                                 {/* Footer Actions Row */}
                                 <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                                     
                                     {/* Payment Card - HIGH VISIBILITY REDESIGN */}
                                     <div className="w-full lg:w-auto flex-1 max-w-2xl bg-neutral-800/50 rounded-2xl p-2 pr-4 flex items-center justify-between border border-neutral-700/50 hover:bg-neutral-800 transition-colors group">
                                          <div className="flex items-center gap-4">
                                              <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg">
                                                  <DollarSign className="text-success-500" size={24} strokeWidth={2.5} />
                                              </div>
                                              <div>
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Pagamentos Recebidos</p>
                                                      {(() => {
                                                          const totalItemsVal = osItems.reduce((acc, i) => acc + Number(i.valor_total || 0), 0);
                                                          const totalLaborVal = laborServices.length > 0 
                                                              ? laborServices.reduce((acc, l) => acc + Number(l.valor || 0), 0) 
                                                              : Number(selectedOsForItems.valor_mao_de_obra || 0);
                                                          const totalOS = totalItemsVal + totalLaborVal;
                                                          
                                                          const payments = selectedOsForItems.pagamentos_cliente || [];
                                                          const totalPago = payments.filter(p => !p.deleted_at).reduce((acc, p) => acc + Number(p.valor), 0);
                                                          
                                                          const isOk = (totalOS - totalPago) <= 0.05; // Margem de 5 centavos
                                                          
                                                          return (
                                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${isOk ? 'bg-success-500/20 text-success-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                  {isOk ? 'QUITADO' : 'PENDENTE'}
                                                              </span>
                                                          );
                                                      })()}
                                                  </div>
                                                  <p className="font-bold text-2xl text-white tracking-tight">
                                                      R$ {(selectedOsForItems.pagamentos_cliente || []).filter(p => !p.deleted_at).reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2)}
                                                  </p>
                                              </div>
                                          </div>
                                          <Button variant="secondary" onClick={() => setShowPaymentModal(true)} size="sm" className="bg-neutral-700 text-neutral-200 border-none hover:bg-neutral-600 font-bold uppercase text-xs h-9 px-4 ml-4">
                                              Gerenciar
                                          </Button>
                                     </div>
                                     
                                     <div className="flex gap-4 w-full lg:w-auto justify-end">
                                         {['ABERTA', 'EM_ANDAMENTO'].includes(selectedOsForItems.status) ? (
                                             <Button 
                                                onClick={handleFinishService} 
                                                variant="success" 
                                                className="w-full lg:w-auto px-8 py-5 h-auto text-lg font-black uppercase tracking-widest shadow-xl shadow-success-500/20 hover:scale-105 transition-all flex-1 lg:flex-none justify-center"
                                            >
                                                 <CheckCircle className="mr-3" size={24} strokeWidth={3} /> FINALIZAR OS
                                            </Button>
                                         ) : (
                                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                                {(selectedOsForItems.status === 'PRONTO PARA FINANCEIRO' || selectedOsForItems.status === 'FINALIZADA') && (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={async () => {
                                                            try {
                                                                if (selectedOsForItems.fechamento_financeiro) {
                                                                    await api.delete(`/fechamento-financeiro/${selectedOsForItems.fechamento_financeiro.id_fechamento_financeiro}`);
                                                                }
                                                                await api.put(`/ordem-de-servico/${selectedOsForItems.id_os}`, { status: 'ABERTA' });
                                                                loadOss(); 
                                                                setStatusMsg({ type: 'success', text: 'OS Reaberta com sucesso!' });
                                                                setManageModalOpen(false);
                                                            } catch(e) {
                                                                setStatusMsg({ type: 'error', text: 'Erro ao reabrir OS.' });
                                                            }
                                                        }}
                                                        className="bg-transparent border-2 border-dashed border-neutral-600 text-neutral-500 hover:text-white hover:bg-neutral-800 hover:border-neutral-500 px-6 py-4 h-auto w-full sm:w-auto font-bold uppercase transition-all"
                                                    >
                                                        REABRIR OS
                                                    </Button>
                                                )}
                                                <div className="flex items-center justify-center gap-3 text-success-400 font-black bg-success-500/10 px-8 py-4 rounded-xl border border-success-500/20 w-full sm:w-auto">
                                                    <BadgeCheck size={28} /> 
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-[10px] text-success-600/70 uppercase leading-none">Status Atual</span>
                                                        <span className="text-lg leading-none mt-1">{selectedOsForItems.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>
                </Modal>
            )}

            {/* SHARED MODALS */}
            {confirmModal.isOpen && (
                <Modal title={confirmModal.title} onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}>
                    <p className="mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))}>Cancelar</Button>
                        <Button variant="danger" onClick={confirmModal.onConfirm}>Confirmar</Button>
                    </div>
                </Modal>
            )}

            {editItemModalOpen && editingItemData && (
                 <Modal title="Editar Item" onClose={() => setEditItemModalOpen(false)}>
                     <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Descrição do Item</label>
                            <input 
                                className="w-full border p-2 rounded text-sm font-medium" 
                                value={editingItemData.descricao} 
                                onChange={e => setEditingItemData({...editingItemData, descricao: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Mais Informações (Código/Nota/Referência)</label>
                            <input 
                                className="w-full border p-2 rounded text-sm font-medium" 
                                placeholder="Ex: Número da peça, código de referência..."
                                value={editingItemData.codigo_referencia || ''} 
                                onChange={e => setEditingItemData({...editingItemData, codigo_referencia: e.target.value})} 
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Quantidade</label>
                                <input 
                                    type="number" 
                                    className="w-full border p-2 rounded text-sm font-bold text-center" 
                                    value={editingItemData.quantidade} 
                                    onChange={e => setEditingItemData({...editingItemData, quantidade: e.target.value})} 
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Valor Unit. (R$)</label>
                                <input 
                                    type="number" 
                                    className="w-full border p-2 rounded text-sm font-bold text-right" 
                                    value={editingItemData.valor_venda} 
                                    onChange={e => setEditingItemData({...editingItemData, valor_venda: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Valor Total</p>
                            <p className="text-xl font-black text-primary-600">R$ {(Number(editingItemData.quantidade || 0) * Number(editingItemData.valor_venda || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <Button onClick={handleSaveItemEdit} className="w-full mt-2">Salvar Alterações</Button>
                     </div>
                 </Modal>
            )}
            {showPaymentModal && selectedOsForItems && (
                <Modal title="Pagamentos" onClose={() => setShowPaymentModal(false)}>
                     {/* Lista de pagamentos existentes */}
                     {selectedOsForItems.pagamentos_cliente && selectedOsForItems.pagamentos_cliente.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Pagamentos Registrados</h4>
                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-neutral-50">
                                        <tr>
                                            <th className="p-2 text-left">Data</th>
                                            <th className="p-2 text-left">Método</th>
                                            <th className="p-2 text-left">Bandeira</th>
                                            <th className="p-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {selectedOsForItems.pagamentos_cliente.sort((a,b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()).map(pag => {
                                            const isDeleted = !!pag.deleted_at;
                                            return (
                                                <tr key={pag.id_pagamento_cliente} className={isDeleted ? 'bg-red-50 opacity-60' : ''}>
                                                    <td className={`p-2 ${isDeleted ? 'line-through' : ''}`}>{new Date(pag.data_pagamento).toLocaleDateString()}</td>
                                                    <td className={`p-2 font-bold ${isDeleted ? 'line-through' : ''}`}>{pag.metodo_pagamento}</td>
                                                    <td className={`p-2 ${isDeleted ? 'line-through' : ''}`}>{pag.bandeira_cartao || '-'}</td>
                                                    <td className={`p-2 text-right font-bold ${isDeleted ? 'line-through text-red-800' : 'text-green-600'}`}>R$ {Number(pag.valor).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-green-50">
                                        <tr>
                                            <td colSpan={3} className="p-2 font-bold text-green-700">TOTAL PAGO</td>
                                            <td className="p-2 text-right font-black text-green-700">
                                                R$ {selectedOsForItems.pagamentos_cliente.filter(p => !p.deleted_at).reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                     )}
                     
                     <PagamentoClienteForm 
                        osId={selectedOsForItems.id_os}
                        valorTotal={
                            (osItems.reduce((acc, i) => acc + Number(i.valor_total), 0) + laborServices.reduce((acc, l) => acc + Number(l.valor), 0)) -
                            ((selectedOsForItems.pagamentos_cliente || []).filter(p => !p.deleted_at).reduce((acc, p) => acc + Number(p.valor), 0))
                        }
                        onSuccess={() => { setShowPaymentModal(false); handleOpenFromId(selectedOsForItems.id_os); }}
                        onCancel={() => setShowPaymentModal(false)}
                     />
                </Modal>
            )}
            {/* WIZARD MODALS */}
            {newOsWizardStep === 'CLIENT' && (
                <Modal title="Passo 1: Identificação do Cliente" onClose={() => setNewOsWizardStep('NONE')} className="max-w-2xl">
                     <p className="mb-4 text-neutral-500">Busque um cliente existente ou cadastre um novo para iniciar.</p>
                     
                     {/* Reuse ClienteForm but maybe we need a 'search' wrapper first if ClienteForm only creates/edits.
                        The Requirement says: "Abre o componente ClienteForm." 
                        However, usually we want to SEARCH first. 
                        Let's use VeiculoForm's approach or assume `ClienteForm` handles creation.
                        But the user said "Abre o componente ClienteForm. Após salvar abre VeiculoForm" (implying Creation).
                        Wait, step 1 says "Interface de Busca ... Se não retornar resultados, exiba 'Criar OS' ... abre ClienteForm".
                        So this flow is primarily for NEW clients?
                        "Se a busca não retornar resultados, exiba o botão 'Criar OS' ... Este botão deve iniciar um fluxo ... 1. Abre ClienteForm".
                        So yes, this is for CREATION.
                     */}
                     <ClienteForm 
                        onSuccess={handleClientWizardSuccess}
                        onCancel={() => setNewOsWizardStep('NONE')}
                     />
                </Modal>
            )}

            {newOsWizardStep === 'VEHICLE' && (
                <Modal title="Passo 2: Veículo do Cliente" onClose={() => setNewOsWizardStep('NONE')} className="max-w-2xl">
                     <div className="mb-4">
                         <h3 className="font-bold text-neutral-800 uppercase">Cliente: {wizardClient?.pessoa_fisica?.pessoa?.nome || wizardClient?.pessoa_juridica?.razao_social}</h3>
                         <p className="text-neutral-500 text-sm">
                            {showVehicleForm ? 'Preencha os dados do novo veículo.' : 'Selecione um veículo para abrir a OS.'}
                         </p>
                     </div>

                     {!showVehicleForm && wizardVehicleList.length > 0 ? (
                        <div className="space-y-3">
                            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                                {wizardVehicleList.map(v => (
                                    <button 
                                        key={v.id_veiculo}
                                        onClick={() => handleVehicleWizardSuccess(v)}
                                        className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:border-primary-500 hover:ring-1 hover:ring-primary-500 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg text-neutral-400 group-hover:text-primary-600">
                                                <Car size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-neutral-900 uppercase">{v.placa}</p>
                                                <p className="text-xs font-bold text-neutral-500">{v.modelo} • {v.cor}</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-white border rounded text-xs font-bold text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                            SELECIONAR
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <button 
                                onClick={() => setShowVehicleForm(true)}
                                className="w-full py-3 mt-4 border border-dashed border-primary-300 text-primary-600 font-bold rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> CADASTRAR NOVO VEÍCULO
                            </button>
                        </div>
                     ) : (
                         <div>
                             {wizardVehicleList.length > 0 && (
                                 <button 
                                    onClick={() => setShowVehicleForm(false)}
                                    className="mb-4 text-sm text-neutral-500 hover:text-neutral-800 font-bold flex items-center gap-1"
                                 >
                                     ScanLine Voltar para lista
                                 </button>
                             )}
                             <VeiculoForm 
                                clientId={wizardClient?.id_cliente}
                                onSuccess={handleVehicleWizardSuccess}
                                onCancel={() => wizardVehicleList.length > 0 ? setShowVehicleForm(false) : setNewOsWizardStep('NONE')}
                             />
                         </div>
                     )}
                </Modal>
            )}


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
