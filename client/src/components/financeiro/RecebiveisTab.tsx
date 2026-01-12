import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    Calendar, CheckCircle
} from 'lucide-react';
import type { IRecebivelCartao } from '../../types/backend';
import { StatusBanner } from '../ui/StatusBanner';

export const RecebiveisTab = () => {
    const [recebiveis, setRecebiveis] = useState<IRecebivelCartao[]>([]);
    const [originalData, setOriginalData] = useState<IRecebivelCartao[]>([]);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    
    // Filters
    const [filterStatus, setFilterStatus] = useState<'PENDENTE' | 'RECEBIDO' | 'ALL'>('PENDENTE');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOperadoraId, setSelectedOperadoraId] = useState<number | 'ALL'>('ALL');
    const [operadoras, setOperadoras] = useState<any[]>([]);
    
    // Resumo de Totais
    const [summary, setSummary] = useState({
        month1: { label: '', value: 0, start: '', end: '' },
        month2: { label: '', value: 0, start: '', end: '' },
        month3: { label: '', value: 0, start: '', end: '' }
    });

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        // Set default date range (next 30 days)
        const today = new Date();
        const start = today.toISOString().split('T')[0];
        const end = new Date(today.setDate(today.getDate() + 30)).toISOString().split('T')[0];
        setDateRange({ start, end });
        
        loadData(start, end);
        loadOperadoras();
    }, []);

    const loadOperadoras = async () => {
        try {
            const res = await api.get('/operadora-cartao');
            setOperadoras(res.data);
        } catch (error) {
            console.error('Erro ao carregar operadoras:', error);
        }
    };

    const loadData = async (start: string, end: string) => {
        try {
            // Remove any time part if exists only for API call
            const startClean = start.split('T')[0];
            const endClean = end.split('T')[0];

            // 1. Carregar dados filtrados pelo range selecionado para a tabela
            const res = await api.get('/recebivel-cartao/date-range', {
                params: { 
                    dataInicio: startClean, 
                    dataFim: endClean
                }
            });
            setOriginalData(res.data);
            applyFilters(res.data, filterStatus, searchTerm, selectedOperadoraId);

            // 2. Carregar totais para os cards (próximos 4 meses para garantir cobertura)
            const today = new Date();
            const future = new Date();
            future.setMonth(today.getMonth() + 4);
            
            const resSummary = await api.get('/recebivel-cartao/date-range', {
                params: {
                    dataInicio: today.toISOString().split('T')[0],
                    dataFim: future.toISOString().split('T')[0]
                }
            });
            
            calculateSummary(resSummary.data);

        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar recebíveis.' });
        }
    };

    const getMonthRange = (offset: number) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + offset;
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0);
        return {
            start: firstDay.toISOString().split('T')[0],
            end: lastDay.toISOString().split('T')[0],
            label: firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        };
    };

    const calculateSummary = (data: IRecebivelCartao[]) => {
        const m1 = getMonthRange(1);
        const m2 = getMonthRange(2);
        const m3 = getMonthRange(3);

        let v1 = 0;
        let v2 = 0;
        let v3 = 0;

        data.forEach(r => {
            if (r.status !== 'PENDENTE') return; 
            const dStr = r.data_prevista.split('T')[0];

            if (dStr >= m1.start && dStr <= m1.end) v1 += Number(r.valor_liquido);
            if (dStr >= m2.start && dStr <= m2.end) v2 += Number(r.valor_liquido);
            if (dStr >= m3.start && dStr <= m3.end) v3 += Number(r.valor_liquido);
        });

        setSummary({
            month1: { label: m1.label, value: v1, start: m1.start, end: m1.end },
            month2: { label: m2.label, value: v2, start: m2.start, end: m2.end },
            month3: { label: m3.label, value: v3, start: m3.start, end: m3.end }
        });
    };

    const applyFilters = (data: IRecebivelCartao[], status: string, search: string, operadoraId: number | 'ALL') => {
        let filtered = data;
        
        // 1. Status Filter
        if (status !== 'ALL') {
             filtered = data.filter(r => r.status === status);
        }

        // 2. Operadora Filter
        if (operadoraId !== 'ALL') {
            filtered = filtered.filter(r => r.id_operadora === Number(operadoraId));
        }

        // 3. Search Term (Tokenized)
        if (search.trim()) {
            const tokens = search.toLowerCase().split(/\s+/).filter(t => t.length > 0);
            filtered = filtered.filter(r => {
                const searchString = [
                    (r as any).codigo_autorizacao || '',
                    (r as any).nsu || '',
                    (r as any).ordem_de_servico?.veiculo?.placa || '',
                    (r as any).ordem_de_servico?.veiculo?.modelo || '',
                    (r as any).operadora?.nome || '',
                    r.id_os?.toString() || '',
                    r.valor_bruto?.toString() || '',
                    r.valor_liquido?.toString() || ''
                ].join(' ').toLowerCase();

                return tokens.every(token => searchString.includes(token));
            });
        }

        setRecebiveis(filtered);
    };

    useEffect(() => {
        applyFilters(originalData, filterStatus, searchTerm, selectedOperadoraId);
    }, [filterStatus, originalData, searchTerm, selectedOperadoraId]);

    const handleDateChange = (type: 'start' | 'end', val: string) => {
        const newRange = { ...dateRange, [type]: val };
        setDateRange(newRange);
        if (newRange.start && newRange.end) {
            loadData(newRange.start, newRange.end);
        }
    };

    const setPresetRange = (days: number) => {
        const today = new Date();
        const start = today.toISOString().split('T')[0];
        
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);
        const end = futureDate.toISOString().split('T')[0];
        
        setDateRange({ start, end });
        loadData(start, end);
    };

    const setMonthFilter = (start: string, end: string) => {
        setDateRange({ start, end });
        loadData(start, end);
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === recebiveis.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(recebiveis.map(r => r.id_recebivel));
        }
    };

    const handleConciliar = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Confirma o recebimento de ${selectedIds.length} transações? Isso lançará o valor na conta bancária.`)) return;

        try {
            await api.post('/recebivel-cartao/confirmar', { ids: selectedIds });
            setStatusMsg({ type: 'success', text: 'Recebimentos confirmados e conciliados!' });
            setSelectedIds([]);
            loadData(dateRange.start, dateRange.end);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao conciliar recebíveis.' });
        }
    };

    const totalSelected = recebiveis
        .filter(r => selectedIds.includes(r.id_recebivel))
        .reduce((acc, r) => acc + Number(r.valor_liquido), 0);

    const totalPrevisto = recebiveis.reduce((acc, r) => acc + Number(r.valor_liquido), 0);

    const countPendente = originalData.filter(r => r.status === 'PENDENTE').length;
    const countRecebido = originalData.filter(r => r.status === 'RECEBIDO').length;
    const countTotal = originalData.length;

    return (
        <div className="p-6">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-neutral-800">Conciliação de Cartões</h2>
                    <p className="text-neutral-500 text-sm">Visualize o que você tem a receber e confirme os depósitos.</p>
                </div>
                
                <div className="flex gap-1 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
                    <button onClick={() => setFilterStatus('PENDENTE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${filterStatus === 'PENDENTE' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>
                        Pendentes <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === 'PENDENTE' ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{countPendente}</span>
                    </button>
                    <button onClick={() => setFilterStatus('RECEBIDO')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${filterStatus === 'RECEBIDO' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>
                        Recebidos <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === 'RECEBIDO' ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{countRecebido}</span>
                    </button>
                    <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${filterStatus === 'ALL' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>
                        Todos <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === 'ALL' ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{countTotal}</span>
                    </button>
                </div>
            </div>

            {/* Main Filters Container */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                    
                    {/* Search Field */}
                    <div className="lg:col-span-4">
                        <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Buscar Registros</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Placa, modelo, operadora, código..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-100 p-3 pl-10 rounded-xl font-bold text-sm outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </div>
                        </div>
                    </div>

                    {/* Operadora Select */}
                    <div className="lg:col-span-3">
                        <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Operadora</label>
                        <select 
                            value={selectedOperadoraId}
                            onChange={e => setSelectedOperadoraId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                            className="w-full bg-neutral-50 border border-neutral-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner"
                        >
                            <option value="ALL">Todas as Operadoras</option>
                            {operadoras.map(op => (
                                <option key={op.id_operadora} value={op.id_operadora}>{op.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Fields */}
                    <div className="lg:col-span-3 flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">De</label>
                            <input 
                                type="date" 
                                value={dateRange.start} 
                                onChange={e => handleDateChange('start', e.target.value)} 
                                className="w-full bg-neutral-50 border border-neutral-100 p-3 rounded-xl font-bold text-[11px] outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block">Até</label>
                            <input 
                                type="date" 
                                value={dateRange.end} 
                                onChange={e => handleDateChange('end', e.target.value)} 
                                className="w-full bg-neutral-50 border border-neutral-100 p-3 rounded-xl font-bold text-[11px] outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner" 
                            />
                        </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="lg:col-span-2 flex gap-1 h-[46px]">
                         <button onClick={() => setPresetRange(0)} className="flex-1 bg-white border border-neutral-100 rounded-xl text-[10px] font-black text-neutral-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">HOJE</button>
                         <button onClick={() => setPresetRange(7)} className="flex-1 bg-white border border-neutral-100 rounded-xl text-[10px] font-black text-neutral-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">7D</button>
                         <button onClick={() => setPresetRange(30)} className="flex-1 bg-white border border-neutral-100 rounded-xl text-[10px] font-black text-neutral-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">30D</button>
                    </div>

                </div>
            </div>


            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div onClick={() => setMonthFilter(summary.month1.start, summary.month1.end)} className="cursor-pointer bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between group">
                    <p className="text-[10px] font-black text-neutral-400 tracking-wider mb-2 capitalize">{summary.month1.label}</p>
                    <div className="flex items-end justify-between">
                        <p className="text-xl font-black text-neutral-900 group-hover:text-blue-600 transition-colors">
                            R$ {summary.month1.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="bg-neutral-50 p-2 rounded-lg text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <Calendar size={16} />
                        </div>
                    </div>
                </div>

                <div onClick={() => setMonthFilter(summary.month2.start, summary.month2.end)} className="cursor-pointer bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between group">
                    <p className="text-[10px] font-black text-neutral-400 tracking-wider mb-2 capitalize">{summary.month2.label}</p>
                    <div className="flex items-end justify-between">
                        <p className="text-xl font-black text-neutral-900 group-hover:text-blue-600 transition-colors">
                            R$ {summary.month2.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="bg-neutral-50 p-2 rounded-lg text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <Calendar size={16} />
                        </div>
                    </div>
                </div>

                <div onClick={() => setMonthFilter(summary.month3.start, summary.month3.end)} className="cursor-pointer bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between group">
                    <p className="text-[10px] font-black text-neutral-400 tracking-wider mb-2 capitalize">{summary.month3.label}</p>
                    <div className="flex items-end justify-between">
                        <p className="text-xl font-black text-neutral-900 group-hover:text-blue-600 transition-colors">
                            R$ {summary.month3.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="bg-neutral-50 p-2 rounded-lg text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <Calendar size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Strip */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-neutral-100 flex items-center justify-between">
                     <div>
                         <p className="text-[10px] font-black text-neutral-400 uppercase">Previsão no Período</p>
                         <p className="text-2xl font-black text-neutral-900">R$ {totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                     </div>
                 </div>
                 {selectedIds.length > 0 && (
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase">Selecionado para Baixa</p>
                            <p className="text-2xl font-black text-blue-700">R$ {totalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <button onClick={handleConciliar} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <CheckCircle size={16} /> Confirmar
                        </button>
                    </div>
                 )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                            <th className="p-4 w-10 text-center">
                                <input type="checkbox" onChange={toggleSelectAll} checked={recebiveis.length > 0 && selectedIds.length === recebiveis.length} className="rounded border-neutral-300" />
                            </th>
                            <th className="p-4">Previsão</th>
                            <th className="p-4">Cód. Aut/NSU</th>
                            <th className="p-4">Operadora</th>
                            <th className="p-4">Veículo</th>
                            <th className="p-4">Detalhes</th>
                            <th className="p-4 text-right">Bruto</th>
                            <th className="p-4 text-right">Taxa</th>
                            <th className="p-4 text-right">Líquido</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {recebiveis.length === 0 ? (
                            <tr><td colSpan={8} className="p-10 text-center text-neutral-400">Nenhum recebível encontrado no período.</td></tr>
                        ) : (
                            recebiveis.map(r => (
                                <tr key={r.id_recebivel} className={`hover:bg-neutral-25 transition-colors ${r.status === 'RECEBIDO' ? 'bg-gray-50' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(r.id_recebivel)} 
                                            onChange={() => toggleSelect(r.id_recebivel)}
                                            disabled={r.status === 'RECEBIDO'}
                                            className="rounded border-neutral-300"
                                        />
                                    </td>
                                    <td className="p-4 font-bold text-neutral-700 text-sm">
                                        {new Date(r.data_prevista).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-xs text-neutral-600 font-mono">
                                        {(r as any).codigo_autorizacao || '-'}
                                    </td>
                                    <td className="p-4 font-bold text-neutral-900 text-sm">
                                        {(r as any).operadora?.nome || 'Operadora'}
                                    </td>
                                    <td className="p-4">
                                        {(r as any).ordem_de_servico?.veiculo ? (
                                            <div className="flex flex-col">
                                                <span className="font-black text-neutral-800 uppercase text-xs">
                                                    {(r as any).ordem_de_servico.veiculo.placa}
                                                </span>
                                                <span className="text-[10px] text-neutral-500">
                                                    {(r as any).ordem_de_servico.veiculo.modelo}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-neutral-400 italic">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-neutral-600">OS #{r.id_os}</span>
                                            <span className="text-[10px] text-neutral-400">Parcela {r.num_parcela}/{r.total_parcelas}</span>
                                            <span className="text-[10px] text-neutral-400">Venda: {new Date(r.data_venda).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-neutral-500 text-sm">
                                        {Number(r.valor_bruto).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right text-red-500 text-xs font-bold">
                                        - {Number(r.taxa_aplicada).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-black text-neutral-900 text-sm">
                                        {Number(r.valor_liquido).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {r.status === 'RECEBIDO' ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black uppercase">Recebido</span>
                                        ) : (
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-black uppercase">Pendente</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
