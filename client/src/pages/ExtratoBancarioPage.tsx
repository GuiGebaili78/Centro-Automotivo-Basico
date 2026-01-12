import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ArrowLeft, Search, Calendar, Filter, 
    ArrowUpCircle, ArrowDownCircle
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

    useEffect(() => {
        if (idConta) {
            loadData();
        }
    }, [idConta]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [contaRes, movRes, pCliRes] = await Promise.all([
                api.get('/conta-bancaria'),
                api.get('/livro-caixa'),
                api.get('/pagamento-cliente'),
                // api.get('/pagamento-peca') // Future use
            ]);

            const contaFound = contaRes.data.find((c: any) => c.id_conta === Number(idConta));
            setConta(contaFound || null);

            // 1. Livro Caixa (Manuais ou Automáticos que geraram registro)
            const entriesLivro = movRes.data
                .filter((m: any) => m.id_conta_bancaria === Number(idConta))
                .map((m: any) => ({
                    id: `cx-${m.id_livro_caixa}`,
                    dt_movimentacao: m.dt_movimentacao,
                    descricao: m.descricao,
                    categoria: m.categoria,
                    tipo_movimentacao: m.tipo_movimentacao, // ENTRADA / SAIDA
                    valor: Number(m.valor),
                    obs: m.obs || '',
                    origem: 'LIVRO_CAIXA',
                    paymentMethod: m.origem === 'MANUAL' ? 'MANUAL' : (m.descricao.includes('PIX') ? 'PIX' : 'OUTROS')
                }));

            // 2. Pagamento Clientes (Entradas nessa conta)
            // Filtra pagamentos que apontam explicitamente para esta conta
            const entriesPCli = pCliRes.data
                .filter((p: any) => p.id_conta_bancaria === Number(idConta))
                .map((p: any) => {
                    let methodDisplay = p.metodo_pagamento;
                    if (methodDisplay === 'CREDITO') methodDisplay = `CRÉDITO ${p.bandeira_cartao || ''}`;
                    if (methodDisplay === 'DEBITO') methodDisplay = `DÉBITO ${p.bandeira_cartao || ''}`;
                    
                    return {
                        id: `in-${p.id_pagamento_cliente}`,
                        dt_movimentacao: p.data_pagamento,
                        descricao: `Recebimento OS #${p.id_os}`,
                        categoria: 'Receita de Serviços',
                        tipo_movimentacao: 'ENTRADA',
                        valor: Number(p.valor),
                        obs: p.observacao || '',
                        origem: 'VENDA',
                        paymentMethod: methodDisplay
                    };
                });

            // 3. Pagamento Peças (Saídas dessa conta) - Se houver vínculo (por enquanto assumindo via livro caixa, mas se tiver lógica futura...)
            // Nota: Se PagamentoPeca tiver id_conta_bancaria (não tem no schema atual, mas assumindo consistência futura ou ajuste de schema).
            // Por hora, PagamentoPeca geralmente não tem conta direta no schema prisma fornecido anteriormente (PagamentoPeca relation LivroCaixa relation Conta). 
            // Se já foi pego em 'entriesLivro' via id_livro_caixa, não duplicar.
            // Para não duplicar: vamos checar IDs se necessário. Mas 'entriesLivro' já traz pelo id_conta.
            // Então 'entriesPCli' traz o que NÃO gerou Livro Caixa mas tem conta.
            
            // Filtrar duplicatas (se PagamentoCliente gerou LivroCaixa e ambos vierem)
            // Mas PagamentoCliente com id_conta_bancaria geralmente é direto.
            
            const allMovs = [...entriesLivro, ...entriesPCli].sort((a,b) => new Date(b.dt_movimentacao).getTime() - new Date(a.dt_movimentacao).getTime());
            
            setMovimentacoes(allMovs);
            
            // Set default date range (current month)
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            setDateRange({ start: firstDay, end: lastDay });

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
                                            {mov.categoria}
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
        </div>
    );
};
