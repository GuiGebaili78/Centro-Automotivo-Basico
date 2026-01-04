import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { 
    Calendar, ArrowUpCircle, ArrowDownCircle, Wallet, Plus, Search
} from 'lucide-react';

export const LivroCaixaPage = () => {
    const [cashBookEntries, setCashBookEntries] = useState<any[]>([]);
    const [cashFilterStart, setCashFilterStart] = useState(new Date().toLocaleDateString('en-CA'));
    const [cashFilterEnd, setCashFilterEnd] = useState(new Date().toLocaleDateString('en-CA'));
    const [cashSearch, setCashSearch] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    const [, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [paymentsRes, inflowsRes] = await Promise.all([
                api.get('/pagamento-peca'),
                api.get('/pagamento-cliente') 
            ]);

            // Process Cash Book
            // Map Outflows (Payments to Suppliers)
            // Process Cash Book
            // Map Outflows (Payments to Suppliers)
            const outflows = paymentsRes.data
                .filter((p: any) => p.pago_ao_fornecedor && p.data_pagamento_fornecedor) 
                .map((p: any) => {
                    const os = p.item_os?.ordem_de_servico;
                    const veh = os?.veiculo;
                    const cli = os?.cliente;
                    const clientName = cli?.pessoa_fisica?.pessoa?.nome || cli?.pessoa_juridica?.nome_fantasia || cli?.pessoa_juridica?.razao_social || 'Desconhecido';
                    const vehicleText = veh ? `${veh.placa} - ${veh.modelo} (${veh.cor})` : '';

                    return {
                        id: `out-${p.id_pagamento_peca}`,
                        rawId: p.item_os?.id_os, // for search
                        date: p.data_pagamento_fornecedor || p.data_compra,
                        description: `Pagamento Fornecedor - ${p.item_os?.descricao || 'Peça'}`,
                        type: 'OUT',
                        value: Number(p.custo_real),
                        details: `OS #${p.item_os?.id_os} - ${p.fornecedor?.nome}`,
                        vehicle: vehicleText,
                        client: clientName,
                        obs: '',
                        deleted_at: p.deleted_at
                    };
                });

            // Map Inflows (Payments from Clients)
            const inflows = (inflowsRes.data || []).map((p: any) => {
                const os = p.ordem_de_servico;
                const veh = os?.veiculo;
                const cli = os?.cliente;
                const clientName = cli?.pessoa_fisica?.pessoa?.nome || cli?.pessoa_juridica?.nome_fantasia || cli?.pessoa_juridica?.razao_social || 'Desconhecido';
                const vehicleText = veh ? `${veh.placa} - ${veh.modelo} (${veh.cor})` : '';

                return {
                    id: `in-${p.id_pagamento_cliente}`,
                    rawId: p.id_os,
                    date: p.data_pagamento,
                    description: `Recebimento OS #${p.id_os}`,
                    type: 'IN',
                    value: Number(p.valor),
                    details: `Forma: ${p.metodo_pagamento}${p.qtd_parcelas ? ` (${p.qtd_parcelas}x)` : ''}`,
                    vehicle: vehicleText,
                    client: clientName,
                    obs: p.observacao || '',
                    deleted_at: p.deleted_at
                };
            });

            const combined = [...outflows, ...inflows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setCashBookEntries(combined);

        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar dados financeiros.' });
        } finally {
            setLoading(false);
        }
    };

    // Cash Book Filters
    const filteredCashBook = cashBookEntries.filter(entry => {
        if (cashFilterStart) {
             const recordDateLocal = new Date(entry.date).toLocaleDateString('en-CA');
             if (recordDateLocal < cashFilterStart) return false;
        }
        if (cashFilterEnd) {
             const recordDateLocal = new Date(entry.date).toLocaleDateString('en-CA');
             if (recordDateLocal > cashFilterEnd) return false;
        }
        if (cashSearch) {
             const searchLower = cashSearch.toLowerCase();
             const searchableText = [
                 entry.description, 
                 entry.details, 
                 entry.vehicle,
                 entry.client,
                 `#${entry.rawId}`,
                 String(entry.value)
             ].join(' ').toLowerCase();

             if (!searchableText.includes(searchLower)) return false;
        }
        return true;
    });

    // Totals should exclude deleted items
    const totalInflow = filteredCashBook.filter(e => e.type === 'IN' && !e.deleted_at).reduce((acc, e) => acc + e.value, 0);
    const totalOutflow = filteredCashBook.filter(e => e.type === 'OUT' && !e.deleted_at).reduce((acc, e) => acc + e.value, 0);
    const balance = totalInflow - totalOutflow;

    // Helper for quick filters
    const applyQuickFilter = (type: 'TODAY' | 'WEEK' | 'MONTH') => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        if (type === 'TODAY') {
            setCashFilterStart(todayStr);
            setCashFilterEnd(todayStr);
        } else if (type === 'WEEK') {
             const weekAgo = new Date(now);
             weekAgo.setDate(now.getDate() - 7);
             setCashFilterStart(weekAgo.toISOString().split('T')[0]);
             setCashFilterEnd(todayStr);
        } else if (type === 'MONTH') {
             const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
             setCashFilterStart(firstDay.toISOString().split('T')[0]);
             setCashFilterEnd(todayStr);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Livro Caixa</h1>
                    <p className="text-neutral-500">Fluxo de caixa detalhado (Entradas e Saídas).</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Manual Entry & Filters */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Buscar Detalhes</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                <input 
                                    value={cashSearch}
                                    onChange={(e) => setCashSearch(e.target.value)}
                                    placeholder="Ex: OS 123, Pix..."
                                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:border-neutral-400 transition-colors"
                                />
                            </div>
                        </div>
                        
                        {/* Quick Filters */}
                        <div className="md:col-span-3 flex items-end gap-2">
                            <div className="grid grid-cols-2 gap-2 flex-1">
                                <div>
                                    <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">De</label>
                                    <input 
                                        type="date" 
                                        value={cashFilterStart}
                                        onChange={e => setCashFilterStart(e.target.value)}
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400 transition-colors uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Até</label>
                                    <input 
                                        type="date" 
                                        value={cashFilterEnd}
                                        onChange={e => setCashFilterEnd(e.target.value)}
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400 transition-colors uppercase"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex bg-neutral-100 p-1 rounded-xl h-[46px] items-center">
                                <button onClick={() => applyQuickFilter('TODAY')} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm transition-all text-neutral-500 hover:text-neutral-900">Hoje</button>
                                <button onClick={() => applyQuickFilter('WEEK')} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm transition-all text-neutral-500 hover:text-neutral-900">Semana</button>
                                <button onClick={() => applyQuickFilter('MONTH')} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:shadow-sm transition-all text-neutral-500 hover:text-neutral-900">Mês</button>
                            </div>
                        </div>
                    </div>
                    <button 
                        className="bg-neutral-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap shadow-lg hover:bg-neutral-800 transition-transform hover:-translate-y-0.5"
                        onClick={() => alert("Funcionalidade de Lançamento Manual será implementada em breve.")} 
                    >
                        <Plus size={18} />
                        Novo Lançamento
                    </button>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-success-50 text-success-600 rounded-lg"><ArrowDownCircle size={20} /></div>
                            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Entradas</p>
                        </div>
                        <p className="text-3xl font-black text-success-600">R$ {totalInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowUpCircle size={20} /></div>
                            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Saídas</p>
                        </div>
                        <p className="text-3xl font-black text-red-600">R$ {totalOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-neutral-900 p-6 rounded-2xl shadow-xl text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-neutral-800 text-neutral-400 rounded-lg"><Wallet size={20} /></div>
                            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Saldo</p>
                        </div>
                        <p className={`text-3xl font-black ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* TRANSACTIONS TABLE */}
                {/* TRANSACTIONS TABLE */}
                 <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                <th className="p-5">Data</th>
                                <th className="p-5">Descrição</th>
                                <th className="p-5">Veículo / Cliente</th>
                                <th className="p-5">Detalhes</th>
                                <th className="p-5 text-right">Valor</th>
                                <th className="p-5 font-black text-neutral-400 uppercase text-[10px] tracking-widest">Obs</th>
                                <th className="p-5 text-center">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredCashBook.length === 0 ? (
                                 <tr><td colSpan={6} className="p-10 text-center text-neutral-400 italic font-medium">Nenhuma movimentação encontrada para o filtro.</td></tr>
                            ) : (
                                filteredCashBook.map(entry => (
                                    <tr key={entry.id} className={`hover:bg-neutral-25 transition-colors ${entry.deleted_at ? 'opacity-50' : ''}`}>
                                        <td className="p-5">
                                            <div className={`flex items-center gap-2 font-bold text-xs ${entry.deleted_at ? 'line-through text-neutral-400' : 'text-neutral-600'}`}>
                                                <Calendar size={14} />
                                                {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className={`p-5 font-bold ${entry.deleted_at ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>{entry.description}</td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className={`font-black text-xs uppercase ${entry.deleted_at ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                                    {entry.vehicle || '---'}
                                                </span>
                                                <span className={`text-[10px] font-bold ${entry.deleted_at ? 'line-through text-neutral-300' : 'text-neutral-400'}`}>
                                                    {entry.client || 'Mobile Cliente'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`p-5 text-xs font-medium ${entry.deleted_at ? 'line-through text-neutral-300' : 'text-neutral-500'}`}>{entry.details}</td>
                                        <td className={`p-5 text-right font-black ${entry.deleted_at ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                                            R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-5">
                                            <div className="text-xs text-neutral-500 italic truncate max-w-[150px]" title={entry.obs}>
                                                {entry.obs || '-'}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                entry.deleted_at 
                                                ? 'bg-neutral-100 text-neutral-500 line-through'
                                                : entry.type === 'IN' 
                                                ? 'bg-success-100 text-success-700' 
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                                {entry.deleted_at ? 'CANCELADO' : (entry.type === 'IN' ? 'ENTRADA' : 'SAÍDA')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};
