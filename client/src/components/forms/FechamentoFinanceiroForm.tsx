import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../services/api';
import { Calculator, Save, Truck, Plus, BadgeCheck, Palette, Trash2 } from 'lucide-react';
import { FornecedorForm } from './FornecedorForm';
import { Modal } from '../ui/Modal';
import { StatusBanner } from '../ui/StatusBanner';
import { Button } from '../ui/Button';

interface FechamentoFinanceiroFormProps {
    preSelectedOsId?: number | null;
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

interface ItemOS {
    id_iten: number;
    valor_total: number;
    descricao: string;
    quantidade: number;
    codigo_referencia?: string;
    pecas_estoque?: {
        valor_custo: number;
        nome: string;
    };
    pagamentos_peca?: {
        id_pagamento_peca: number;
        id_fornecedor: number;
        custo_real: number;
        pago_ao_fornecedor: boolean;
    }[];
}

interface IFornecedor {
    id_fornecedor: number;
    nome: string;
}

interface ItemFinanceiroState {
    id_pagamento_peca?: number; // ID se já existir
    id_fornecedor: string;
    custo_real: string;
    pago_fornecedor: boolean;
}

interface OSData {
    id_os: number;
    status: string;
    valor_total_cliente: number;
    valor_mao_de_obra: number;
    valor_pecas: number; 
    itens_os: ItemOS[];
    cliente: {
        pessoa_fisica?: { pessoa: { nome: string } };
        pessoa_juridica?: { nome_fantasia: string };
    };
    veiculo: {
        placa: string;
        modelo: string;
        cor: string;
    };
    fechamento_financeiro?: {
        id_fechamento_financeiro: number;
    };
}

export const FechamentoFinanceiroForm = ({ preSelectedOsId, onSuccess, onCancel }: FechamentoFinanceiroFormProps) => {
    const [loading, setLoading] = useState(false);
    const [fetchingOs, setFetchingOs] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    
    const [idOs, setIdOs] = useState(preSelectedOsId ? String(preSelectedOsId) : '');
    const [osData, setOsData] = useState<OSData | null>(null);
    const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);
    
    const [itemsState, setItemsState] = useState<Record<number, ItemFinanceiroState>>({});
    const [showFornecedorModal, setShowFornecedorModal] = useState(false);
    const [editItem, setEditItem] = useState<ItemOS | null>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    useEffect(() => {
        loadFornecedores();
        if (preSelectedOsId) {
            fetchOsData(preSelectedOsId);
        }
    }, [preSelectedOsId]);

    const loadFornecedores = async () => {
        try {
            const response = await api.get('/fornecedor');
            setFornecedores(response.data);
        } catch (error) {
            console.error("Erro ao carregar fornecedores");
        }
    };

    const fetchOsData = async (id: number) => {
        setFetchingOs(true);
        setStatusMsg({ type: null, text: '' });
        try {
            const response = await api.get(`/ordem-de-servico/${id}`);
            const os: OSData = response.data;
            setOsData(os);

            const initialItemsState: Record<number, ItemFinanceiroState> = {};
            os.itens_os.forEach(item => {
                const existingPayment = item.pagamentos_peca && item.pagamentos_peca.length > 0 ? item.pagamentos_peca[0] : null;

                const initialCost = existingPayment 
                    ? String(existingPayment.custo_real)
                    : item.pecas_estoque?.valor_custo 
                        ? (Number(item.pecas_estoque.valor_custo) * item.quantidade).toFixed(2) 
                        : '';
                
                initialItemsState[item.id_iten] = {
                    id_pagamento_peca: existingPayment?.id_pagamento_peca,
                    id_fornecedor: existingPayment ? String(existingPayment.id_fornecedor) : '', 
                    custo_real: initialCost,
                    pago_fornecedor: existingPayment ? existingPayment.pago_ao_fornecedor : false
                };
            });
            setItemsState(initialItemsState);

        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'OS não encontrada ou erro ao buscar dados.' });
        } finally {
            setFetchingOs(false);
        }
    };

    const handleSearchOs = () => {
        if (!idOs) return;
        fetchOsData(Number(idOs));
    };

    const handleItemChange = (id_iten: number, field: keyof ItemFinanceiroState, value: any) => {
        setItemsState(prev => ({
            ...prev,
            [id_iten]: {
                ...prev[id_iten],
                [field]: value
            }
        }));
    };

    const handleUpdateLabor = async (value: string) => {
        if (!osData) return;
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) return;

        setOsData({...osData, valor_mao_de_obra: numValue}); // Update local state immediately for UI
        
        try {
            await api.put(`/ordem-de-servico/${osData.id_os}`, { valor_mao_de_obra: numValue });
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar Mão de Obra.' });
        }
    };

    // ITEM EDITING
    const handleSaveItemEdit = async (e: FormEvent) => {
        e.preventDefault();
        if (!editItem || !osData) return;

        try {
             const valorTotal = Number(editItem.quantidade) * Number((editItem as any).valor_venda_unitario);

             await api.put(`/itens-os/${editItem.id_iten}`, {
                 descricao: editItem.descricao,
                 quantidade: Number(editItem.quantidade),
                 valor_venda: Number((editItem as any).valor_venda_unitario),
                 valor_total: valorTotal,
                 codigo_referencia: editItem.codigo_referencia
             });

             // Refresh Data
             fetchOsData(osData.id_os);
             setEditItem(null);
             setStatusMsg({ type: 'success', text: 'Item atualizado!' });
             setTimeout(() => setStatusMsg({ type: null, text: '' }), 2000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar item.' });
        }
    };

    const handleDeleteItemOS = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Item',
            message: 'Tem certeza que deseja remover este item da OS?',
            onConfirm: async () => {
                try {
                    await api.delete(`/itens-os/${id}`);
                    setStatusMsg({ type: 'success', text: 'Item removido com sucesso!' });
                    if (osData) fetchOsData(osData.id_os);
                } catch (error) {
                    setStatusMsg({ type: 'error', text: 'Erro ao remover item.' });
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const calculateTotals = () => {
        if (!osData) return { totalReceita: 0, totalCusto: 0, lucro: 0, margem: 0 };
        
        // Recalculate total revenue based on items + labor (since items might have changed)
        const totalItemsRevenue = osData.itens_os.reduce((acc, item) => acc + Number(item.valor_total), 0);
        const totalReceita = totalItemsRevenue + Number(osData.valor_mao_de_obra || 0);

        let totalCusto = 0;
        Object.values(itemsState).forEach(st => {
            totalCusto += Number(st.custo_real || 0);
        });

        const lucro = totalReceita - totalCusto;
        const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

        return { totalReceita, totalCusto, lucro, margem, totalItemsRevenue };
    };

    const { totalReceita, totalCusto, lucro, totalItemsRevenue } = calculateTotals();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (!osData) return;

        try {
            // 1. Processar Pagamentos (Upsert)
            const pagamentoPromises = osData.itens_os.map(async (item) => {
                const st = itemsState[item.id_iten];
                if (st && st.id_fornecedor && Number(st.custo_real) > 0) {
                    const payload = {
                        id_item_os: item.id_iten,
                        id_fornecedor: Number(st.id_fornecedor),
                        custo_real: Number(st.custo_real),
                        data_compra: new Date().toISOString(),
                        pago_ao_fornecedor: st.pago_fornecedor
                    };

                    if (st.id_pagamento_peca) {
                         return api.put(`/pagamento-peca/${st.id_pagamento_peca}`, payload);
                    } else {
                         return api.post('/pagamento-peca', payload);
                    }
                }
                return null;
            });

            await Promise.all(pagamentoPromises);

            // 2. Salvar Fechamento (Upsert)
            const fechamentoPayload = {
                id_os: Number(idOs),
                custo_total_pecas_real: totalCusto
            };

            let response;
            if (osData.fechamento_financeiro) {
                 response = await api.put(`/fechamento-financeiro/${osData.fechamento_financeiro.id_fechamento_financeiro}`, fechamentoPayload);
            } else {
                 response = await api.post('/fechamento-financeiro', fechamentoPayload);
            }
            
            if (osData.status !== 'FINALIZADA') {
                 try {
                      await api.put(`/ordem-de-servico/${idOs}`, { 
                          status: 'FINALIZADA',
                          valor_final: totalReceita,
                          valor_pecas: totalItemsRevenue
                        });
                 } catch (err) { }
            }

            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao processar fechamento financeiro.' });
        } finally {
            setLoading(false);
        }
    };

    const getClientName = () => osData?.cliente?.pessoa_fisica?.pessoa?.nome || osData?.cliente?.pessoa_juridica?.nome_fantasia || 'Cliente';

    return (
        <form onSubmit={handleSubmit} className="space-y-6 relative">
             <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

             <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 border border-gray-100 flex gap-3">
                <Calculator className="text-gray-400 shrink-0" />
                <div>
                    <strong className="block text-gray-900 mb-1">Consolidação Financeira</strong> 
                    {osData?.fechamento_financeiro ? 'Edite os custos lançados anteriormente.' : 'Lance os custos reais de cada peça para calcular o lucro exato desta OS.'}
                </div>
            </div>

            {!preSelectedOsId && (
                <div className="flex gap-2">
                    <input 
                        type="number"
                        value={idOs} 
                        onChange={e => setIdOs(e.target.value)} 
                        className="flex-1 border-2 border-gray-100 p-3 rounded-xl focus:border-gray-900 focus:outline-none transition-colors font-bold" 
                        required 
                        placeholder="Digite o ID da OS..."
                    />
                    <button 
                        type="button" 
                        onClick={handleSearchOs}
                        className="bg-gray-900 text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Buscar OS
                    </button>
                </div>
            )}

            {fetchingOs && <div className="text-center p-4 text-gray-500">Carregando dados da OS...</div>}

            {osData && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* OS Summary Card */}
                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-100 text-gray-600">OS #{osData.id_os}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-100 text-green-700">{osData.status}</span>
                            </div>
                            <h3 className="font-extrabold text-lg text-gray-900">{getClientName()}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium mt-1">
                                <div className="flex items-center gap-1">
                                    <Truck size={14} />
                                    {osData.veiculo.modelo} - {osData.veiculo.placa}
                                </div>
                                {osData.veiculo.cor && (
                                    <div className="flex items-center gap-1">
                                        <Palette size={14} />
                                        <span className="capitalize">{osData.veiculo.cor}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase">Receita Total</p>
                            <p className="text-2xl font-black text-green-600">
                                R$ {Number(totalReceita).toFixed(2)}
                            </p>
                            <div className="flex items-center justify-end gap-2 mt-1">
                                <span className="text-xs text-gray-400 font-medium">Mão de Obra: R$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={osData.valor_mao_de_obra}
                                    onChange={(e) => handleUpdateLabor(e.target.value)}
                                    className="w-24 p-1 text-right text-sm font-bold border-b border-gray-300 focus:border-green-500 outline-none bg-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">Detalhamento de Custos (Peças)</h4>
                            <button 
                                type="button"
                                onClick={() => setShowFornecedorModal(true)}
                                className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                <Plus size={12} /> Novo Fornecedor
                            </button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-xs font-bold text-gray-400 uppercase">
                                <tr>
                                    <th className="p-4 w-1/3">Item / Peça</th>
                                    <th className="p-4">Ref / Nota</th>
                                    <th className="p-4">Fornecedor (Origem)</th>
                                    <th className="p-4 w-32">Custo Real (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {osData.itens_os.map(item => (
                                    <tr key={item.id_iten} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4 relative">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{item.descricao}</p>
                                                    <p className="text-xs text-gray-400">
                                                        Qtd: {item.quantidade} x R$ {Number(Number(item.valor_total) / item.quantidade).toFixed(2)} = <span className="text-green-600 font-bold">R$ {Number(item.valor_total).toFixed(2)}</span>
                                                    </p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setEditItem({...item, valor_venda_unitario: Number(item.valor_total) / item.quantidade} as any)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
                                                    title="Editar Item"
                                                >
                                                    <BadgeCheck size={16} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteItemOS(item.id_iten)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                                                    title="Excluir Item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-mono font-bold text-gray-500">
                                            {item.codigo_referencia || '-'}
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                value={itemsState[item.id_iten]?.id_fornecedor || ''}
                                                onChange={e => handleItemChange(item.id_iten, 'id_fornecedor', e.target.value)}
                                            >
                                                <option value="">-- Selecione --</option>
                                                {fornecedores.map(f => (
                                                    <option key={f.id_fornecedor} value={f.id_fornecedor}>{f.nome}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={itemsState[item.id_iten]?.custo_real}
                                                    onChange={e => handleItemChange(item.id_iten, 'custo_real', e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {osData.itens_os.length === 0 && (
                            <div className="p-8 text-center text-gray-400 font-medium">Nenhum item lançado nesta OS.</div>
                        )}
                    </div>

                    {/* LIVE FOOTER TOTALS */}
                    <div className={`p-6 rounded-2xl border-2 transition-colors ${lucro >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div>
                                <p className="text-xs font-bold uppercase text-gray-500 mb-1">Custo Total (Peças)</p>
                                <p className="text-3xl font-black text-gray-900">R$ {totalCusto.toFixed(2)}</p>
                            </div>
                            
                            <div className="md:text-center">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-1">Mão de Obra Total</p>
                                <p className="text-3xl font-black text-blue-600">
                                    R$ {Number(osData.valor_mao_de_obra || 0).toFixed(2)}
                                </p>
                            </div>

                            <div className="md:text-right">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-1">Valor Final (OS)</p>
                                <p className="text-4xl font-black text-green-600">
                                    R$ {totalReceita.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <Button 
                            type="submit" 
                            isLoading={loading}
                            variant="success"
                            className="flex-1 py-4 shadow-xl shadow-green-200"
                        >
                            <Save size={18} /> {osData.fechamento_financeiro ? 'Atualizar Dados' : 'Confirmar & Fechar OS'}
                        </Button>
                    </div>
                </div>
            )}

            {showFornecedorModal && (
                <Modal title="Novo Fornecedor" onClose={() => setShowFornecedorModal(false)}>
                    <FornecedorForm 
                        onSuccess={() => {
                             setShowFornecedorModal(false);
                             loadFornecedores(); 
                        }}
                        onCancel={() => setShowFornecedorModal(false)}
                    />
                </Modal>
            )}

             {editItem && (
                <Modal title="Editar Item da OS" onClose={() => setEditItem(null)}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                            <input 
                                value={editItem.descricao}
                                onChange={e => setEditItem({...editItem, descricao: e.target.value})}
                                className="w-full border p-3 rounded-xl font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Ref / Nota</label>
                            <input 
                                value={editItem.codigo_referencia || ''}
                                onChange={e => setEditItem({...editItem, codigo_referencia: e.target.value})}
                                className="w-full border p-3 rounded-xl font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Quantidade</label>
                                <input 
                                    type="number"
                                    value={editItem.quantidade}
                                    onChange={e => setEditItem({...editItem, quantidade: Number(e.target.value)})}
                                    className="w-full border p-3 rounded-xl font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Valor Unitário (Venda)</label>
                                <input 
                                    type="number" step="0.01"
                                    value={(editItem as any).valor_venda_unitario}
                                    onChange={e => setEditItem({...editItem, valor_venda_unitario: e.target.value} as any)}
                                    className="w-full border p-3 rounded-xl font-bold"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                             <button onClick={() => setEditItem(null)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                             <button onClick={handleSaveItemEdit} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold">Salvar Alterações</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <Modal 
                    title={confirmModal.title} 
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                     <div className="space-y-6">
                        <p className="text-neutral-600 font-medium">{confirmModal.message}</p>
                        <div className="flex justify-end gap-3 pt-2">
                             <button
                                type="button"
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.onConfirm}
                                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </form>
    );
};
