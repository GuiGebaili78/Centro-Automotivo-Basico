import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ArrowLeft, Search, Calendar, Filter, 
    ArrowUpCircle, ArrowDownCircle, Plus, X
} from 'lucide-react';
import type { IContaBancaria } from '../types/backend';

export const ExtratoBancarioPage = () => {
    const { idConta } = useParams();
    const navigate = useNavigate();
    
    // State
    const [conta, setConta] = useState<IContaBancaria | null>(null);
    const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
    const [filteredMovimentacoes, setFilteredMovimentacoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [filterTipo, setFilterTipo] = useState('TODOS');
    const [filterCategoria, setFilterCategoria] = useState('TODOS');

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

            const allMovs = entriesLivro.sort((a,b) => new Date(b.dt_movimentacao).getTime() - new Date(a.dt_movimentacao).getTime());
            
            setMovimentacoes(allMovs);
            
            // Set default date range (current month)
            if (!dateRange.start) {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                setDateRange({ start: firstDay, end: lastDay });
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Apply Filters
    useEffect(() => {
        let filtered = [...movimentacoes];

        // 1. Search Text (Descrição ou Categoria)
        if (searchText) {
            const lowerInfo = searchText.toLowerCase();
            filtered = filtered.filter(m => 
                m.descricao.toLowerCase().includes(lowerInfo) || 
                (m.categoria && m.categoria.toLowerCase().includes(lowerInfo))
            );
        }

        // 2. Date Range
        if (dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start);
            start.setHours(0,0,0,0);
            const end = new Date(dateRange.end);
            end.setHours(23,59,59,999);

            filtered = filtered.filter(m => {
                const d = new Date(m.dt_movimentacao);
                return d >= start && d <= end;
            });
        }

        // 3. Tipo
        if (filterTipo !== 'TODOS') {
            filtered = filtered.filter(m => m.tipo_movimentacao === filterTipo);
        }

        // 4. Categoria
        if (filterCategoria !== 'TODOS') {
            filtered = filtered.filter(m => m.categoria === filterCategoria);
        }

        setFilteredMovimentacoes(filtered);
    }, [movimentacoes, searchText, dateRange, filterTipo, filterCategoria]);


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

    // Apply Filters and Totals
     const totalEntradas = filteredMovimentacoes
        .filter(m => m.tipo_movimentacao === 'ENTRADA')
        .reduce((acc, m) => acc + Number(m.valor), 0);
        
    const totalSaidas = filteredMovimentacoes
        .filter(m => m.tipo_movimentacao === 'SAIDA')
        .reduce((acc, m) => acc + Number(m.valor), 0);
    
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

            {/* Filters Area */}
            <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por descrição..." 
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                        <Calendar size={18} className="text-neutral-400" />
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            className="bg-transparent text-sm font-medium outline-none w-full text-neutral-600"
                        />
                        <span className="text-neutral-300">|</span>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            className="bg-transparent text-sm font-medium outline-none w-full text-neutral-600"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <select 
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-neutral-900 outline-none appearance-none cursor-pointer"
                        >
                            <option value="TODOS">Todas Movimentações</option>
                            <option value="ENTRADA">Apenas Entradas</option>
                            <option value="SAIDA">Apenas Saídas</option>
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select 
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                            className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-neutral-900 outline-none appearance-none cursor-pointer"
                        >
                            <option value="TODOS">Todas Categorias</option>
                            <option value="VENDA">Vendas</option>
                            <option value="CONCILIACAO_CARTAO">Recebimentos (Cartão)</option>
                            <option value="COMPRA">Compras</option>
                            <option value="DESPESA">Despesas</option>
                            <option value="TRANSFERENCIA">Transferências</option>
                            <option value="OUTROS">Outros</option>
                        </select>
                    </div>
                </div>

                {/* Filter Summary */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end gap-6 text-sm">
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                        <ArrowUpCircle size={16} />
                        <span>Entradas: {totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 font-bold">
                        <ArrowDownCircle size={16} />
                        <span>Saídas: {totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-900 font-black pl-6 border-l border-neutral-100">
                        <span>Resultado: {(totalEntradas - totalSaidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
                                        <Filter size={32} className="opacity-20" />
                                        <p>Nenhuma movimentação encontrada com os filtros selecionados.</p>
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
