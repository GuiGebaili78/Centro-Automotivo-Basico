import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { FormEvent } from 'react';
import { api } from '../services/api';
import type { IOrdemDeServico } from '../types/backend';
import { 
    Search, Plus, PenTool, Car, X,
    Package, Wrench, CheckCircle, BadgeCheck, DollarSign
} from 'lucide-react';

import { StatusBanner } from '../components/ui/StatusBanner';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { PagamentoClienteForm } from '../components/forms/PagamentoClienteForm';
import { ClienteForm } from '../components/forms/ClienteForm';
import { VeiculoForm } from '../components/forms/VeiculoForm';
import { LaborManager } from '../components/os/LaborManager';

export const OrdemDeServicoPage = () => {
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState(''); // NEW: Localizar Search

    const [oss, setOss] = useState<IOrdemDeServico[]>([]);
    
    // Management Modal State
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [selectedOsForItems, setSelectedOsForItems] = useState<IOrdemDeServico | null>(null);
    const [osItems, setOsItems] = useState<any[]>([]);
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
                // Requirement: If only 1 vehicle, skip selection and go directly to OS creation
                setWizardVehicle(myVehicles[0]);
                setNewOsWizardStep('OS');
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
             // Fallback
             setWizardVehicleList([]);
             setShowVehicleForm(true);
             setNewOsWizardStep('VEHICLE');
        }
    };

    const handleVehicleWizardSuccess = (vehicle: any) => {
        setWizardVehicle(vehicle);
        setNewOsWizardStep('OS');
    };

    const handleCreateOsFinal = async (mechanicId: number, km: number, defect: string) => {
        if (!wizardClient || !wizardVehicle) return;
        try {
             const payload = {
                id_cliente: wizardClient.id_cliente,
                id_veiculo: wizardVehicle.id_veiculo,
                id_funcionario: mechanicId,
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
            loadOsItems(id);
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
        if (!searchTerm) {
            // Se não houver busca, mostrar apenas ABERTA (Gestão Ativa)
            return os.status === 'ABERTA';
        }

        const q = searchTerm.toLowerCase();
        const plate = os.veiculo?.placa?.toLowerCase() || '';
        const model = os.veiculo?.modelo?.toLowerCase() || '';
        const owner = (os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social || '').toLowerCase();
        const id = String(os.id_os);
        
        return plate.includes(q) || model.includes(q) || owner.includes(q) || id.includes(q);
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
    };

    const handleAddItem = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedOsForItems) return;
        try {
            const part = availableParts.find(p => p.id_pecas_estoque === Number(newItem.id_pecas_estoque));
            const description = part ? part.nome : (partSearch || 'Item Diverso');
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
                descricao: editingItemData.descricao, quantidade: qtd, valor_venda: val, valor_total: qtd * val,
                codigo_referencia: editingItemData.codigo_referencia, id_fornecedor: editingItemData.id_fornecedor || null
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
        const totalLabor = laborServices.reduce((acc, l) => acc + Number(l.valor), 0);
        
        try {
             await api.put(`/ordem-de-servico/${selectedOsForItems.id_os}`, {
                valor_pecas: totalItems,
                valor_mao_de_obra: totalLabor,
                valor_total_cliente: totalItems + totalLabor,
                status: 'PRONTO PARA FINANCEIRO',
                dt_entrega: selectedOsForItems.dt_entrega ? new Date(selectedOsForItems.dt_entrega).toISOString() : new Date().toISOString()
            });
            setStatusMsg({ type: 'success', text: 'OS Finalizada! Enviada para Financeiro.' });
            setTimeout(() => {
                setManageModalOpen(false);
                setStatusMsg({ type: null, text: '' });
                loadOss();
            }, 2000);
        } catch (e) { setStatusMsg({ type: 'error', text: 'Erro ao finalizar OS.' }); }
    };
    

    // --- RENDER ---
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'FINALIZADA': return 'bg-success-50 text-success-600 border-success-200';
            case 'PAGA_CLIENTE': return 'bg-neutral-100 text-neutral-600 border-neutral-200';
            case 'PRONTO PARA FINANCEIRO': return 'bg-warning-50 text-warning-600 border-warning-200';
            default: return 'bg-primary-50 text-primary-600 border-primary-200';
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
                    {/* FIXED 'CRIAR OS' BUTTON REMOVED as per requirement. Only search. 
                        Button appears if NO results. */}
                </div>

                {/* SEARCH RESULTS */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">OS / Veículo</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest">Cliente</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest text-center">Status</th>
                                <th className="p-4 font-black text-neutral-400 uppercase text-[10px] tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredOss.sort((a,b) => b.id_os - a.id_os).map((os) => (
                                <tr key={os.id_os} className="hover:bg-neutral-25 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="font-black text-neutral-900">#{String(os.id_os).padStart(4, '0')}</div>
                                            <div className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-bold text-neutral-600 uppercase">
                                                {os.veiculo?.placa}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-neutral-400 font-bold uppercase mt-1">
                                            {os.veiculo?.modelo} • {os.veiculo?.cor}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-neutral-700">
                                            {os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social || 'Desconhecido'}
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
                                                className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-lg font-bold text-xs uppercase hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors"
                                            >
                                                Gerenciar
                                            </button>
                                            
                                            {/* Button '+ nova os' logic:
                                                - OS 'Aberta': Only 'Gerenciar' (Already handled by strict logic? No, need to conditionalize)
                                                - OS 'Finalizada'/'Pronto': Show '+ nova os'
                                            */}
                                            {(os.status === 'FINALIZADA' || os.status === 'PRONTO PARA FINANCEIRO' || os.status === 'PAGA_CLIENTE') && (
                                                <button 
                                                    onClick={() => handleOpenNewOsForExisting(os.veiculo, os.cliente)}
                                                    className="px-3 py-1.5 bg-primary-50 border border-primary-100 text-primary-600 rounded-lg font-bold text-xs uppercase hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors flex items-center gap-1"
                                                    title="Nova OS para este veículo"
                                                    >
                                                    <Plus size={14} /> Nova OS
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
                            <span>OS #{String(selectedOsForItems.id_os).padStart(4, '0')}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusStyle(selectedOsForItems.status)}`}>
                                {selectedOsForItems.status}
                            </span>
                        </div>
                    } 
                    onClose={() => setManageModalOpen(false)}
                >
                    <div className="space-y-8">
                        {/* Header Info */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-4 bg-primary-50 rounded-2xl border border-primary-100">
                             <div>
                                 <p className="text-[10px] font-black text-primary-400 uppercase">Veículo</p>
                                 <p className="font-black text-lg text-primary-900 uppercase">{selectedOsForItems.veiculo?.placa}</p>
                                 <p className="text-xs font-bold text-primary-700">{selectedOsForItems.veiculo?.modelo}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black text-primary-400 uppercase">Cor do Veículo</p>
                                 <p className="font-bold text-primary-900">{selectedOsForItems.veiculo?.cor || 'Não informada'}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black text-primary-400 uppercase">Cliente</p>
                                 <p className="font-black text-primary-900 truncate">{selectedOsForItems.cliente?.pessoa_fisica?.pessoa.nome || selectedOsForItems.cliente?.pessoa_juridica?.razao_social}</p>
                             </div>
                             <div>
                                 <p className="text-[10px] font-black text-primary-400 uppercase">Telefone</p>
                                 <p className="font-bold text-primary-900">{selectedOsForItems.cliente?.telefone_1 || 'Não informado'}</p>
                             </div>
                             <div>
                                  <p className="text-[10px] font-black text-primary-400 uppercase">Entrada</p>
                                  <p className="font-bold text-primary-900">{new Date(selectedOsForItems.dt_abertura).toLocaleDateString()}</p>
                             </div>
                             <div>
                                  <label className="text-[10px] font-black text-primary-400 uppercase block">KM Atual</label>
                                  <input 
                                    className="bg-white border text-center font-black w-24 rounded p-1"
                                    type="number"
                                    value={selectedOsForItems.km_entrada}
                                    onChange={e => setSelectedOsForItems({...selectedOsForItems, km_entrada: Number(e.target.value)})}
                                    onBlur={e => updateOSField('km_entrada', Number(e.target.value))}
                                  />
                             </div>
                         </div>

                         {/* Diagnóstico / Defeito */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase">Defeito</label>
                                <textarea 
                                    className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs font-medium h-20 outline-none focus:border-primary-300 resize-none"
                                    value={selectedOsForItems.defeito_relatado || ''}
                                    onChange={e => setSelectedOsForItems({...selectedOsForItems, defeito_relatado: e.target.value})}
                                    onBlur={e => updateOSField('defeito_relatado', e.target.value)}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase">Diagnóstico</label>
                                <textarea 
                                    className="w-full bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs font-medium h-20 outline-none focus:border-primary-300 resize-none"
                                    value={selectedOsForItems.diagnostico || ''}
                                    onChange={e => setSelectedOsForItems({...selectedOsForItems, diagnostico: e.target.value})}
                                    onBlur={e => updateOSField('diagnostico', e.target.value)}
                                />
                             </div>
                         </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             {/* ITENS (PEÇAS) */}
                             <div className="space-y-4">
                                <h3 className="text-sm font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                                    <Package size={18} className="text-primary-600" /> Peças e Produtos
                                </h3>
                                {/* Form Add Item */}
                                {selectedOsForItems.status !== 'FINALIZADA' && selectedOsForItems.status !== 'PAGA_CLIENTE' && (
                                    <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50">
                                         <div className="relative group mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                            <input 
                                                ref={partInputRef}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 outline-none focus:border-primary-500 font-bold text-sm"
                                                placeholder="Buscar peça..."
                                                value={partSearch}
                                                onChange={e => handlePartSearch(e.target.value)}
                                            />
                                            {partResults.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                    {partResults.map(p => (
                                                        <button key={p.id_pecas_estoque || p.nome} onClick={() => selectPart(p)} className="w-full text-left p-3 hover:bg-neutral-50 text-xs font-bold border-b border-neutral-50 flex justify-between">
                                                            <span>{p.nome}</span>
                                                            <span className="text-primary-600">R$ {Number(p.valor_venda).toFixed(2)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                         </div>
                                         <form onSubmit={handleAddItem} className="flex gap-2">
                                              <input 
                                                  className="w-24 p-2 rounded-lg border font-bold text-sm" 
                                                  placeholder="Ref" 
                                                  value={newItem.codigo_referencia} 
                                                  onChange={e => setNewItem({...newItem, codigo_referencia: e.target.value})} 
                                              />
                                              <input className="w-16 p-2 rounded-lg border font-bold text-center" placeholder="Qtd" value={newItem.quantidade} onChange={e => setNewItem({...newItem, quantidade: e.target.value})} />
                                              <input className="flex-1 p-2 rounded-lg border font-bold" placeholder="Valor Unit." value={newItem.valor_venda} onChange={e => setNewItem({...newItem, valor_venda: e.target.value})} />
                                              <button className="bg-neutral-800 text-white p-2 rounded-lg hover:bg-black"><Plus size={20} /></button>
                                         </form>
                                    </div>
                                )}
                                {/* List Items */}
                                <div className="border rounded-xl overflow-hidden text-xs">
                                     <table className="w-full text-left">
                                        <thead className="bg-neutral-50">
                                            <tr>
                                                <th className="p-3">Item</th>
                                                <th className="p-3">Ref/Código</th>
                                                <th className="p-3 text-center">Qtd</th>
                                                <th className="p-3 text-right">Unit.</th>
                                                <th className="p-3 text-right">Total</th>
                                                <th className="p-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50">
                                            {osItems.map(item => (
                                                <tr key={item.id_iten}>
                                                    <td className="p-3 font-medium">{item.descricao}</td>
                                                    <td className="p-3 text-neutral-500">{item.codigo_referencia || '-'}</td>
                                                    <td className="p-3 text-center">{item.quantidade}</td>
                                                    <td className="p-3 text-right">R$ {Number(item.valor_venda).toFixed(2)}</td>
                                                    <td className="p-3 text-right font-bold">R$ {Number(item.valor_total).toFixed(2)}</td>
                                                    <td className="p-3 text-right">
                                                         {selectedOsForItems.status !== 'FINALIZADA' && selectedOsForItems.status !== 'PAGA_CLIENTE' && (
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => handleEditItem(item)} className="text-neutral-400 hover:text-blue-500"><PenTool size={12} /></button>
                                                                <button onClick={() => handleDeleteItem(item.id_iten)} className="text-neutral-400 hover:text-red-500"><X size={12} /></button>
                                                            </div>
                                                         )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                     </table>
                                </div>
                             </div>

                             {/* MÃO DE OBRA (REUSABLE COMPONENT) */}
                             <div className="space-y-4">
                                <h3 className="text-sm font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                                    <Wrench size={18} className="text-primary-600" /> Mão de Obra
                                </h3>
                                <LaborManager 
                                    mode="api"
                                    osId={selectedOsForItems.id_os}
                                    initialData={laborServices}
                                    employees={employees}
                                    onChange={() => handleOpenFromId(selectedOsForItems.id_os)} // Reload
                                    readOnly={selectedOsForItems.status === 'FINALIZADA' || selectedOsForItems.status === 'PAGA_CLIENTE'}
                                />
                             </div>
                        </div>

                         {/* Totals & Actions */}
                         <div className="p-6 bg-neutral-900 rounded-2xl text-white">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-neutral-700 pb-6 mb-6">
                                 <div className="flex gap-8">
                                     <div>
                                         <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Peças</p>
                                         <p className="font-bold text-xl text-neutral-300">R$ {osItems.reduce((acc, i) => acc + Number(i.valor_total), 0).toFixed(2)}</p>
                                     </div>
                                     <div>
                                         <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Mão de Obra</p>
                                         <p className="font-bold text-xl text-neutral-300">R$ {laborServices.reduce((acc, l) => acc + Number(l.valor), 0).toFixed(2)}</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-[10px] font-black text-success-500 uppercase">VALOR TOTAL DA OS</p>
                                     <p className="font-black text-4xl">R$ {(
                                         osItems.reduce((acc, i) => acc + Number(i.valor_total), 0) + 
                                         laborServices.reduce((acc, l) => acc + Number(l.valor), 0)
                                     ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                 </div>
                             </div>

                             {/* Payment & Finalization Row */}
                             <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                 <div className="flex items-center gap-4 bg-neutral-800 p-3 rounded-xl w-full md:w-auto">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase">Pagamentos Recebidos</p>
                                        <p className="font-bold text-xl text-white">R$ {selectedOsForItems.pagamentos_cliente?.reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2) || '0.00'}</p>
                                    </div>
                                    <Button variant="secondary" onClick={() => setShowPaymentModal(true)} size="sm" className="h-10 px-4 bg-neutral-700 text-white border-none hover:bg-neutral-600">
                                        <DollarSign size={16} className="mr-2" /> Gerenciar
                                    </Button>
                                 </div>
                                 
                                 {selectedOsForItems.status === 'ABERTA' ? (
                                     <Button 
                                        onClick={handleFinishService} 
                                        variant="success" 
                                        className="w-full md:w-auto px-8 py-4 h-auto text-lg font-black uppercase tracking-widest shadow-xl shadow-success-500/20 hover:scale-105 transition-all"
                                    >
                                         <CheckCircle className="mr-2" size={24} strokeWidth={2.5} /> FINALIZAR OS
                                     </Button>
                                 ) : (
                                    <div className="flex items-center gap-3 text-success-400 font-bold bg-white/10 px-6 py-3 rounded-xl border border-white/10">
                                        <BadgeCheck size={24} /> STATUS: {selectedOsForItems.status}
                                    </div>
                                 )}
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
                                        {selectedOsForItems.pagamentos_cliente.map(pag => (
                                            <tr key={pag.id_pagamento_cliente}>
                                                <td className="p-2">{new Date(pag.data_pagamento).toLocaleDateString()}</td>
                                                <td className="p-2 font-bold">{pag.metodo_pagamento}</td>
                                                <td className="p-2">{pag.bandeira_cartao || '-'}</td>
                                                <td className="p-2 text-right font-bold text-green-600">R$ {Number(pag.valor).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-green-50">
                                        <tr>
                                            <td colSpan={3} className="p-2 font-bold text-green-700">TOTAL PAGO</td>
                                            <td className="p-2 text-right font-black text-green-700">
                                                R$ {selectedOsForItems.pagamentos_cliente.reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2)}
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
                            (selectedOsForItems.pagamentos_cliente?.reduce((acc, p) => acc + Number(p.valor), 0) || 0)
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
                 <Modal title="Passo 3: Confirmar Abertura de OS" onClose={() => setNewOsWizardStep('NONE')} className="max-w-lg">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                <p className="text-[10px] font-black text-neutral-400 uppercase">Veículo</p>
                                <p className="font-bold text-neutral-900 uppercase">{wizardVehicle.placa}</p>
                                <p className="text-xs text-neutral-500">{wizardVehicle.modelo}</p>
                            </div>
                            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                <p className="text-[10px] font-black text-neutral-400 uppercase">Cliente</p>
                                <p className="font-bold text-neutral-900 truncate">{wizardClient.pessoa_fisica?.pessoa?.nome || wizardClient.pessoa_juridica?.razao_social}</p>
                                <p className="text-xs text-neutral-500">{wizardClient.telefone_1}</p>
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                             e.preventDefault();
                             const data = new FormData(e.currentTarget);
                             handleCreateOsFinal(
                                 Number(data.get('mechanicId')), 
                                 Number(data.get('km')), 
                                 String(data.get('defects'))
                             );
                        }} className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Mecânico Responsável</label>
                                <select name="mechanicId" className="w-full border p-3 rounded-xl font-bold text-neutral-700 bg-white" required>
                                    <option value="">Selecione...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id_funcionario} value={emp.id_funcionario}>
                                            {emp.pessoa_fisica?.pessoa?.nome}
                                        </option>
                                    ))}
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">KM Atual</label>
                                <input name="km" type="number" className="w-full border p-3 rounded-xl font-bold" placeholder="0" />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Relato de Defeito / Solicitação</label>
                                <textarea name="defects" className="w-full border p-3 rounded-xl resize-none h-24" placeholder="Descreva o problema relatado..." />
                             </div>

                             <Button variant="success" className="w-full py-4 text-lg font-black uppercase tracking-widest">
                                 <CheckCircle className="mr-2" /> GERAR ORDEM DE SERVIÇO
                             </Button>
                        </form>
                    </div>
                 </Modal>
            )}
        </div>
    );
};
