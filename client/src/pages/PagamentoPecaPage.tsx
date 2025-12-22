import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { 
    Search, Truck, Calendar, CheckSquare, Square, 
    Edit, Filter, Trash2
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';

export const PagamentoPecaPage = () => {
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    const [loading, setLoading] = useState(false);

    // --- STATES FOR ACCOUNTS PAYABLE (PEÇAS) ---
    const [payments, setPayments] = useState<any[]>([]);
    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterPlate, setFilterPlate] = useState('');
    const [filterStatus, setFilterStatus] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');

    const [editPayment, setEditPayment] = useState<any | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [paymentsRes, fornecedoresRes] = await Promise.all([
                api.get('/pagamento-peca'),
                api.get('/fornecedor')
            ]);
            setPayments(paymentsRes.data);
            setFornecedores(fornecedoresRes.data);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar dados financeiros.' });
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePayment = async (paymentId: number, currentStatus: boolean) => {
        try {
            setLoading(true);
            await api.put(`/pagamento-peca/${paymentId}`, {
                pago_ao_fornecedor: !currentStatus,
                data_pagamento_fornecedor: !currentStatus ? new Date() : null
            });
            setStatusMsg({ type: 'success', text: !currentStatus ? 'Pagamento marcado como realizado!' : 'Pagamento reaberto.' });
            loadData(); 
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar status do pagamento.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePayment = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Pagamento',
            message: 'Tem certeza que deseja excluir este registro de conta a pagar? Esta ação é irreversível.',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await api.delete(`/pagamento-peca/${id}`);
                    setStatusMsg({ type: 'success', text: 'Pagamento excluído com sucesso!' });
                    loadData();
                } catch (error) {
                    setStatusMsg({ type: 'error', text: 'Erro ao excluir pagamento.' });
                } finally {
                    setLoading(false);
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                }
            }
        });
    };

    const handleUpdatePayment = async () => {
        if (!editPayment) return;
        try {
            setLoading(true);
            await api.put(`/pagamento-peca/${editPayment.id_pagamento_peca}`, {
                custo_real: Number(editPayment.custo_real),
                id_fornecedor: Number(editPayment.id_fornecedor),
                data_compra: new Date(editPayment.data_compra),
                data_pagamento_fornecedor: editPayment.data_pagamento_fornecedor ? new Date(editPayment.data_pagamento_fornecedor) : null,
                pago_ao_fornecedor: editPayment.pago_ao_fornecedor
            });
            
            if (editPayment.item_os && editPayment.ref_nota) {
                 await api.put(`/itens-os/${editPayment.item_os.id_iten}`, {
                     codigo_referencia: editPayment.ref_nota
                 });
            }

            setStatusMsg({ type: 'success', text: 'Dados atualizados com sucesso!' });
            loadData();
            setShowEditModal(false);
            setEditPayment(null);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar pagamento.' });
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (payment: any) => {
        setEditPayment({
            ...payment,
            data_compra: new Date(payment.data_compra).toISOString().split('T')[0],
            data_pagamento_fornecedor: payment.data_pagamento_fornecedor ? new Date(payment.data_pagamento_fornecedor).toISOString().split('T')[0] : '',
            ref_nota: payment.item_os?.codigo_referencia || ''
        });
        setShowEditModal(true);
    };

    const filteredPayments = payments.filter(p => {
        if (filterStatus === 'PENDING' && p.pago_ao_fornecedor) return false;
        if (filterStatus === 'PAID' && !p.pago_ao_fornecedor) return false;
        
        if (filterStart) {
            const start = new Date(filterStart);
            const date = new Date(p.data_compra);
            if (date < start) return false;
        }
        if (filterEnd) {
            const end = new Date(filterEnd);
            end.setHours(23, 59, 59, 999);
            const date = new Date(p.data_compra);
            if (date > end) return false;
        }

        const supplierMatch = filterSupplier ? String(p.id_fornecedor) === filterSupplier : true;
        const plateMatch = filterPlate ? p.item_os?.ordem_de_servico?.veiculo?.placa?.toLowerCase().includes(filterPlate.toLowerCase()) : true;
        
        return supplierMatch && plateMatch;
    }).sort((a,b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime());

    const totalPending = filteredPayments.filter(p => !p.pago_ao_fornecedor).reduce((acc, p) => acc + Number(p.custo_real), 0);
    const totalPaid = filteredPayments.filter(p => p.pago_ao_fornecedor).reduce((acc, p) => acc + Number(p.custo_real), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Pagamento de Auto Peças</h1>
                    <p className="text-neutral-500">Controle de pagamento de peças para fornecedores.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Status</label>
                        <div className="flex bg-neutral-100 rounded-xl p-1 gap-2">
                            <button onClick={() => setFilterStatus('PENDING')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterStatus === 'PENDING' ? 'bg-white shadow text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>PENDENTES</button>
                            <button onClick={() => setFilterStatus('PAID')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterStatus === 'PAID' ? 'bg-white shadow text-green-600' : 'text-neutral-400 hover:text-neutral-600'}`}>PAGAS</button>
                            <button onClick={() => setFilterStatus('ALL')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>TODAS</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Fornecedor</label>
                        <select 
                            value={filterSupplier}
                            onChange={(e) => setFilterSupplier(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400 transition-colors"
                        >
                            <option value="">Todos</option>
                            {fornecedores.map(f => (
                                <option key={f.id_fornecedor} value={f.id_fornecedor}>{f.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Buscar por Placa</label>
                            <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                            <input 
                                value={filterPlate}
                                onChange={(e) => setFilterPlate(e.target.value)}
                                placeholder="Digite a placa do veículo da OS..."
                                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:border-neutral-400 transition-colors uppercase"
                            />
                            </div>
                    </div>
                    <div className="md:col-span-4 grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                            <div className="col-span-2 flex items-center gap-2 mb-2">
                            <Filter size={16} className="text-neutral-500" />
                            <span className="text-xs font-black text-neutral-500 uppercase">Filtrar por Período de Compra</span>
                            </div>
                            <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">De</label>
                            <input 
                                type="date" 
                                value={filterStart} 
                                onChange={e => setFilterStart(e.target.value)} 
                                className="w-full bg-white border border-neutral-200 p-2 rounded-lg font-bold text-sm outline-none focus:border-neutral-400 transition-colors uppercase"
                            />
                            </div>
                            <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Até</label>
                            <input 
                                type="date" 
                                value={filterEnd} 
                                onChange={e => setFilterEnd(e.target.value)} 
                                className="w-full bg-white border border-neutral-200 p-2 rounded-lg font-bold text-sm outline-none focus:border-neutral-400 transition-colors uppercase"
                            />
                            </div>
                    </div>
                </div>

                {/* Totals Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Total Pendente (Selecionado)</p>
                            <p className="text-2xl font-black text-red-600">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl text-red-200"><Square size={24} /></div>
                    </div>
                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Total Pago (Selecionado)</p>
                            <p className="text-2xl font-black text-green-600">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl text-green-200"><CheckSquare size={24} /></div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                <th className="p-5">Data Compra</th>
                                <th className="p-5">Ref / Nota</th>
                                <th className="p-5">Peça</th>
                                <th className="p-5">Fornecedor</th>
                                <th className="p-5">Veículo / OS</th>
                                <th className="p-5 text-right w-32">Valor Custo</th>
                                <th className="p-5 text-center w-24">Pago?</th>
                                <th className="p-5 text-center w-16">Editar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredPayments.length === 0 ? (
                                    <tr><td colSpan={7} className="p-10 text-center text-neutral-400 italic font-medium">Nenhum registro encontrado.</td></tr>
                            ) : (
                                filteredPayments.map(p => (
                                    <tr key={p.id_pagamento_peca} className={`hover:bg-neutral-25 transition-colors ${p.pago_ao_fornecedor ? 'opacity-75' : ''}`}>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2 font-bold text-neutral-600 text-xs">
                                                <Calendar size={14} />
                                                {new Date(p.data_compra).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="font-mono text-xs font-black text-neutral-600 bg-neutral-100 px-2 py-1 rounded w-fit">
                                                {p.item_os?.codigo_referencia || '---'}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-bold text-neutral-900 text-sm">{p.item_os?.descricao}</p>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <Truck size={14} className="text-orange-500" />
                                                <span className="font-bold text-neutral-700 text-xs uppercase">{p.fornecedor?.nome}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div>
                                                <p className="font-black text-neutral-800 text-xs uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded w-fit">
                                                    {p.item_os?.ordem_de_servico?.veiculo?.placa || 'N/A'}
                                                </p>
                                                <p className="text-[10px] text-neutral-400 font-bold mt-1">OS #{String(p.item_os?.id_os).padStart(4, '0')}</p>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right font-black text-neutral-900">
                                            R$ {Number(p.custo_real).toFixed(2)}
                                        </td>
                                        <td className="p-5 text-center">
                                            <button 
                                                onClick={() => handleTogglePayment(p.id_pagamento_peca, p.pago_ao_fornecedor)}
                                                className="hover:scale-110 transition-transform active:scale-95 text-neutral-400 hover:text-neutral-600"
                                                title={p.pago_ao_fornecedor ? "Desmarcar como pago" : "Marcar como pago"}
                                            >
                                                {p.pago_ao_fornecedor ? (
                                                    <CheckSquare size={32} className="text-green-500 fill-green-500/20" />
                                                ) : (
                                                    <Square size={32} className="text-neutral-300 stroke-[2.5]" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => openEditModal(p)}
                                                    className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar Detalhes"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePayment(p.id_pagamento_peca)}
                                                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir Pagamento"
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
            
            {showEditModal && editPayment && (
                <Modal title="Editar Pagamento (Peça)" onClose={() => setShowEditModal(false)}>
                    <div className="space-y-6">
                        <div className="bg-neutral-50 p-4 rounded-xl mb-4">
                            <p className="text-xs font-bold text-neutral-400 uppercase">Item da OS</p>
                            <p className="font-bold text-neutral-800">{editPayment.item_os?.descricao}</p>
                            <div className="mt-2">
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-1 block">Ref / Nota</label>
                                <input 
                                    value={editPayment.ref_nota || ''}
                                    onChange={e => setEditPayment({...editPayment, ref_nota: e.target.value})}
                                    className="w-full bg-white border border-neutral-200 p-2 rounded-lg font-bold text-sm outline-none focus:border-neutral-400"
                                    placeholder="Número da Nota / Referência"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Data Compra</label>
                                <input 
                                    type="date"
                                    value={editPayment.data_compra}
                                    onChange={e => setEditPayment({...editPayment, data_compra: e.target.value})}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Data Pagamento</label>
                                <input 
                                    type="date"
                                    value={editPayment.data_pagamento_fornecedor || ''}
                                    onChange={e => setEditPayment({...editPayment, data_pagamento_fornecedor: e.target.value})}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                                <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Custo Real (R$)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={editPayment.custo_real}
                                    onChange={e => setEditPayment({...editPayment, custo_real: e.target.value})}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Fornecedor</label>
                                <select 
                                    value={editPayment.id_fornecedor}
                                    onChange={(e) => setEditPayment({...editPayment, id_fornecedor: e.target.value})}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
                                >
                                    {fornecedores.map(f => (
                                        <option key={f.id_fornecedor} value={f.id_fornecedor}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-neutral-100">
                                <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 py-3 text-neutral-500 font-bold hover:bg-neutral-50 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdatePayment}
                                className="flex-1 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition-colors shadow-lg"
                            >
                                Salvar Alterações
                            </button>
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
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
