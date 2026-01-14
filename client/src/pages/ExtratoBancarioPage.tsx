import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ArrowLeft, 
    ArrowUpCircle, ArrowDownCircle, Plus, X
} from 'lucide-react';
import type { IContaBancaria } from '../types/backend';

export const ExtratoBancarioPage = () => {
    const { idConta } = useParams();
    const navigate = useNavigate();
    
    // State
    const [conta, setConta] = useState<IContaBancaria | null>(null);
    const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
    // const [filteredMovimentacoes, setFilteredMovimentacoes] = useState<any[]>([]); // Removed
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<{start: string, end: string}>({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Last 30 days
        end: new Date().toISOString().split('T')[0]
    });
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedType, setSelectedType] = useState('');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        tipo_movimentacao: 'SAIDA',
        categoria: 'OUTROS',
        obs: ''
    });

    useEffect(() => {
        if (idConta) {
            loadData();
            loadCategories();
        }
    }, [idConta]);

    const loadCategories = async () => {
        try {
            const res = await api.get('/categoria-financeira');
            setCategories(res.data);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [contaRes, movRes] = await Promise.all([
                api.get('/conta-bancaria'),
                api.get('/livro-caixa')
            ]);

            const contaFound = contaRes.data.find((c: any) => c.id_conta === Number(idConta));
            setConta(contaFound || null);

            // 1. Livro Caixa (Manuais ou Automáticos que geraram registro) - FONTE ÚNICA
            const entriesLivro = movRes.data
                .filter((m: any) => m.id_conta_bancaria === Number(idConta))
                .map((m: any) => ({
                    id: `cx-${m.id_livro_caixa}`,
                    id_livro_caixa: m.id_livro_caixa,
                    dt_movimentacao: m.dt_movimentacao,
                    descricao: m.descricao,
                    categoria: m.categoria,
                    tipo_movimentacao: m.tipo_movimentacao,
                    valor: Number(m.valor),
                    obs: m.obs || '',
                    origem: 'LIVRO_CAIXA',
                    paymentMethod: m.categoria === 'CONCILIACAO_CARTAO' ? 'CARTÃO' : (m.descricao.includes('PIX') ? 'PIX' : (m.origem === 'MANUAL' ? 'MANUAL' : 'OUTROS'))
                }));

            const allMovs = entriesLivro.sort((a: any, b: any) => new Date(b.dt_movimentacao).getTime() - new Date(a.dt_movimentacao).getTime());
            
            setMovimentacoes(allMovs);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Apply Filters
    const filteredMovimentacoes = movimentacoes.filter(mov => {
        const matchesSearch = mov.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (mov.obs && mov.obs.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = selectedCategory ? mov.categoria === selectedCategory : true;
        const matchesType = selectedType ? mov.tipo_movimentacao === selectedType : true;

        const movDate = new Date(mov.dt_movimentacao).toISOString().split('T')[0];
        const matchesDate = (!dateRange.start || movDate >= dateRange.start) && 
                            (!dateRange.end || movDate <= dateRange.end);

        return matchesSearch && matchesCategory && matchesType && matchesDate;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-neutral-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
            </div>
        );
    }

    if (!conta) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-neutral-800">Conta não encontrada</h2>
                <button onClick={() => navigate('/financeiro/livro-caixa')} className="mt-4 text-blue-600 hover:underline">Voltar</button>
            </div>
        );
    }

    // Apply Totals (Based on Filtered Data)
     const totalEntradas = filteredMovimentacoes
        .filter(m => m.tipo_movimentacao === 'ENTRADA')
        .reduce((acc: any, m: any) => acc + Number(m.valor), 0);
        
    const totalSaidas = filteredMovimentacoes
        .filter(m => m.tipo_movimentacao === 'SAIDA')
        .reduce((acc: any, m: any) => acc + Number(m.valor), 0);
    
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <button 
                    onClick={() => navigate('/financeiro/livro-caixa')}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mb-4 font-medium"
                >
                    <ArrowLeft size={20} />
                    Voltar para Gestão Financeira
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black text-neutral-900">{conta.nome}</h1>
                            <span className="px-3 py-1 bg-neutral-100 rounded-full text-xs font-bold text-neutral-600 uppercase tracking-wide">
                                {conta.banco}
                            </span>
                        </div>
                        <p className="text-neutral-500 font-medium">{conta.agencia && `Ag: ${conta.agencia}`} {conta.conta && `CC: ${conta.conta}`}</p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">Saldo Atual</p>
                        <p className={`text-4xl font-black ${Number(conta.saldo_atual) >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
                            R$ {Number(conta.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-neutral-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-neutral-800 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap text-sm tracking-wide"
                    >
                        <Plus size={24} strokeWidth={3} />
                        <div className="flex flex-col items-start leading-tight">
                            <span>NOVO</span>
                            <span className="text-[10px] opacity-70 font-medium tracking-widest">LANÇAMENTO</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full md:w-auto">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Buscar</label>
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por descrição..."
                        className="w-full bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl font-medium text-sm outline-none focus:border-neutral-900"
                    />
                </div>
                <div>
                     <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Período</label>
                     <div className="flex items-center gap-2">
                        <input 
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange({...dateRange, start: e.target.value})}
                            className="bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl font-medium text-sm outline-none focus:border-neutral-900"
                        />
                        <span className="text-neutral-400">-</span>
                        <input 
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange({...dateRange, end: e.target.value})}
                            className="bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl font-medium text-sm outline-none focus:border-neutral-900"
                        />
                     </div>
                </div>
                 <div className="w-32">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Tipo</label>
                    <select 
                        value={selectedType}
                        onChange={e => setSelectedType(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl font-medium text-sm outline-none focus:border-neutral-900 cursor-pointer"
                    >
                        <option value="">Todos</option>
                        <option value="ENTRADA">Entradas</option>
                        <option value="SAIDA">Saídas</option>
                    </select>
                </div>
                <div className="w-40">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Categoria</label>
                    <select 
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl font-medium text-sm outline-none focus:border-neutral-900 cursor-pointer"
                    >
                        <option value="">Todas</option>
                        {categories.map(cat => (
                            <option key={cat.id_categoria} value={cat.nome}>{cat.nome}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={() => {
                        setSearchTerm('');
                        setDateRange({
                            start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                            end: new Date().toISOString().split('T')[0]
                        });
                        setSelectedCategory('');
                        setSelectedType('');
                    }}
                    className="h-[46px] px-4 flex items-center gap-2 text-neutral-500 font-bold text-xs uppercase hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors border border-dashed border-neutral-300 hover:border-red-200"
                    title="Limpar Filtros"
                >
                    <X size={16} />
                    Limpar
                </button>
            </div>

            {/* Summary Area */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm mb-6 flex flex-col md:flex-row justify-end gap-8 text-sm">
                <div className="flex items-center gap-3 text-green-600 font-bold">
                    <div className="p-2 bg-green-50 rounded-full"><ArrowUpCircle size={20} /></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Entradas</span>
                        <span className="text-lg">{totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-red-600 font-bold">
                     <div className="p-2 bg-red-50 rounded-full"><ArrowDownCircle size={20} /></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Saídas</span>
                        <span className="text-lg">{totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-neutral-900 font-black pl-8 border-l border-neutral-100">
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Resultado do Período</span>
                        <span className="text-2xl">{(totalEntradas - totalSaidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                            <th className="p-4 w-32">Data</th>
                            <th className="p-4">Descrição</th>
                            <th className="p-4 w-32">Forma Pagto</th>
                            <th className="p-4 w-40">Categoria</th>
                            <th className="p-4 w-32 text-center">Tipo</th>
                            <th className="p-4 w-40 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {filteredMovimentacoes.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-neutral-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <p>Nenhuma movimentação registrada.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredMovimentacoes.map((mov) => (
                                <tr key={mov.id_livro_caixa} className="hover:bg-neutral-25 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-neutral-700">
                                                {new Date(mov.dt_movimentacao).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-neutral-400">
                                                {new Date(mov.dt_movimentacao).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-neutral-900">{mov.descricao}</span>
                                            {mov.obs && <span className="text-xs text-neutral-400 mt-0.5">{mov.obs}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-black uppercase ${!mov.paymentMethod || mov.paymentMethod === 'MANUAL' ? 'text-neutral-400' : 'text-blue-600'}`}>
                                            {mov.paymentMethod || '---'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                                            {mov.categoria === 'CONCILIACAO_CARTAO' ? 'Recebimento (Cartão)' : (mov.categoria === 'VENDA' ? 'Faturamento / Venda' : mov.categoria)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {mov.tipo_movimentacao === 'ENTRADA' ? (
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600">
                                                <ArrowUpCircle size={18} />
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600">
                                                <ArrowDownCircle size={18} />
                                            </div>
                                        )}
                                    </td>
                                    <td className={`p-4 text-right font-black text-sm ${mov.tipo_movimentacao === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                                        {mov.tipo_movimentacao === 'SAIDA' ? '- ' : '+ '}
                                        {Number(mov.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-neutral-900">Novo Lançamento</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900">
                                <X size={20} />
                            </button>
                        </div>
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    setFormLoading(true);
                                    await api.post('/livro-caixa', {
                                        ...formData,
                                        id_conta_bancaria: Number(idConta),
                                        origem: 'MANUAL'
                                    });
                                    setIsModalOpen(false);
                                    setFormData({ descricao: '', valor: '', tipo_movimentacao: 'SAIDA', categoria: 'OUTROS', obs: '' });
                                    loadData(); // Recarrega extrato e saldo
                                } catch (error) {
                                    console.error(error);
                                    alert('Erro ao criar lançamento.');
                                } finally {
                                    setFormLoading(false);
                                }
                            }} 
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1">Descrição</label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Ex: Taxa Bancária, Material de Limpeza..."
                                    value={formData.descricao} 
                                    onChange={e => setFormData({...formData, descricao: e.target.value})} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-900 transition-colors" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1">Valor (R$)</label>
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        value={formData.valor} 
                                        onChange={e => setFormData({...formData, valor: e.target.value})} 
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-900" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1">Tipo</label>
                                    <select 
                                        value={formData.tipo_movimentacao} 
                                        onChange={e => setFormData({...formData, tipo_movimentacao: e.target.value})} 
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-900 appearance-none cursor-pointer"
                                    >
                                        <option value="ENTRADA">Entrada (+)</option>
                                        <option value="SAIDA">Saída (-)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1">Categoria</label>
                                <select 
                                    value={formData.categoria} 
                                    onChange={e => setFormData({...formData, categoria: e.target.value})} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-900 appearance-none cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id_categoria} value={cat.nome}>{cat.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1">Observação (Opcional)</label>
                                <textarea 
                                    rows={3} 
                                    value={formData.obs} 
                                    onChange={e => setFormData({...formData, obs: e.target.value})} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-medium text-neutral-900 outline-none focus:border-neutral-900" 
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={formLoading}
                                    className="flex-1 py-3 bg-neutral-900 text-white font-black rounded-xl hover:bg-neutral-800 shadow-lg transition-all disabled:opacity-50"
                                >
                                    {formLoading ? 'Salvando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
