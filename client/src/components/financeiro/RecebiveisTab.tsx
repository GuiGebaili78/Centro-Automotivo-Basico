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

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        // Set default date range (next 30 days)
        const today = new Date();
        const start = today.toISOString().split('T')[0];
        const end = new Date(today.setDate(today.getDate() + 30)).toISOString().split('T')[0];
        setDateRange({ start, end });
        
        loadData(start, end);
    }, []);

    const loadData = async (start: string, end: string) => {
        try {
            const res = await api.get('/recebivel-cartao', {
                params: { 
                    startDate: start, 
                    endDate: end 
                }
            });
            setOriginalData(res.data);
            applyFilters(res.data, filterStatus);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar recebíveis.' });
        }
    };

    const applyFilters = (data: IRecebivelCartao[], status: string) => {
        let filtered = data;
        if (status !== 'ALL') {
             filtered = filtered.filter(r => r.status === status);
        }
        setRecebiveis(filtered);
    };

    useEffect(() => {
        applyFilters(originalData, filterStatus);
    }, [filterStatus, originalData]);

    const handleDateChange = (type: 'start' | 'end', val: string) => {
        const newRange = { ...dateRange, [type]: val };
        setDateRange(newRange);
        loadData(newRange.start, newRange.end);
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

    return (
        <div className="p-6">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-neutral-800">Conciliação de Cartões</h2>
                    <p className="text-neutral-500 text-sm">Visualize o que você tem a receber e confirme os depósitos.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-2 pl-2 border-r border-neutral-100 pr-4">
                        <Calendar size={16} className="text-neutral-400" />
                        <div className="flex gap-1">
                            <input type="date" value={dateRange.start} onChange={e => handleDateChange('start', e.target.value)} className="bg-transparent text-xs font-bold text-neutral-600 outline-none w-24" />
                            <span className="text-neutral-300">-</span>
                            <input type="date" value={dateRange.end} onChange={e => handleDateChange('end', e.target.value)} className="bg-transparent text-xs font-bold text-neutral-600 outline-none w-24" />
                            <button onClick={() => { setDateRange({ start: '', end: '' }); loadData('', ''); }} className="ml-2 text-[10px] font-bold text-blue-600 hover:underline uppercase">
                                Todo Período
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex gap-1">
                        <button onClick={() => setFilterStatus('PENDENTE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'PENDENTE' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>Pendentes</button>
                        <button onClick={() => setFilterStatus('RECEBIDO')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'RECEBIDO' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>Recebidos</button>
                        <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'ALL' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>Todos</button>
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
                            <th className="p-4">Operadora</th>
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
                                    <td className="p-4 font-bold text-neutral-900 text-sm">
                                        {(r as any).operadora?.nome || 'Operadora'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-neutral-600">OS #{r.id_os}</span>
                                            <span className="text-[10px] text-neutral-400">Parcela {r.num_parcela}/{r.total_parcelas}</span>
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
