import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { FormEvent } from 'react';
import { api } from '../services/api';
import type { IOrdemDeServico } from '../types/backend';
import { 
    Search, Plus, PenTool, Car, User, Check, 
    FileText, TrendingUp, AlertCircle, Package, ArrowRight, Wrench, CheckCircle, BadgeCheck, Trash2, DollarSign
} from 'lucide-react';

import { StatusBanner } from '../components/ui/StatusBanner';
import { ClienteForm } from '../components/forms/ClienteForm';
import { VeiculoForm } from '../components/forms/VeiculoForm';
import { PagamentoClienteForm } from '../components/forms/PagamentoClienteForm';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export const OrdemDeServicoPage = () => {
    const [oss, setOss] = useState<IOrdemDeServico[]>([]);
    const [formData, setFormData] = useState({
        id_cliente: '',
        id_veiculo: '',
        id_funcionario: '1',
        km_entrada: '',
        status: 'ABERTA',
        parcelas: '1',
        defeito_relatado: '',
        diagnostico: '',
        valor_total_cliente: '',
        valor_mao_de_obra: '',
        dt_abertura: new Date().toISOString().slice(0, 16),
        dt_entrega: '',
    });

    const [creationStep, setCreationStep] = useState(1); // 1: Seleção, 2: Dados OS, 3: Itens
    const [currentCreatedOsId, setCurrentCreatedOsId] = useState<number | null>(null);

    const [placaSearch, setPlacaSearch] = useState('');
    const [clienteSearch, setClienteSearch] = useState('');
    const [foundVeiculo, setFoundVeiculo] = useState<any | null>(null);
    const [foundCliente, setFoundCliente] = useState<any | null>(null);
    
    // Dynamic Search Lists
    const [vehicleResults, setVehicleResults] = useState<any[]>([]);
    const [clienteResults, setClienteResults] = useState<any[]>([]);

    const [showRegisterModal, setShowRegisterModal] = useState<'NONE' | 'PESSOA' | 'VEICULO'>('NONE');
    const [createdClientId, setCreatedClientId] = useState<number | null>(null);

    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOsForItems, setSelectedOsForItems] = useState<IOrdemDeServico | null>(null);
    const [osItems, setOsItems] = useState<any[]>([]);
    const [availableParts, setAvailableParts] = useState<any[]>([]);
    
    // Pieces Search State
    const [partSearch, setPartSearch] = useState('');
    const [partResults, setPartResults] = useState<any[]>([]);
    

    const [newItem, setNewItem] = useState({ id_pecas_estoque: '', quantidade: '1', valor_venda: '', descricao: '', codigo_referencia: '', id_fornecedor: '' });
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const placaInputRef = useRef<HTMLInputElement>(null);
    const clienteInputRef = useRef<HTMLInputElement>(null);
    const partInputRef = useRef<HTMLInputElement>(null);

    const [vehicleActiveIndex, setVehicleActiveIndex] = useState(-1);
    const [clienteActiveIndex, setClienteActiveIndex] = useState(-1);
    const [partActiveIndex, setPartActiveIndex] = useState(-1);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);

    // Payment CRUD State
    const [editingPayment, setEditingPayment] = useState<any | null>(null);

    // Dirty Check
    const [isDirty, setIsDirty] = useState(false);
    
    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Edit Item Modal State
    const [editItemModalOpen, setEditItemModalOpen] = useState(false);
    const [editingItemData, setEditingItemData] = useState<any>(null);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleKeyDown = (e: React.KeyboardEvent, type: 'vehicle' | 'cliente' | 'part') => {
        if (e.key === 'Escape') {
            setVehicleResults([]);
            setClienteResults([]);
            setPartResults([]);
            setVehicleActiveIndex(-1);
            setClienteActiveIndex(-1);
            setPartActiveIndex(-1);
            return;
        }

        let currentResults: any[] = [];
        let currentActive = -1;
        let currentSetter: (i: number) => void = () => {};
        let currentSelect: (item: any) => void = () => {};

        if (type === 'vehicle') {
            currentResults = vehicleResults;
            currentActive = vehicleActiveIndex;
            currentSetter = setVehicleActiveIndex;
            currentSelect = selectVehicle;
        } else if (type === 'cliente') {
            currentResults = clienteResults;
            currentActive = clienteActiveIndex;
            currentSetter = setClienteActiveIndex;
            currentSelect = selectCliente;
        } else if (type === 'part') {
            currentResults = partResults;
            currentActive = partActiveIndex;
            currentSetter = setPartActiveIndex;
            currentSelect = selectPart;
        }

        if (currentResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = currentActive + 1 >= currentResults.length ? 0 : currentActive + 1;
            currentSetter(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = currentActive - 1 < 0 ? currentResults.length - 1 : currentActive - 1;
            currentSetter(prev);
        } else if (e.key === 'Enter' && currentActive !== -1) {
            e.preventDefault();
            currentSelect(currentResults[currentActive]);
            currentSetter(-1);
        }
    };

    // Global keyboard listener for Page navigation
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Removed redundant Escape check for manageModalOpen as the Modal component handles it.


            if (creationStep === 1) {
                const list = oss.filter(os => os.status === 'ABERTA')
                                .sort((a, b) => b.id_os - a.id_os);
                
                if (e.key === 'ArrowDown') {
                    setActiveIndex(prev => (prev + 1 >= list.length ? 0 : prev + 1));
                } else if (e.key === 'ArrowUp') {
                    setActiveIndex(prev => (prev - 1 < 0 ? list.length - 1 : prev - 1));
                } else if (e.key === 'Enter' && activeIndex !== -1) {
                    handleManageItems(list[activeIndex]);
                }
            }

            if (e.key === 'Escape') {
                if (creationStep > 1) {
                    setCreationStep(1);
                } else {
                    setShowRegisterModal('NONE');
                    setPlacaSearch('');
                    setClienteSearch('');
                    setVehicleResults([]);
                    setClienteResults([]);
                    setActiveIndex(-1);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [manageModalOpen, creationStep, activeIndex, oss]);

    const loadOss = useCallback(async () => {
        try {
            const response = await api.get('/ordem-de-servico');
            setOss(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar Ordens de Serviço.' });
        }
    }, []);

    const loadParts = async () => {
        try {
            const response = await api.get('/pecas-estoque');
            setAvailableParts(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar peças disponíveis.' });
        }
    };

    const loadEmployees = async () => {
        try {
            const response = await api.get('/funcionario');
            setEmployees(response.data);
            if (response.data.length > 0 && !formData.id_funcionario) {
                setFormData(prev => ({ ...prev, id_funcionario: String(response.data[0].id_funcionario) }));
            }
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar funcionários.' });
        }
    };

    const location = useLocation();


    useEffect(() => {
        loadOss();
        loadParts();
        loadEmployees();

        const params = new URLSearchParams(location.search);
        const osId = params.get('id');
        const clientIdParam = params.get('clientId');
        const vehicleIdParam = params.get('vehicleId');

        if (osId) {
            handleOpenFromId(Number(osId));
        } else if (clientIdParam && vehicleIdParam) {
             // Pre-fill for creation
             api.get(`/veiculo/${vehicleIdParam}`).then(res => {
                const vehicle = res.data;
                if (vehicle) {
                    selectVehicle(vehicle);
                    // Automatically focus/ready step 1
                }
            }).catch(console.error);
        }
    }, [loadOss, location.search]);

    const handleOpenFromId = async (id: number) => {
        try {
            const response = await api.get(`/ordem-de-servico/${id}`);
            const os = response.data;
            setSelectedOsForItems(os);
            setManageModalOpen(true);
            loadOsItems(id);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao abrir OS selecionada.' });
        }
    };

    const handleManageItems = async (os: IOrdemDeServico) => {
        try {
            const response = await api.get(`/ordem-de-servico/${os.id_os}`);
            setSelectedOsForItems(response.data);
            setManageModalOpen(true);
            loadOsItems(os.id_os);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar detalhes da OS.' });
        }
    };

    const handleCloseManageModal = () => {
        if (isDirty) {
            setConfirmModal({
                isOpen: true,
                title: 'Salvar alterações?',
                message: 'Deseja salvar as informações?',
                onConfirm: async () => {
                    const success = await handleUpdateOsInfo();
                    if (success) {
                        setManageModalOpen(false);
                        setIsDirty(false);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                }
            });
            return;
        }
        setManageModalOpen(false);
        setIsDirty(false);
    };

    const loadOsItems = async (idOs: number) => {
        try {
            const response = await api.get(`/itens-os/os/${idOs}`);
            setOsItems(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar itens da OS.' });
        }
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
                    descricao: description,
                    quantidade: qtd,
                    valor_venda: val,
                    valor_total: qtd * val,
                    codigo_referencia: newItem.codigo_referencia,
                    id_fornecedor: newItem.id_fornecedor || null
                });
                setStatusMsg({ type: 'success', text: 'Item atualizado!' });
            } else {
                await api.post('/itens-os', {
                    id_os: selectedOsForItems.id_os,
                    id_pecas_estoque: newItem.id_pecas_estoque ? Number(newItem.id_pecas_estoque) : null,
                    descricao: description,
                    quantidade: qtd,
                    valor_venda: val,
                    valor_total: qtd * val,
                    codigo_referencia: newItem.codigo_referencia,
                    id_fornecedor: newItem.id_fornecedor || null
                });
                setStatusMsg({ type: 'success', text: 'Item adicionado!' });
            }
            
            setNewItem({ id_pecas_estoque: '', quantidade: '1', valor_venda: '', descricao: '', codigo_referencia: '', id_fornecedor: '' });
            setPartSearch('');
            setEditingItemId(null);
            loadOsItems(selectedOsForItems.id_os);
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error: any) {
            setStatusMsg({ type: 'error', text: 'Erro ao processar item: ' + (error.response?.data?.error || error.message) });
        }
    };

    const handleDeleteItem = (id: number, osId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Item',
            message: 'Tem certeza que deseja excluir este item da OS?',
            onConfirm: async () => {
                 try {
                    await api.delete(`/itens-os/${id}`);
                    loadOsItems(osId);
                    setStatusMsg({ type: 'success', text: 'Item removido!' });
                    setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
                } catch (error: any) {
                    setStatusMsg({ type: 'error', text: 'Erro ao remover item' });
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleEditItem = (item: any) => {
        setEditingItemData({
             id_iten: item.id_iten,
             descricao: item.descricao,
             quantidade: item.quantidade,
             valor_venda: item.valor_venda, // valor unitario
             codigo_referencia: item.codigo_referencia || '',
             id_fornecedor: item.pagamentos_peca?.[0]?.id_fornecedor || '' 
        });
        setEditItemModalOpen(true);
    };

    const handleSaveItemEdit = async () => {
        if (!selectedOsForItems || !editingItemData) return;
        
        try {
            const qtd = Number(editingItemData.quantidade);
            const val = Number(editingItemData.valor_venda);
            
            await api.put(`/itens-os/${editingItemData.id_iten}`, {
                descricao: editingItemData.descricao,
                quantidade: qtd,
                valor_venda: val,
                valor_total: qtd * val,
                codigo_referencia: editingItemData.codigo_referencia,
                id_fornecedor: editingItemData.id_fornecedor || null
            });
            
            setStatusMsg({ type: 'success', text: 'Item atualizado!' });
            loadOsItems(selectedOsForItems.id_os);
            setEditItemModalOpen(false);
            setEditingItemData(null);
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error: any) {
             setStatusMsg({ type: 'error', text: 'Erro ao atualizar item: ' + (error.response?.data?.error || error.message) });
        }
    };

    const handleFinishService = async () => {
        if (!selectedOsForItems) return;
        setLoading(true);
        const km = Number(selectedOsForItems.km_entrada);
        const totalItems = osItems.reduce((acc, item) => acc + Number(item.valor_total), 0);
        const totalLabor = Number(selectedOsForItems.valor_mao_de_obra || 0);
        const finalTotal = totalItems + totalLabor;

        if (isNaN(km)) {
            setStatusMsg({ type: 'error', text: 'KM de Entrada inválido.' });
            setLoading(false);
            return;
        }
        if (isNaN(totalLabor) || totalLabor < 0) {
            setStatusMsg({ type: 'error', text: 'Valor de Mão de Obra inválido.' });
            setLoading(false);
            return;
        }

        try {
            await api.put(`/ordem-de-servico/${selectedOsForItems.id_os}`, {
                km_entrada: Math.round(km),
                valor_pecas: totalItems,
                valor_mao_de_obra: totalLabor,
                valor_total_cliente: finalTotal,
                status: 'PRONTO PARA FINANCEIRO',
                dt_entrega: selectedOsForItems.dt_entrega ? new Date(selectedOsForItems.dt_entrega).toISOString() : new Date().toISOString(),
                obs_final: (selectedOsForItems as any).obs_final || ''
            });
            
            setStatusMsg({ type: 'success', text: 'Serviço Finalizado! Enviado para o Financeiro.' });
            setTimeout(() => {
                setManageModalOpen(false);
                setStatusMsg({ type: null, text: '' });
                loadOss();
            }, 2000);
        } catch (error: any) {
            const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message;
            const finalMsg = error.response?.status === 400 
                ? 'Falha na validação dos dados ou banco desatualizado (campos obrigatórios ausentes?): ' + errorMsg
                : 'Erro ao finalizar serviço: ' + errorMsg;
            
            setStatusMsg({ type: 'error', text: finalMsg });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOsInfo = async (): Promise<boolean> => {
        if (!selectedOsForItems) return false;
        setLoading(true);
        const km = Number(selectedOsForItems.km_entrada);
        const totalLabor = Number(selectedOsForItems.valor_mao_de_obra || 0);
        const totalItems = osItems.reduce((acc, item) => acc + Number(item.valor_total), 0);
        const finalTotal = totalItems + totalLabor;

        if (isNaN(km)) {
            setStatusMsg({ type: 'error', text: 'KM de Entrada inválido.' });
            setLoading(false);
            return false;
        }
        if (isNaN(totalLabor) || totalLabor < 0) {
            setStatusMsg({ type: 'error', text: 'Valor de Mão de Obra inválido.' });
            setLoading(false);
            return false;
        }

        try {
            await api.put(`/ordem-de-servico/${selectedOsForItems.id_os}`, {
                km_entrada: Math.round(km),
                valor_mao_de_obra: totalLabor,
                id_funcionario: Number(selectedOsForItems.id_funcionario),
                valor_pecas: totalItems,
                valor_total_cliente: finalTotal,
                defeito_relatado: selectedOsForItems.defeito_relatado,
                diagnostico: selectedOsForItems.diagnostico,
                obs_final: (selectedOsForItems as any).obs_final || ''
            });
            setStatusMsg({ type: 'success', text: 'Informações da OS atualizadas!' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
            loadOss();
            return true;
        } catch (error: any) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar OS: ' + (error.response?.data?.error || error.message) });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOs = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar OS',
            message: 'Tem certeza que deseja cancelar/excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await api.delete(`/ordem-de-servico/${id}`);
                    setStatusMsg({ type: 'success', text: 'OS removida com sucesso!' });
                    loadOss();
                    setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
                } catch (error: any) {
                    setStatusMsg({ type: 'error', text: 'Erro ao excluir OS: ' + (error.response?.data?.error || error.message) });
                } finally {
                    setLoading(false);
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeletePayment = (id: number) => {
         setConfirmModal({
            isOpen: true,
            title: 'Excluir Pagamento',
            message: 'Tem certeza que deseja excluir este pagamento?',
            onConfirm: async () => {
                try {
                    await api.delete(`/pagamento-cliente/${id}`);
                    setStatusMsg({ type: 'success', text: 'Pagamento removido!' });
                    if (selectedOsForItems) handleManageItems(selectedOsForItems);
                } catch (error: any) {
                    setStatusMsg({ type: 'error', text: 'Erro ao remover pagamento.' });
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleSaveFinishCreation = async () => {
        if (!currentCreatedOsId) return;
        
        const totalItems = osItems.reduce((acc, item) => acc + Number(item.valor_total), 0);
        const totalLabor = Number(formData.valor_mao_de_obra || 0);
        const finalTotal = totalItems + totalLabor;

        if (isNaN(totalLabor) || totalLabor < 0) {
            setStatusMsg({ type: 'error', text: 'Valor de Mão de Obra inválido.' });
            return;
        }

        try {
            await api.put(`/ordem-de-servico/${currentCreatedOsId}`, {
                valor_pecas: totalItems,
                valor_mao_de_obra: totalLabor,
                valor_total_cliente: finalTotal
            });
            setStatusMsg({ type: 'success', text: 'Ordem de Serviço salva com sucesso!' });
            setTimeout(() => {
                resetForm();
                loadOss();
            }, 2000);
        } catch (error: any) {
            setStatusMsg({ type: 'error', text: 'Erro ao salvar OS: ' + (error.response?.data?.error || error.message) });
        }
    };

    const handleVehicleSearch = async (val: string) => {
        setPlacaSearch(val.toUpperCase());
        setVehicleActiveIndex(-1);
        if (val.length < 1) {
            setVehicleResults([]);
            return;
        }

        try {
            const response = await api.get(`/veiculo/search?q=${val}`);
            setVehicleResults(response.data);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao buscar veículos.' });
        }
    };

    const handleClienteSearch = async (val: string) => {
        setClienteSearch(val);
        setClienteActiveIndex(-1);
        if (val.length < 2) {
            setClienteResults([]);
            return;
        }

        try {
            const response = await api.get(`/cliente/search?name=${val}`);
            setClienteResults(response.data);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao buscar clientes.' });
        }
    };

    const handlePartSearch = async (val: string) => {
        setPartSearch(val);
        setPartActiveIndex(-1);
        if (val.length < 2) {
            setPartResults([]);
            return;
        }
        try {
            // Busca no estoque E no histórico de descrições digitadas
            const [stockRes, historyRes] = await Promise.all([
                api.get(`/pecas-estoque/search?q=${val}`),
                api.get(`/itens-os/search/desc?q=${val}`)
            ]);

            // Formatar histórico para o mesmo padrão de resultados
            const historyFormatted = historyRes.data.map((h: any) => ({
                id_pecas_estoque: null, // Não é item de estoque
                nome: h.descricao,
                valor_venda: h.valor_venda,
                fabricante: 'Histórico',
                isHistory: true
            }));

            // Priorizar itens de estoque, depois histórico
            const combined = [...stockRes.data, ...historyFormatted];
            
            // Remover duplicatas de nome
            const unique = combined.filter((v, i, a) => a.findIndex(t => t.nome === v.nome) === i);
            
            setPartResults(unique);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao buscar peças/serviços.' });
        }
    };

    const selectPart = (p: any) => {
        setNewItem({
            ...newItem,
            id_pecas_estoque: String(p.id_pecas_estoque),
            valor_venda: String(p.valor_venda),
            descricao: p.nome
        });
        setPartSearch(p.nome);
        setPartResults([]);
    };

    const selectVehicle = (v: any) => {
        setFoundVeiculo(v);
        setFoundCliente(v.cliente);
        setPlacaSearch(v.placa);
        setVehicleResults([]);
        setFormData(prev => ({
            ...prev,
            id_cliente: String(v.cliente.id_cliente),
            id_veiculo: String(v.id_veiculo),
        }));
    };

    const selectCliente = (c: any) => {
        setFoundCliente(c);
        setFoundVeiculo(null);
        setClienteSearch('');
        setClienteResults([]);
        setPlacaSearch('');
        setFormData(prev => ({ ...prev, id_cliente: String(c.id_cliente), id_veiculo: '' }));
    };


    const handleCreateOSRecord = async () => {
        setLoading(true);
        const kmEntrada = Number(formData.km_entrada);
        const idCliente = Number(formData.id_cliente);
        const idVeiculo = Number(formData.id_veiculo);
        const idFuncionario = Number(formData.id_funcionario);
        const parcelas = Number(formData.parcelas);
        const valorTotalCliente = formData.valor_total_cliente ? Number(formData.valor_total_cliente) : null;
        const valorMaoDeObra = formData.valor_mao_de_obra ? Number(formData.valor_mao_de_obra) : null;

        if (isNaN(kmEntrada) || kmEntrada < 0) {
            setStatusMsg({ type: 'error', text: 'KM de Entrada inválido.' });
            setLoading(false);
            return;
        }
        if (isNaN(idCliente) || idCliente <= 0) {
            setStatusMsg({ type: 'error', text: 'Cliente inválido.' });
            setLoading(false);
            return;
        }
        if (isNaN(idVeiculo) || idVeiculo <= 0) {
            setStatusMsg({ type: 'error', text: 'Veículo inválido.' });
            setLoading(false);
            return;
        }
        if (isNaN(idFuncionario) || idFuncionario <= 0) {
            setStatusMsg({ type: 'error', text: 'Funcionário inválido.' });
            setLoading(false);
            return;
        }
        if (isNaN(parcelas) || parcelas <= 0) {
            setStatusMsg({ type: 'error', text: 'Número de parcelas inválido.' });
            setLoading(false);
            return;
        }
        if (valorTotalCliente !== null && (isNaN(valorTotalCliente) || valorTotalCliente < 0)) {
            setStatusMsg({ type: 'error', text: 'Valor total do cliente inválido.' });
            setLoading(false);
            return;
        }
        if (valorMaoDeObra !== null && (isNaN(valorMaoDeObra) || valorMaoDeObra < 0)) {
            setStatusMsg({ type: 'error', text: 'Valor de mão de obra inválido.' });
            setLoading(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                id_cliente: idCliente,
                id_veiculo: idVeiculo,
                id_funcionario: idFuncionario,
                km_entrada: Math.round(kmEntrada),
                parcelas: parcelas,
                dt_abertura: new Date(formData.dt_abertura).toISOString(),
                dt_entrega: formData.dt_entrega ? new Date(formData.dt_entrega).toISOString() : null,
                valor_total_cliente: valorTotalCliente,
                valor_mao_de_obra: valorMaoDeObra,
            };
            const response = await api.post('/ordem-de-servico', payload);
            setCurrentCreatedOsId(response.data.id_os);
            setSelectedOsForItems(response.data);
            setOsItems([]); // Clear items for the new OS
            setCreationStep(3);
            loadOss();
            setStatusMsg({ type: 'success', text: 'Registro de OS criado! Adicione os itens agora.' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error: any) {
            setStatusMsg({ type: 'error', text: 'Erro ao criar OS: ' + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    const handleAddItemToCurrent = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentCreatedOsId) return;

        try {
            const part = availableParts.find(p => p.id_pecas_estoque === Number(newItem.id_pecas_estoque));
            const description = part ? part.nome : (partSearch || 'Item Diverso');
            const qtd = Number(newItem.quantidade);
            const val = Number(newItem.valor_venda);

            if (isNaN(qtd) || qtd <= 0) {
                setStatusMsg({ type: 'error', text: 'Quantidade inválida.' });
                return;
            }
            if (isNaN(val) || val < 0) {
                setStatusMsg({ type: 'error', text: 'Valor de venda inválido.' });
                return;
            }

            if (editingItemId) {
                await api.put(`/itens-os/${editingItemId}`, {
                    descricao: description,
                    quantidade: qtd,
                    valor_venda: val,
                    valor_total: qtd * val,
                    codigo_referencia: newItem.codigo_referencia,
                    id_fornecedor: newItem.id_fornecedor || null
                });
                setStatusMsg({ type: 'success', text: 'Item atualizado!' });
            } else {
                await api.post('/itens-os', {
                    id_os: currentCreatedOsId,
                    id_pecas_estoque: newItem.id_pecas_estoque ? Number(newItem.id_pecas_estoque) : null,
                    descricao: description,
                    quantidade: qtd,
                    valor_venda: val,
                    valor_total: qtd * val,
                    codigo_referencia: newItem.codigo_referencia,
                    id_fornecedor: newItem.id_fornecedor || null
                });
                setStatusMsg({ type: 'success', text: 'Item adicionado!' });
            }
            
            setNewItem({ id_pecas_estoque: '', quantidade: '1', valor_venda: '', descricao: '', codigo_referencia: '', id_fornecedor: '' });
            setPartSearch('');
            setEditingItemId(null);
            loadOsItems(currentCreatedOsId);
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error: any) {
            setStatusMsg({ type: 'error', text: 'Erro ao processar item: ' + (error.response?.data?.error || error.message) });
        }
    };

    const resetForm = () => {
        setFormData({
            id_cliente: '', id_veiculo: '', id_funcionario: '1', km_entrada: '', status: 'ABERTA',
            parcelas: '1', defeito_relatado: '', diagnostico: '', valor_total_cliente: '', valor_mao_de_obra: '',
            dt_abertura: new Date().toISOString().slice(0, 16), dt_entrega: '',
        });
        setPlacaSearch('');
        setFoundCliente(null);
        setFoundVeiculo(null);
        setCreationStep(1);
        setCurrentCreatedOsId(null);
        setOsItems([]);
        setStatusMsg({ type: null, text: '' });
    };

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
                <StatusBanner 
                    msg={statusMsg}
                    onClose={() => setStatusMsg({ type: null, text: '' })}
                />
            )}
            


            {/* Edit Item Modal */}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Ordens de Serviço</h1>
                    <p className="text-neutral-500">Gestão de manutenções e serviços automotivos.</p>
                </div>
            </div>

            {/* PASSO 1: IDENTIFICAÇÃO */}
            <div className={`bg-surface p-6 rounded-2xl shadow-sm border transition-all ${creationStep === 1 ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-neutral-200'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${creationStep >= 1 ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400'}`}>
                            {creationStep > 1 ? <Check size={20} /> : <Search size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Passo 1: Identificação</h2>
                            <p className="text-sm text-neutral-500">Localize o veículo e o proprietário.</p>
                        </div>
                    </div>
                </div>

                {creationStep === 1 ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      
      {/* Header da Página */}
                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                                    <Car size={14} /> Placa do Veículo
                                </label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                    <input 
                                        ref={placaInputRef}
                                        autoFocus
                                        value={placaSearch}
                                        onChange={(e) => handleVehicleSearch(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, 'vehicle')}
                                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-lg font-mono font-bold uppercase tracking-widest text-neutral-900 transition-all"
                                        placeholder="ABC1234"
                                        maxLength={7}
                                    />
                                </div>
                                {placaSearch.length >= 1 && vehicleResults.length === 0 && (
                                    <div className="absolute z-30 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl p-4 text-center">
                                        <p className="text-sm text-neutral-500 mb-3">Placa não encontrada.</p>
                                        <button 
                                            onClick={() => {
                                                if (foundCliente) {
                                                    setCreatedClientId(foundCliente.id_cliente);
                                                    setShowRegisterModal('VEICULO');
                                                } else {
                                                    setShowRegisterModal('VEICULO'); // Will trigger client selection in VeiculoForm logic if strictly followed, or we can prompt.
                                                    // Given existing logic, we allow it. The bug was likely the Render Condition below.
                                                }
                                            }}
                                            className="w-full py-2 bg-primary-100 text-primary-700 rounded-lg font-black text-xs uppercase hover:bg-primary-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Cadastrar Novo Veículo
                                        </button>
                                    </div>
                                )}
                                {vehicleResults.length > 0 && (
                                    <div className="absolute z-30 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        {vehicleResults.map((v, idx) => (
                                            <button 
                                                key={v.id_veiculo} 
                                                onClick={() => selectVehicle(v)} 
                                                className={`w-full p-4 text-left border-b border-neutral-50 hover:bg-primary-50 transition-colors flex items-center justify-between ${idx === vehicleActiveIndex ? 'bg-primary-100' : ''}`}
                                            >
                                                <div>
                                                    <p className="font-black text-neutral-800 tracking-widest">{v.placa}</p>
                                                    <p className="text-[10px] text-neutral-500 font-bold uppercase">{v.marca} {v.modelo}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Dono</p>
                                                    <p className="text-sm font-bold text-primary-600 truncate max-w-[150px]">
                                                        {v.cliente?.pessoa_fisica?.pessoa?.nome || v.cliente?.pessoa_juridica?.razao_social || 'Cliente sem Nome'}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-400 font-medium">{v.cliente?.telefone_1}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Busca por Cliente */}
                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                                    <User size={14} /> Proprietário
                                </label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                    <input 
                                        ref={clienteInputRef}
                                        value={clienteSearch}
                                        onChange={(e) => handleClienteSearch(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, 'cliente')}
                                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-neutral-900 transition-all font-bold"
                                        placeholder="Nome do cliente..."
                                    />
                                </div>
                                {clienteSearch.length >= 2 && clienteResults.length === 0 && (
                                    <div className="absolute z-30 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl p-4 text-center">
                                        <p className="text-sm text-neutral-500 mb-3">Cliente não encontrado.</p>
                                        <button 
                                            onClick={() => setShowRegisterModal('PESSOA')}
                                            className="w-full py-2 bg-primary-100 text-primary-700 rounded-lg font-black text-xs uppercase hover:bg-primary-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> Cadastrar Novo Cliente
                                        </button>
                                    </div>
                                )}
                                {clienteResults.length > 0 && (
                                    <div className="absolute z-30 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        {clienteResults.map((c, idx) => (
                                            <button 
                                                key={c.id_cliente} 
                                                onClick={() => selectCliente(c)} 
                                                className={`w-full p-4 text-left border-b border-neutral-50 hover:bg-primary-50 transition-colors ${idx === clienteActiveIndex ? 'bg-primary-100' : ''}`}
                                            >
                                                <p className="font-bold text-neutral-900">{c.pessoa_fisica?.pessoa.nome || c.pessoa_juridica?.razao_social}</p>
                                                <p className="text-[10px] text-neutral-500">{c.email} • {c.telefone_1}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lista de Veículos do Cliente Selecionado */}
                        {foundCliente && !foundVeiculo && (
                            <div className="p-6 bg-primary-50/30 rounded-2xl border border-dashed border-primary-200 animate-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-2 mb-4">
                                    <Car size={18} className="text-primary-600" />
                                    <h3 className="text-sm font-black text-primary-900 uppercase">Selecione um Veículo de {foundCliente.pessoa_fisica?.pessoa.nome || foundCliente.pessoa_juridica?.razao_social}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(foundCliente.veiculos || []).map((v: any) => (
                                        <button 
                                            key={v.id_veiculo} 
                                            onClick={() => selectVehicle({ ...v, cliente: foundCliente })}
                                            className="p-4 bg-white border border-primary-100 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all text-left flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="font-black text-primary-900 tracking-widest">{v.placa}</p>
                                                <p className="text-[10px] text-neutral-500 font-bold uppercase">{v.marca} {v.modelo}</p>
                                            </div>
                                            <ArrowRight size={16} className="text-primary-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setShowRegisterModal('VEICULO')}
                                        className="p-4 border border-dashed border-neutral-300 rounded-xl hover:border-primary-500 hover:text-primary-600 transition-all text-left flex items-center gap-3 text-neutral-500 font-bold text-sm"
                                    >
                                        <Plus size={20} /> Novo Veículo
                                    </button>
                                </div>
                            </div>
                        )}

                        {(foundCliente || foundVeiculo) && (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 border-t border-neutral-100 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div className={`p-4 rounded-xl border flex items-center justify-between ${foundCliente ? 'bg-primary-50 border-primary-100 text-primary-700' : 'bg-neutral-50 border-neutral-200 opacity-50 border-dashed'}`}>
                                        <div className="flex items-center gap-3">
                                            <User size={20} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase">Cliente Selecionado</p>
                                                <p className="font-bold">{foundCliente ? (foundCliente.pessoa_fisica?.pessoa.nome || foundCliente.pessoa_juridica?.razao_social) : 'Aguardando seleção...'}</p>
                                            </div>
                                        </div>
                                        {foundCliente && <button onClick={() => setFoundCliente(null)} className="text-neutral-400 hover:text-red-500"><Plus size={18} className="rotate-45" /></button>}
                                    </div>
                                    <div className={`p-4 rounded-xl border flex items-center justify-between ${foundVeiculo ? 'bg-primary-50 border-primary-100 text-primary-700' : 'bg-neutral-50 border-neutral-200 opacity-50 border-dashed'}`}>
                                        <div className="flex items-center gap-3">
                                            <Car size={20} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase">Veículo Selecionado</p>
                                                <p className="font-bold tracking-widest uppercase">{foundVeiculo ? foundVeiculo.placa : 'Aguardando seleção...'}</p>
                                            </div>
                                        </div>
                                        {foundVeiculo && <button onClick={() => setFoundVeiculo(null)} className="text-neutral-400 hover:text-red-500"><Plus size={18} className="rotate-45" /></button>}
                                    </div>
                                </div>
                                {foundVeiculo && (
                                    <div className="w-full flex flex-col items-center gap-6">
                                        <div className="w-full p-6 bg-primary-50 border border-primary-200 rounded-3xl text-primary-900 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                                                <BadgeCheck size={120} />
                                            </div>
                                            <div className="relative z-10 space-y-4">
                                                <div className="flex items-center gap-3 text-primary-600 font-black uppercase text-xs tracking-widest">
                                                    <Check size={16} /> Conferência de Dados
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div>
                                                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Proprietário / Cliente</p>
                                                        <p className="text-xl font-black">{foundCliente ? (foundCliente.pessoa_fisica?.pessoa.nome || foundCliente.pessoa_juridica?.razao_social) : '---'}</p>
                                                        <p className="text-xs text-neutral-400 font-medium">{foundCliente?.telefone_1}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Veículo / Placa</p>
                                                        <p className="text-xl font-black tracking-widest uppercase">{foundVeiculo.placa}</p>
                                                        <p className="text-xs text-neutral-400 font-bold uppercase">{foundVeiculo.marca} {foundVeiculo.modelo} ({foundVeiculo.cor})</p>
                                                    </div>
                                                    <div className="flex items-center justify-end">
                                                        <button 
                                                            onClick={() => setCreationStep(2)}
                                                            className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 flex items-center gap-3 active:scale-95"
                                                        >
                                                            CONFIRMAR <ArrowRight size={22} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-400 italic font-medium">Os dados acima estão corretos? Se sim, clique em CONFIRMAR para iniciar o diagnóstico.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-primary-50 border border-primary-200 p-4 rounded-2xl text-primary-900">
                        <div className="flex gap-12">
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase">Proprietário</p>
                                <p className="font-black">{foundCliente?.pessoa_fisica?.pessoa.nome || foundCliente?.pessoa_juridica?.razao_social}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase">Veículo</p>
                                <p className="font-black tracking-widest uppercase">{foundVeiculo?.placa}</p>
                            </div>
                        </div>
                        <button onClick={() => setCreationStep(1)} className="text-xs font-black text-primary-600 hover:text-primary-800">ALTERAR</button>
                    </div>
                )}
            </div>

            {/* PASSO 2: DADOS TÉCNICOS */}
            {creationStep >= 2 && (
                <div className={`bg-surface p-6 rounded-2xl shadow-sm border transition-all ${creationStep === 2 ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-neutral-200'} animate-in fade-in slide-in-from-top-4 duration-500`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-lg ${creationStep >= 2 ? 'bg-success-100 text-success-600' : 'bg-neutral-100 text-neutral-400'}`}>
                            {creationStep > 2 ? <Check size={20} /> : <FileText size={20} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Passo 2: Diagnóstico e Entrada</h2>
                            <p className="text-sm text-neutral-500">Registre o estado do veículo na chegada.</p>
                        </div>
                    </div>


                    {creationStep === 2 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">KM de Entrada *</label>
                                    <input 
                                        type="number" 
                                        value={formData.km_entrada} 
                                        onChange={e => setFormData({...formData, km_entrada: e.target.value})} 
                                        className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary-100 font-black text-lg" 
                                        placeholder="000.000" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">Data/Hora Entrada</label>
                                    <input 
                                        type="datetime-local" 
                                        value={formData.dt_abertura} 
                                        onChange={e => setFormData({...formData, dt_abertura: e.target.value})} 
                                        className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary-100 font-bold" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">Previsão Entrega</label>
                                    <input 
                                        type="datetime-local" 
                                        value={formData.dt_entrega} 
                                        onChange={e => setFormData({...formData, dt_entrega: e.target.value})} 
                                        className="w-full border p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary-100 font-bold" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1">
                                        <User size={14} /> Mecânico / Responsável
                                    </label>
                                    <select 
                                        name="id_funcionario" 
                                        value={formData.id_funcionario} 
                                        onChange={(e) => setFormData({...formData, id_funcionario: e.target.value})} 
                                        className="w-full border p-4 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-700 bg-neutral-50" 
                                    >
                                        <option value="">Selecione um Mecânico</option>
                                        {employees.map(emp => (
                                            <option key={emp.id_funcionario} value={emp.id_funcionario}>
                                                {emp.pessoa_fisica?.pessoa?.nome || `Mecânico #${emp.id_funcionario}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 opacity-50 pointer-events-none">
                                    <label className="text-xs font-bold text-neutral-500 uppercase">Status Inicial</label>
                                    <input value="ABERTA" disabled className="w-full border p-4 rounded-xl bg-neutral-100 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1">
                                        <PenTool size={14} /> Defeito Relatado / Queixa
                                    </label>
                                    <textarea 
                                        value={formData.defeito_relatado} 
                                        onChange={e => setFormData({...formData, defeito_relatado: e.target.value})} 
                                        className="w-full border p-4 rounded-xl outline-none h-28 resize-none" 
                                        placeholder="O que o cliente relatou de problema?" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1">
                                        <Wrench size={14} /> Diagnóstico / Obs Internas
                                    </label>
                                    <textarea 
                                        value={formData.diagnostico} 
                                        onChange={e => setFormData({...formData, diagnostico: e.target.value})} 
                                        className="w-full border p-4 rounded-xl outline-none h-28 resize-none" 
                                        placeholder="Notas técnicas iniciais..." 
                                    />
                                </div>
                            </div>

                            {employees.length === 0 && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 mb-4 animate-pulse">
                                    <AlertCircle size={20} />
                                    <p className="text-xs font-bold uppercase">Nenhum mecânico cadastrado! Cadastre um funcionário para prosseguir.</p>
                                </div>
                            )}

                            <div className="flex justify-center pt-4 border-t border-neutral-100">
                                <button 
                                    onClick={handleCreateOSRecord} 
                                    disabled={!formData.km_entrada || !formData.id_funcionario || loading}
                                    className="bg-neutral-900 text-white px-20 py-4 rounded-2xl font-black text-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl shadow-black/10 flex items-center gap-3 active:scale-95"
                                >
                                    {loading ? 'SALVANDO...' : 'OK'} <ArrowRight size={24} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-primary-50 p-6 rounded-2xl text-primary-900 border border-primary-200">
                            <div>
                                <p className="text-[10px] font-bold text-neutral-500 uppercase">KM Entrada</p>
                                <p className="font-black text-lg">{formData.km_entrada}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-500 uppercase">Abertura</p>
                                <p className="font-bold">{new Date(formData.dt_abertura).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* PASSO 3: ITENS DA OS (INTEGRADO) */}
            {creationStep === 3 && (
                <div className="bg-primary-50 p-6 rounded-2xl shadow-sm border border-primary-200 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-primary-100 text-primary-600 p-2 rounded-lg">
                            <Package size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-primary-900">Passo 3: Peças e Serviços</h2>
                            <p className="text-sm text-primary-700">Insira os itens da nota fiscal/serviço.</p>
                        </div>
                    </div>


                    <div className="space-y-6">
                        {/* Formulário de Inserção Rápida */}
                        <div className="p-5 bg-white border border-dashed border-primary-200 rounded-2xl">
                            <form onSubmit={handleAddItemToCurrent} className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-12 md:col-span-12 relative mb-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Buscar Peça ou Digitar Serviço</label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-success-500 transition-colors" size={20} />
                                        <input 
                                            ref={partInputRef}
                                            value={partSearch}
                                            onChange={(e) => handlePartSearch(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, 'part')}
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-success-500/20 font-bold"
                                            placeholder="Ex: Jogo de Pastilhas Dianteiras..."
                                        />
                                    </div>
                                    {partResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
                                            {partResults.map((p, idx) => (
                                                <button 
                                                    key={p.id_pecas_estoque} 
                                                    type="button" 
                                                    onClick={() => selectPart(p)} 
                                                    className={`w-full text-left p-4 hover:bg-success-50 border-b border-neutral-50 last:border-0 flex justify-between items-center transition-colors ${idx === partActiveIndex ? 'bg-success-100' : ''}`}
                                                >
                                                    <div>
                                                        <p className="font-bold text-neutral-800">{p.nome}</p>
                                                        <p className="text-[10px] text-neutral-500 uppercase">{p.fabricante || 'ESTOQUE'} • Qtd: {p.estoque_atual}</p>
                                                    </div>
                                                    <p className="font-black text-success-600">R$ {Number(p.valor_venda).toFixed(2)}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-4 md:col-span-3">
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">REF/NOTA</label>
                                    <input 
                                        type="text" 
                                        value={newItem.codigo_referencia} 
                                        onChange={e => setNewItem({...newItem, codigo_referencia: e.target.value})} 
                                        className="w-full border p-4 rounded-xl text-center font-bold text-lg uppercase" 
                                        placeholder="REF"
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Qtd</label>
                                    <input 
                                        type="number" 
                                        value={newItem.quantidade} 
                                        onChange={e => setNewItem({...newItem, quantidade: e.target.value})} 
                                        className="w-full border p-4 rounded-xl text-center font-black text-lg" 
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-3">
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Valor Unitário</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-neutral-400">R$</span>
                                        <input 
                                            type="number" step="0.01" 
                                            value={newItem.valor_venda} 
                                            onChange={e => setNewItem({...newItem, valor_venda: e.target.value})} 
                                            className="w-full border pl-12 pr-4 py-4 rounded-xl font-black text-lg" 
                                        />
                                    </div>
                                </div>
                                <button className="col-span-3 md:col-span-4 bg-neutral-900 text-white h-[60px] rounded-xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-black/10">
                                    <Plus size={24} strokeWidth={3} /> ADICIONAR
                                </button>
                            </form>
                        </div>

                        {/* Tabela de Itens Pró */}
                        <div className="border border-neutral-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-neutral-50 border-b border-neutral-100">
                                    <tr>
                                        <th className="p-5 font-black text-neutral-500 uppercase text-[10px] tracking-widest">Item / Serviço</th>
                                        <th className="p-5 font-black text-neutral-500 uppercase text-[10px] tracking-widest text-center">Qtde</th>
                                        <th className="p-5 font-black text-neutral-500 uppercase text-[10px] tracking-widest text-right">Preço Unit.</th>
                                        <th className="p-5 font-black text-neutral-500 uppercase text-[10px] tracking-widest text-right">Subtotal</th>
                                        <th className="p-5 font-black text-neutral-500 uppercase text-[10px] tracking-widest text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50">
                                    {osItems.length === 0 ? (
                                        <tr><td colSpan={5} className="p-10 text-center text-neutral-400 italic font-medium">Nenhum item adicionado ainda. Adicione as peças acima.</td></tr>
                                    ) : osItems.map(item => (
                                        <tr key={item.id_iten} className="hover:bg-neutral-25 transition-colors">
                                            <td className="p-5 font-bold text-neutral-800 capitalize">{item.descricao}</td>
                                            <td className="p-5 text-center font-black text-neutral-600">x{item.quantidade}</td>
                                            <td className="p-5 text-right font-medium text-neutral-500">R$ {Number(item.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-5 text-right font-black text-neutral-900">R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditItem(item)} className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                        <PenTool size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteItem(item.id_iten, currentCreatedOsId!)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Plus size={16} className="rotate-45" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>

                        {/* Rodapé de Fechamento */}
                        <div className="flex flex-col md:flex-row justify-between items-center bg-neutral-900 p-8 rounded-3xl text-white gap-6">
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Mão de Obra</p>
                                    <div className="relative">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400 text-lg font-black">R$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={formData.valor_mao_de_obra}
                                            onChange={(e) => setFormData({...formData, valor_mao_de_obra: e.target.value})}
                                            className="bg-transparent border-b border-neutral-700 pl-8 py-1 text-2xl font-black focus:border-success-500 outline-none w-32 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Geral</p>
                                    <p className="text-3xl font-black text-success-400">
                                        R$ {(
                                            osItems.reduce((acc, item) => acc + Number(item.valor_total), 0) + 
                                            Number(formData.valor_mao_de_obra || 0)
                                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button onClick={handleSaveFinishCreation} className="flex-1 bg-success-600 hover:bg-success-700 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl shadow-success-500/20 transition-all uppercase tracking-widest active:scale-95">
                                    SALVAR E CONCLUIR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SEÇÃO: SERVIÇOS RECENTES / EM ANDAMENTO */}
            <div className="bg-surface rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-neutral-900">Serviços em Aberto</h2>
                        <p className="text-sm text-neutral-500">Acompanhe e gerencie as ordens de serviço ativas.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="p-4 font-black text-neutral-500 uppercase text-[10px] tracking-widest">OS</th>
                                <th className="p-4 font-black text-neutral-500 uppercase text-[10px] tracking-widest">Placa</th>
                                <th className="p-4 font-black text-neutral-500 uppercase text-[10px] tracking-widest">Veículo</th>
                                <th className="p-4 font-black text-neutral-500 uppercase text-[10px] tracking-widest">Cliente</th>
                                <th className="p-4 font-black text-neutral-500 uppercase text-[10px] tracking-widest text-center">Status</th>
                                <th className="p-4 font-black text-neutral-500 uppercase text-[10px] tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {oss.filter(os => os.status === 'ABERTA')
                               .sort((a,b) => b.id_os - a.id_os)
                               .map((os, idx) => (
                                <tr 
                                    key={os.id_os} 
                                    className={`hover:bg-neutral-25 transition-colors group cursor-pointer ${idx === activeIndex && !manageModalOpen && creationStep === 1 ? 'bg-primary-50 ring-2 ring-primary-500 ring-inset' : ''}`}
                                >
                                    <td onClick={() => handleManageItems(os)} className="p-4 font-black text-neutral-900 border-l-4 border-transparent group-hover:border-primary-500 transition-all">
                                        <div className="flex flex-col">
                                            <span>#{String(os.id_os).padStart(4, '0')}</span>
                                            <span className="text-[10px] text-neutral-400 font-bold">{new Date(os.dt_abertura).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td onClick={() => handleManageItems(os)} className="p-4">
                                        <p className="font-black text-neutral-800 tracking-widest uppercase">{os.veiculo?.placa}</p>
                                    </td>
                                    <td onClick={() => handleManageItems(os)} className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-100 rounded-lg text-neutral-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                <Car size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-neutral-800 uppercase text-xs">{os.veiculo?.marca} {os.veiculo?.modelo}</p>
                                                <p className="text-[10px] text-neutral-500 font-bold uppercase">{os.veiculo?.cor}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td onClick={() => handleManageItems(os)} className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-100 rounded-lg text-neutral-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-neutral-900 truncate max-w-[150px]">
                                                    {os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.razao_social || 'Cliente sem Nome'}
                                                </p>
                                                <p className="text-[10px] text-neutral-500 font-medium">{os.cliente?.telefone_1}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td onClick={() => handleManageItems(os)} className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ${getStatusStyle(os.status)}`}>
                                            {os.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button 
                                                onClick={() => handleManageItems(os)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 text-neutral-600 hover:bg-primary-600 hover:text-white rounded-lg transition-all font-black text-[10px] uppercase tracking-tighter shadow-sm border border-neutral-200"
                                            >
                                                <PenTool size={14} /> GERENCIAR
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteOs(os.id_os)}
                                                className="p-1.5 text-neutral-400 hover:text-error hover:bg-error-50 rounded-lg transition-all"
                                                title="Cancelar OS"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: CADASTRO RÁPIDO */}
            {showRegisterModal === 'PESSOA' && (
                <Modal title="Cadastro Rápido: Novo Cliente" onClose={() => setShowRegisterModal('NONE')}>
                    <ClienteForm 
                        onSuccess={(client) => {
                            setCreatedClientId(client.id_cliente);
                            setClienteSearch(''); // Clear search to hide "Not Found" card

                            setFoundCliente(client); // Auto select
                            setShowRegisterModal('VEICULO');
                        }}
                        onCancel={() => setShowRegisterModal('NONE')}
                    />
                </Modal>
            )}

             {showRegisterModal === 'VEICULO' && (
                <Modal title="Cadastro Rápido: Novo Veículo" onClose={() => setShowRegisterModal('NONE')}>
                    <VeiculoForm
                        clientId={createdClientId}
                        initialData={{ placa: placaSearch }}
                        onCreateClient={() => {
                            setShowRegisterModal('PESSOA');
                        }}
                        onSuccess={(veiculo) => {
                             setFoundVeiculo(veiculo);
                             setFoundCliente(veiculo.cliente);
                             setFormData(prev => ({
                                ...prev,
                                id_cliente: String(veiculo.id_cliente),
                                id_veiculo: String(veiculo.id_veiculo),
                            }));
                            setShowRegisterModal('NONE');
                            setCreationStep(2); // Auto proceed to Step 2
                            setStatusMsg({ type: 'success', text: 'Veículo e Cliente vinculados! Preencha os dados de entrada.' });
                            setTimeout(() => setStatusMsg({ type: null, text: '' }), 4000);
                        }}
                        onCancel={() => setShowRegisterModal('NONE')}
                    />
                </Modal>
            )}

            {/* Status Feedback Info */}
            {/* Status Feedback Info (Footer) */}


            {/* MODAL: GERENCIAR ITENS (DESIGN PREMIUM) */}
            {manageModalOpen && selectedOsForItems && (
                 <Modal 
                    title={
                        <div className="flex items-baseline gap-2">
                            <span>OS #{String(selectedOsForItems.id_os).padStart(4, '0')}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusStyle(selectedOsForItems.status)}`}>
                                {selectedOsForItems.status}
                            </span>
                        </div>
                    } 
                    onClose={handleCloseManageModal}
                >
                    <div className="space-y-6">
                        {/* Redundant Info Header */}
                        <div className="p-4 bg-primary-50 rounded-2xl text-primary-900 shadow-sm flex flex-wrap items-center justify-between gap-6 border border-primary-100">
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <Car size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Veículo / Placa</p>
                                    <p className="text-lg font-black tracking-widest uppercase">{selectedOsForItems.veiculo?.placa}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedOsForItems.veiculo?.marca} {selectedOsForItems.veiculo?.modelo} • {selectedOsForItems.veiculo?.cor}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <User size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente / Proprietário</p>
                                    <p className="text-lg font-black">{selectedOsForItems.cliente?.pessoa_fisica?.pessoa.nome || selectedOsForItems.cliente?.pessoa_juridica?.razao_social}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedOsForItems.cliente?.telefone_1} {selectedOsForItems.cliente?.telefone_2 ? ` / ${selectedOsForItems.cliente?.telefone_2}` : ''}</p>
                                </div>
                             </div>
                             <div className="hidden lg:block">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abertura</p>
                                  <p className="text-sm font-bold text-gray-700">{new Date(selectedOsForItems.dt_abertura).toLocaleDateString()} às {new Date(selectedOsForItems.dt_abertura).toLocaleTimeString()}</p>
                             </div>
                        </div>


 
                         {/* Status Header */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                 <label className="text-[10px] font-black text-primary-400 uppercase">KM Entrada</label>
                                 <input 
                                     type="number" 
                                     value={selectedOsForItems.km_entrada}
                                     onChange={e => {
                                         setSelectedOsForItems({...selectedOsForItems, km_entrada: Number(e.target.value)});
                                         setIsDirty(true);
                                     }}
                                     className="w-full border-b border-neutral-200 py-1 font-bold outline-none focus:border-primary-500 transition-colors"
                                 />
                             </div>
                             <div className="space-y-1">
                                 <label className="text-[10px] font-black text-neutral-400 uppercase">Mecânico</label>
                                 <select 
                                     value={selectedOsForItems.id_funcionario}
                                     onChange={e => {
                                         setSelectedOsForItems({...selectedOsForItems, id_funcionario: Number(e.target.value)});
                                         setIsDirty(true);
                                     }}
                                     className="w-full border-b border-neutral-200 py-1 font-bold outline-none focus:border-primary-500 transition-colors bg-transparent"
                                 >
                                     {employees.map(emp => (
                                         <option key={emp.id_funcionario} value={emp.id_funcionario}>
                                             {emp.pessoa_fisica?.pessoa?.nome || `Mecânico #${emp.id_funcionario}`}
                                         </option>
                                     ))}
                                 </select>
                             </div>
                         </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-neutral-400">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Peças</p>
                                    <p className="text-lg font-bold text-neutral-900">R$ {osItems.reduce((acc, item) => acc + Number(item.valor_total), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-neutral-400">
                                    <ArrowRight size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Mão de Obra</p>
                                    <div className="relative">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-neutral-400">R$</span>
                                        <input 
                                            type="number" step="0.01" 
                                            value={selectedOsForItems.valor_mao_de_obra === 0 ? '' : (selectedOsForItems.valor_mao_de_obra ?? '')}
                                            onChange={e => {
                                                setSelectedOsForItems({...selectedOsForItems, valor_mao_de_obra: e.target.value === '' ? 0 : Number(e.target.value)});
                                                setIsDirty(true);
                                            }}
                                            className="bg-transparent border-b border-primary-200 pl-6 py-0 font-black text-lg w-full focus:border-primary-500 outline-none text-primary-900"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-primary-600 shadow-sm">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-primary-600 uppercase">Total Geral</p>
                                    <p className="text-xl font-black text-primary-900">R$ {(osItems.reduce((acc, item) => acc + Number(item.valor_total), 0) + Number(selectedOsForItems.valor_mao_de_obra || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO FINANCEIRO MOVIDA PARA BAIXO DO LISTAGEM */}

                        {/* Diagnóstico e Defeitos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Defeito Relatado</label>
                                <textarea 
                                    value={selectedOsForItems.defeito_relatado || ''}
                                    onChange={e => {
                                        setSelectedOsForItems({...selectedOsForItems, defeito_relatado: e.target.value});
                                        setIsDirty(true);
                                    }}
                                    className="w-full bg-primary-50 p-3 rounded-xl border border-primary-100 text-xs font-medium resize-none h-20 outline-none focus:border-primary-300 text-primary-900"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Diagnóstico / Ações</label>
                                <textarea 
                                    value={selectedOsForItems.diagnostico || ''}
                                    onChange={e => {
                                        setSelectedOsForItems({...selectedOsForItems, diagnostico: e.target.value});
                                        setIsDirty(true);
                                    }}
                                    className="w-full bg-primary-50 p-3 rounded-xl border border-primary-100 text-xs font-medium resize-none h-20 outline-none focus:border-primary-300 text-primary-900"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-green-600 uppercase">Observação Final (Para Financeiro)</label>
                                <textarea 
                                    value={(selectedOsForItems as any).obs_final || ''}
                                    onChange={e => {
                                        setSelectedOsForItems({...selectedOsForItems, obs_final: e.target.value});
                                        setIsDirty(true);
                                    }}
                                    placeholder="Observações de custos extras, descontos ou detalhes para o faturamento..."
                                    className="w-full bg-green-50 p-3 rounded-xl border border-green-100 text-xs font-medium resize-none h-20 outline-none focus:border-green-300"
                                />
                            </div>
                        </div>

                        {/* Form Adicionar Peça */}
                        {selectedOsForItems.status !== 'FINALIZADA' && (
                            <div className="p-4 border border-dashed border-primary-200 rounded-2xl bg-primary-50">
                                <p className="text-[10px] font-black text-gray-500 uppercase mb-4 flex items-center gap-2">
                                    <Plus size={14} className="text-green-600" /> Adicionar Peça / Serviço
                                </p>
                                <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-3 items-end">
                                    {/* SEARCH - FULL WIDTH */}
                                    <div className="col-span-12 relative">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={16} />
                                            <input 
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 text-sm font-bold" 
                                                placeholder="Buscar peça ou digitar serviço..."
                                                value={partSearch}
                                                onChange={(e) => handlePartSearch(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, 'part')}
                                                ref={partInputRef}
                                            />
                                        </div>

                                        {/* Result Dropdown */}
                                        {partResults.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
                                                {partResults.map((p, idx) => (
                                                    <button 
                                                        key={p.id_pecas_estoque}
                                                        type="button"
                                                        onClick={() => selectPart(p)}
                                                        className={`w-full text-left p-4 border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors ${idx === partActiveIndex ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">{p.nome}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{p.fabricante || 'ESTOQUE'}</p>
                                                        </div>
                                                        <p className="font-black text-green-600 group-hover:scale-110 transition-transform">R$ {Number(p.valor_venda).toFixed(2)}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ROW 2: DETAILS */}
                                    <div className="col-span-12 md:col-span-3">
                                        <input 
                                            type="text" placeholder="REF/NOTA" 
                                            className="w-full border p-3 rounded-xl border-gray-200 outline-none focus:ring-4 focus:ring-green-100 text-xs font-bold text-center uppercase" 
                                            value={newItem.codigo_referencia}
                                            onChange={e => setNewItem({...newItem, codigo_referencia: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <div className="relative">
                                            <input 
                                                type="number" placeholder="QTDE" className="w-full border p-3 rounded-xl border-gray-200 outline-none focus:ring-4 focus:ring-green-100 text-sm font-black text-center uppercase" 
                                                value={newItem.quantidade}
                                                onChange={e => setNewItem({...newItem, quantidade: e.target.value})}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">R$</span>
                                            <input 
                                                type="number" step="0.01" placeholder="UNITÁRIO" className="w-full border pl-8 pr-3 py-3 rounded-xl border-gray-200 outline-none focus:ring-4 focus:ring-green-100 text-sm font-black" 
                                                value={newItem.valor_venda}
                                                onChange={e => setNewItem({...newItem, valor_venda: e.target.value})}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        type="submit"
                                        className="col-span-12 md:col-span-2 bg-primary-600 text-white h-[48px] rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center shadow-lg shadow-primary-500/20 active:scale-95"
                                    >
                                        {editingItemId ? <Check size={24} strokeWidth={3} /> : <Plus size={24} strokeWidth={3} />}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Listagem Itens */}
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                             <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-black text-gray-400 uppercase text-[9px] tracking-widest">Descrição</th>
                                        <th className="p-4 font-black text-gray-400 uppercase text-[9px] tracking-widest text-center">Qtde</th>
                                        <th className="p-4 font-black text-gray-400 uppercase text-[9px] tracking-widest text-right">Subtotal</th>
                                        <th className="p-4 font-black text-gray-400 uppercase text-[9px] tracking-widest text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {osItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-gray-300 italic font-medium">Nenhum item adicionado à OS.</td>
                                        </tr>
                                    ) : osItems.map(item => (
                                        <tr key={item.id_iten} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-800">{item.descricao}</td>
                                            <td className="p-4 text-center font-black text-gray-500">x{item.quantidade}</td>
                                            <td className="p-4 text-right font-black text-gray-900 italic">R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditItem(item)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                        <PenTool size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteItem(item.id_iten, selectedOsForItems.id_os)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Plus size={14} className="rotate-45" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>

                        {/* Botão Finalizar (Styled Light) */}
                        <div className="pt-8 border-t border-gray-100 space-y-6">

                            {/* SEÇÃO FINANCEIRO E PAGAMENTOS */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                                <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center relative z-10">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Pago</p>
                                        <p className="text-3xl font-black text-green-600">
                                            R$ {selectedOsForItems.pagamentos_cliente?.reduce((acc, p) => acc + Number(p.valor), 0).toFixed(2) || '0.00'}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Restante a Pagar</p>
                                        <p className="text-3xl font-black text-red-500">
                                            R$ {Math.max(0, (
                                                (osItems.reduce((acc, item) => acc + Number(item.valor_total), 0) + Number(selectedOsForItems.valor_mao_de_obra || 0)) -
                                                (selectedOsForItems.pagamentos_cliente?.reduce((acc, p) => acc + Number(p.valor), 0) || 0)
                                            )).toFixed(2)}
                                        </p>
                                    </div>

                                    <Button 
                                        onClick={() => {
                                            setEditingPayment(null);
                                            setShowPaymentModal(true);
                                        }}
                                        variant="success"
                                        className="px-6 py-3 rounded-xl uppercase text-xs tracking-wider shadow-lg shadow-green-100"
                                    >
                                        <DollarSign size={18} /> Registrar Pagamento
                                    </Button>
                                </div>

                                {/* Lista de Pagamentos */}
                                {(selectedOsForItems.pagamentos_cliente?.length ?? 0) > 0 && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Histórico de Pagamentos</p>
                                        <div className="space-y-2">
                                            {selectedOsForItems.pagamentos_cliente?.map(p => (
                                                <div key={p.id_pagamento_cliente} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-xs hover:bg-gray-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-green-100 rounded text-green-600">
                                                            <CheckCircle size={14} />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-gray-800">{new Date(p.data_pagamento).toLocaleDateString()}</span>
                                                            <span className="text-gray-400 mx-2">•</span>
                                                            <span className="font-bold text-gray-600">{p.metodo_pagamento}</span>
                                                            {p.qtd_parcelas > 1 && <span className="text-gray-500 ml-1">({p.qtd_parcelas}x)</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-gray-900">R$ {Number(p.valor).toFixed(2)}</span>
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingPayment(p);
                                                                    setShowPaymentModal(true);
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            >
                                                                <PenTool size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePayment(p.id_pagamento_cliente)}
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botão Salvar Dados Básicos (Moved) */}
                            <Button 
                                onClick={handleUpdateOsInfo}
                                isLoading={loading}
                                className="w-full bg-success-600 hover:bg-success-700 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-success-500/20"
                            >
                                SALVAR DADOS BÁSICOS
                            </Button>

                             {selectedOsForItems.status === 'ABERTA' ? (
                                <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 space-y-6">
                                    <div className="flex items-center gap-4 text-green-700">
                                        <BadgeCheck size={32} />
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Finalizar Serviço</h3>
                                            <p className="text-xs font-medium opacity-70">Confirme os dados de encerramento para enviar ao financeiro.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase">Data e Hora de Entrega</label>
                                            <input 
                                                type="datetime-local"
                                                className="w-full bg-white border border-primary-200 p-4 rounded-xl font-bold outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-primary-900"
                                                value={selectedOsForItems.dt_entrega ? selectedOsForItems.dt_entrega.slice(0, 16) : new Date().toISOString().slice(0, 16)}
                                                onChange={e => setSelectedOsForItems({...selectedOsForItems, dt_entrega: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button 
                                                onClick={handleFinishService}
                                                isLoading={loading}
                                                variant="success"
                                                className="w-full py-4 rounded-xl text-lg font-black uppercase tracking-widest shadow-xl shadow-green-200"
                                            >
                                                <CheckCircle size={28} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" /> FINALIZAR E ENVIAR
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                             ) : (
                                 <div className="flex items-center justify-center gap-3 p-8 bg-white rounded-3xl text-green-600 font-black border border-green-100 uppercase tracking-[0.2em] text-sm shadow-sm relative overflow-hidden">
                                     <div className="absolute inset-0 bg-green-50/50 pointer-events-none"></div>
                                     <BadgeCheck size={24} className="text-green-600 animate-bounce" /> PRONTO PARA FINANCEIRO
                                 </div>
                             )}
                        </div>
                    </div>

                 </Modal>
            )}
            

            {editItemModalOpen && editingItemData && (
                <Modal title="Editar Item da OS" onClose={() => setEditItemModalOpen(false)}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Descrição do Item</label>
                            <input 
                                value={editingItemData.descricao}
                                onChange={e => {
                                    setEditingItemData({...editingItemData, descricao: e.target.value});
                                    setIsDirty(true);
                                }}
                                className="w-full border p-3 rounded-xl font-bold text-gray-700 focus:border-primary-500 outline-none"
                            />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Referência / Nota</label>
                            <input 
                                value={editingItemData.codigo_referencia}
                                onChange={e => {
                                    setEditingItemData({...editingItemData, codigo_referencia: e.target.value});
                                    setIsDirty(true);
                                }}
                                className="w-full border p-3 rounded-xl font-bold text-gray-700 focus:border-primary-500 outline-none"
                                placeholder="Código, Nº Nota, Marca..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Quantidade</label>
                                <input 
                                    type="number"
                                    value={editingItemData.quantidade}
                                    onChange={e => {
                                        setEditingItemData({...editingItemData, quantidade: e.target.value});
                                        setIsDirty(true);
                                    }}
                                    className="w-full border p-3 rounded-xl font-bold text-gray-700 focus:border-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Valor Unit. (R$)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={editingItemData.valor_venda}
                                    onChange={e => {
                                         setEditingItemData({...editingItemData, valor_venda: e.target.value});
                                         setIsDirty(true);
                                    }}
                                    className="w-full border p-3 rounded-xl font-bold text-gray-700 focus:border-primary-500 outline-none"
                                />
                            </div>
                        </div>
                         <div className="bg-neutral-50 p-4 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-neutral-500">Total Calculado</span>
                            <span className="text-xl font-black text-primary-600">
                                R$ {((Number(editingItemData.quantidade) || 0) * (Number(editingItemData.valor_venda) || 0)).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-100">
                             <button 
                                onClick={() => setEditItemModalOpen(false)} 
                                className="px-4 py-2 text-neutral-500 font-bold hover:bg-neutral-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                             <button 
                                onClick={handleSaveItemEdit} 
                                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {showPaymentModal && selectedOsForItems && (
                <Modal title={editingPayment ? "Editar Pagamento" : "Registrar Pagamento do Cliente"} onClose={() => setShowPaymentModal(false)}>
                    <PagamentoClienteForm 
                        osId={selectedOsForItems.id_os}
                        initialData={editingPayment}
                        valorTotal={
                            Math.max(0, (osItems.reduce((acc, item) => acc + Number(item.valor_total), 0) + Number(selectedOsForItems.valor_mao_de_obra || 0)) -
                            (selectedOsForItems.pagamentos_cliente?.reduce((acc, p) => acc + Number(p.valor), 0) || 0))
                        }
                        onSuccess={() => {
                            setShowPaymentModal(false);
                            setStatusMsg({ type: 'success', text: editingPayment ? 'Pagamento atualizado!' : 'Pagamento registrado com sucesso!' });
                            handleManageItems(selectedOsForItems);
                        }}
                        onCancel={() => setShowPaymentModal(false)}
                    />
                </Modal>
            )}

            {/* Confirmation Modal - Rendered Last for Z-Index */}
            {confirmModal.isOpen && (
                <Modal 
                    title={confirmModal.title} 
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                    <div className="space-y-6">
                        <p className="text-neutral-600 font-medium">{confirmModal.message}</p>
                        <div className="flex justify-end gap-3 pt-2">
                             <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="fixed bottom-8 right-8 z-100 min-w-[320px]">
                <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />
            </div>
        </div>
    );
};
