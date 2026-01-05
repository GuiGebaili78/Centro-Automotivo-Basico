import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { Modal } from '../components/ui/Modal';
import { 
    Plus, Calendar, CheckCircle, Search, Trash2, Edit
} from 'lucide-react';

export const ContasAPagarPage = () => {
    const [contas, setContas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    
    // Filters
    const [filterStatus, setFilterStatus] = useState('TODOS'); // TODOS, PENDENTE, PAGO
    const [searchTerm, setSearchTerm] = useState('');

    // Date Filters
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');

    // Modal & Form
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        dt_vencimento: '',
        dt_pagamento: '',
        status: 'PENDENTE',
        categoria: 'OUTROS',
        obs: ''
    });

    useEffect(() => {
        loadContas();
    }, []);

    const loadContas = async () => {
        try {
            setLoading(true);
            const res = await api.get('/contas-pagar');
            setContas(res.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar contas.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                valor: Number(formData.valor),
                // Enforce NULL payment date if status is not PAGO
                dt_pagamento: formData.status === 'PAGO' 
                    ? (formData.dt_pagamento ? new Date(formData.dt_pagamento).toISOString() : new Date().toISOString()) 
                    : null,
                dt_vencimento: new Date(formData.dt_vencimento).toISOString()
            };

            if (editingId) {
                await api.put(`/contas-pagar/${editingId}`, payload);
                setStatusMsg({ type: 'success', text: 'Conta atualizada com sucesso!' });
            } else {
                await api.post('/contas-pagar', payload);
                setStatusMsg({ type: 'success', text: 'Conta lançada com sucesso!' });
            }
            setModalOpen(false);
            resetForm();
            loadContas();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao salvar conta.' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
        try {
            await api.delete(`/contas-pagar/${id}`);
            setStatusMsg({ type: 'success', text: 'Conta excluída.' });
            loadContas();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao excluir conta.' });
        }
    };

    const handleQuickPay = async (conta: any) => {
        try {
            await api.put(`/contas-pagar/${conta.id_conta_pagar}`, {
                status: 'PAGO',
                dt_pagamento: new Date().toISOString()
            });
            setStatusMsg({ type: 'success', text: 'Conta marcada como PAGA.' });
            loadContas();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar pagamento.' });
        }
    };

    const handleEdit = (conta: any) => {
        setEditingId(conta.id_conta_pagar);
        setFormData({
            descricao: conta.descricao,
            valor: Number(conta.valor).toFixed(2),
            dt_vencimento: conta.dt_vencimento ? new Date(conta.dt_vencimento).toISOString().split('T')[0] : '',
            dt_pagamento: conta.dt_pagamento ? new Date(conta.dt_pagamento).toISOString().split('T')[0] : '',
            status: conta.status,
            categoria: conta.categoria || 'OUTROS',
            obs: conta.obs || ''
        });
        setModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            descricao: '',
            valor: '',
            dt_vencimento: new Date().toISOString().split('T')[0],
            dt_pagamento: '',
            status: 'PENDENTE',
            categoria: 'OUTROS',
            obs: ''
        });
    };

    const openNewModal = () => {
        resetForm();
        setModalOpen(true);
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

    // Calculations
    const filteredContas = contas.filter(c => {
        // Date Filter (Vencimento)
        if (filterStart) {
            // Compare Date Strings YYYY-MM-DD
            if (c.dt_vencimento < filterStart) return false;
        }
        if (filterEnd) {
             // For end date, we need to ensure match includes the day. 
             // c.dt_vencimento is ISO string potentially with time or T00:00.
             // Best to take YYYY-MM-DD part and compare strings.
             const vencC = c.dt_vencimento.split('T')[0];
             if (vencC > filterEnd) return false;
        }

        if (filterStatus !== 'TODOS' && c.status !== filterStatus) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return c.descricao.toLowerCase().includes(term) || c.categoria?.toLowerCase().includes(term);
        }
        return true;
    });

    const totalPending = contas.filter(c => c.status === 'PENDENTE').reduce((acc, c) => acc + Number(c.valor), 0);
    const totalPaidMonth = contas.filter(c => {
        if (c.status !== 'PAGO' || !c.dt_pagamento) return false;
        const d = new Date(c.dt_pagamento);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, c) => acc + Number(c.valor), 0);

    const categories = ['AGUA', 'LUZ', 'ALUGUEL', 'INTERNET', 'CONTADOR', 'SALARIO', 'MANUTENCAO', 'OUTROS'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Contas a Pagar (Geral)</h1>
                    <p className="text-neutral-500">Gerência de despesas operacionais da oficina.</p>
                </div>
                <button 
                    onClick={openNewModal}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5"
                >
                    <Plus size={20} /> Nova Conta
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
                     <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Total Pendente</p>
                     <p className="text-3xl font-black text-red-600">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="bg-success-50 border border-success-100 p-6 rounded-2xl">
                     <p className="text-xs font-black text-success-400 uppercase tracking-widest mb-1">Pago este Mês</p>
                     <p className="text-3xl font-black text-success-600">R$ {totalPaidMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-end gap-4">
                     <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative w-full md:w-64">
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                <input 
                                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm focus:border-primary-500 outline-none"
                                    placeholder="Descrição..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Date Inputs */}
                        <div className="flex gap-2">
                             <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Venc. De</label>
                                <input 
                                    type="date" 
                                    value={filterStart}
                                    onChange={e => setFilterStart(e.target.value)}
                                    className="px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600 focus:bg-white outline-none focus:border-primary-500 uppercase h-[42px]"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Até</label>
                                <input 
                                    type="date" 
                                    value={filterEnd}
                                    onChange={e => setFilterEnd(e.target.value)}
                                    className="px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600 focus:bg-white outline-none focus:border-primary-500 uppercase h-[42px]"
                                />
                             </div>
                        </div>
                     </div>

                     <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto items-end">
                        {/* Quick Filters */}
                        <div>
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block lg:hidden">Período</label>
                            <div className="flex bg-neutral-100 p-1.5 rounded-xl h-[42px] items-center">
                                <button onClick={() => applyQuickFilter('TODAY')} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm text-neutral-500 hover:text-neutral-900 transition-all">Hoje</button>
                                <button onClick={() => applyQuickFilter('WEEK')} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm text-neutral-500 hover:text-neutral-900 transition-all">Semana</button>
                                <button onClick={() => applyQuickFilter('MONTH')} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm text-neutral-500 hover:text-neutral-900 transition-all">Mês</button>
                            </div>
                        </div>

                        {/* Status Type */}
                         <div>
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block lg:hidden">Status</label>
                            <div className="flex bg-neutral-100 p-1.5 rounded-xl h-[42px] items-center">
                                {['TODOS', 'PENDENTE', 'PAGO'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setFilterStatus(s)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-colors ${filterStatus === s ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Vencimento</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Descrição / Categoria</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Obs</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Valor</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Status</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-neutral-400">Carregando...</td></tr>
                        ) : filteredContas.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-neutral-400 italic">Nenhuma conta encontrada.</td></tr>
                        ) : (
                            filteredContas.map(conta => (
                                <tr key={conta.id_conta_pagar} className="hover:bg-neutral-25 group">
                                    <td className="p-4">
                                        <div className="font-bold text-neutral-700 text-sm flex items-center gap-2">
                                            <Calendar size={14} className="text-neutral-400" />
                                            {/* Fix Timezone Display: Use UTC to calculate date */}
                                            {new Date(conta.dt_vencimento).getUTCDate().toString().padStart(2, '0')}/{ (new Date(conta.dt_vencimento).getUTCMonth() + 1).toString().padStart(2, '0') }/{ new Date(conta.dt_vencimento).getUTCFullYear() }
                                        </div>
                                        {conta.dt_pagamento && conta.status === 'PAGO' && (
                                            <div className="text-[10px] text-success-600 font-bold mt-1">
                                                Pago em {new Date(conta.dt_pagamento).getUTCDate().toString().padStart(2, '0')}/{ (new Date(conta.dt_pagamento).getUTCMonth() + 1).toString().padStart(2, '0') }
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-neutral-900">{conta.descricao}</div>
                                        <div className="text-[10px] font-bold text-neutral-400 uppercase bg-neutral-100 px-2 py-0.5 rounded w-fit mt-1">
                                            {conta.categoria}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-neutral-500 max-w-[200px] truncate">
                                        {conta.obs || '-'}
                                    </td>
                                    <td className="p-4 text-right font-black text-neutral-800">
                                        R$ {Number(conta.valor).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                            conta.status === 'PAGO' ? 'bg-success-100 text-success-700' : 
                                            // Check overdue
                                            (new Date(conta.dt_vencimento) < new Date() && conta.status !== 'PAGO') ? 'bg-red-100 text-red-600' : 'bg-warning-100 text-warning-700'
                                        }`}>
                                            {conta.status === 'PAGO' ? 'PAGO' : 
                                             (new Date(conta.dt_vencimento) < new Date() && conta.status !== 'PAGO') ? 'ATRASADO' : 'PENDENTE'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {conta.status !== 'PAGO' && (
                                                <button onClick={() => handleQuickPay(conta)} className="p-2 bg-success-50 text-success-600 rounded-lg hover:bg-success-100" title="Marcar como Pago">
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(conta)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(conta.id_conta_pagar)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {modalOpen && (
                <Modal 
                    title={editingId ? 'Editar Conta' : 'Nova Conta a Pagar'} 
                    onClose={() => setModalOpen(false)}
                    className="max-w-xl"
                >
                    <form onSubmit={handleSave} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Descrição</label>
                                <input 
                                    required
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                                    value={formData.descricao}
                                    onChange={e => setFormData({...formData, descricao: e.target.value})}
                                    placeholder="Ex: Conta de Luz"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Categoria</label>
                                <select 
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                                    value={formData.categoria}
                                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Valor</label>
                                <input 
                                    type="number" step="0.01" required
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                                    value={formData.valor}
                                    onChange={e => setFormData({...formData, valor: e.target.value})}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Status</label>
                                <select 
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="PENDENTE">Pendente</option>
                                    <option value="PAGO">Pago</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Vencimento</label>
                                <input 
                                    type="date" required
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                                    value={formData.dt_vencimento}
                                    onChange={e => setFormData({...formData, dt_vencimento: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Pagamento (Opcional)</label>
                                <input 
                                    type="date"
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm"
                                    value={formData.dt_pagamento}
                                    disabled={formData.status !== 'PAGO'}
                                    onChange={e => setFormData({...formData, dt_pagamento: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Observações</label>
                            <textarea 
                                className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-medium text-sm h-20 resize-none"
                                value={formData.obs}
                                onChange={e => setFormData({...formData, obs: e.target.value})}
                            />
                        </div>

                        <button className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 mt-2">
                            Salvar Conta
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};
