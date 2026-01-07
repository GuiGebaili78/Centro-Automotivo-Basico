import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { Search, DollarSign, ExternalLink, Calendar } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export const PagamentoEquipePage = () => {
    const navigate = useNavigate();
    console.log('PagamentoEquipePage mounted');
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'PENDENTE' | 'PAGO'>('PENDENTE');
    const [searchTerm, setSearchTerm] = useState('');
    const [pendentes, setPendentes] = useState<any[]>([]); // Lista geral de tudo pendente
    const [historico, setHistorico] = useState<any[]>([]); // Lista de pagamentos realizados
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    
    // Modal Removed - using page now
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    
    // History Filters
    const [filterHistColab, setFilterHistColab] = useState('');
    const [filterHistStart, setFilterHistStart] = useState('');
    const [filterHistEnd, setFilterHistEnd] = useState('');

    // --- EFFECTS ---
    useEffect(() => {
        loadFuncionarios();
    }, []);

    useEffect(() => {
        if (activeTab === 'PENDENTE') {
            if (funcionarios.length > 0) loadAllPendentes();
        } else {
             loadHistorico();
        }
    }, [activeTab, funcionarios]);

    // --- DATA LOADING ---
    const loadFuncionarios = async () => {
        try { const res = await api.get('/funcionario'); setFuncionarios(res.data); } catch (e) { console.error(e); }
    };

    const loadAllPendentes = async () => {
        // Busca todos os pendentes (pode usar endpoint filtrado ou buscar por func e agregar)
        // Por simplicidade, assumo que existe endpoint ou filtro no backend, 
        // mas vou adaptar usando 'funcionario' endpoint se necessario ou criar um 'all-pendentes'.
        // Como criei apenas '/pendentes/:id', vou iterar ou criar um 'all' no backend seria melhor. 
        // Vou usar o endpoint '/pagamento-equipe/pendentes/0' (assumindo que 0 retorna tudo ou ajustar no backend).
        // *Correção*: Backend espera ID. Vou ajustar o backend para aceitar 'all' ou parametro opcional? 
        // No passo anterior fiz: `id_funcionario: Number(id_funcionario)`. Se passar 0 e não houver func 0, retorna vazio.
        // Vou assumir que para esta visualização geral o usuário aceita filtrar por funcionário na tela principal ou
        // Pior caso: iterar funcionarios client-sim. 
        // Melhor: Vou modificar o backend rapidinho para aceitar 'all' ou criar endpoint separado?
        // Vou tentar buscar de todos iterativamente por enquanto para nao bloquear.
        try {
            // Fallback: Busca de todos os funcionarios ativos
            const promises = funcionarios.map(f => api.get(`/pagamento-equipe/pendentes/${f.id_funcionario}`));
            const results = await Promise.all(promises);
            const all = results.flatMap(r => r.data.map((item: any) => ({ ...item, nome_funcionario: item.funcionario?.pessoa_fisica?.pessoa?.nome }))); 
            // Ops, o endpoint pendentes não retorna o nome do funcionario na raiz, ele retorna ServicoMaoDeObra.
            // O Servico tem relacao com Funcionario. Include funcionario no backend? 
            // No backend fiz include ordem_de_servico e cliente. Faltou funcionario.
            // Mas no frontend ja tenho a lista de funcionarios. Posso mapear.
            setPendentes(all); 
        } catch (e) { /* silent */ }
    };

    const loadHistorico = async () => {
        try { const res = await api.get('/pagamento-equipe'); setHistorico(res.data); } catch(e) { console.error(e); }
    };



    // --- HANDLERS ---


    // Filtro Tab Em Aberto
    const filteredPendentes = useMemo(() => {
        // Aqui precisaria mapear o ID do funcionario para nome se o backend não mandar
        // Hack: Se endpoint nao manda funcionario, mapeio localmente pelo funcionarios state
         return pendentes.filter(p => {
             const fNome = funcionarios.find(f => f.id_funcionario === p.id_funcionario)?.pessoa_fisica?.pessoa?.nome || '';
             const searchText = searchTerm.toLowerCase();
             return (
                fNome.toLowerCase().includes(searchText) ||
                String(p.id_os).includes(searchText) ||
                (p.ordem_de_servico?.veiculo?.modelo || '').toLowerCase().includes(searchText)
             );
         });
    }, [pendentes, searchTerm, funcionarios]);

    // Filtro Tab Historico
    const filteredHistorico = useMemo(() => {
        return historico.filter(h => {
             const term = searchTerm.toLowerCase();

             // 0. General Search Term - BRUTE FORCE JSON
             if (term) {
                 const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                 // Using JSON Stringify to catch ALL nested properties (vehicle, client, OS, etc) safely
                 const fullRecord = normalize(JSON.stringify(h));
                 
                 const keywords = normalize(term).split(/\s+/).filter(k => k.length > 0);
                 if (!keywords.every(kw => fullRecord.includes(kw))) return false;
             }

             // 1. Colaborador
             if (filterHistColab && String(h.id_funcionario) !== filterHistColab) return false;

             // 2. Dates
             if (filterHistStart || filterHistEnd) {
                 // Convert API date (YYYY-MM-DD...) to normalized string YYYY-MM-DD
                 const dtPagStr = h.dt_pagamento ? h.dt_pagamento.split('T')[0] : '';
                 
                 if (filterHistStart && dtPagStr < filterHistStart) return false;
                 if (filterHistEnd && dtPagStr > filterHistEnd) return false;
             }
             return true;
        });
    }, [historico, filterHistColab, filterHistStart, filterHistEnd, searchTerm]);

    const totalHistorico = useMemo(() => {
        return filteredHistorico.reduce((acc, h) => acc + (Number(h.valor_total) || 0) + (Number(h.premio_valor) || 0), 0);
    }, [filteredHistorico]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
             <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

             {/* HEADER */}
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Pagamento da Equipe</h1>
                    <p className="text-neutral-500">Gestão de comissões, salários e pagamentos.</p>
                </div>
                <button 
                    onClick={() => navigate('/pagamento-equipe/novo')}
                    className="group bg-neutral-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-black/10 flex items-center gap-2 active:scale-95"
                >
                    <DollarSign size={20} className="text-emerald-400" />
                    Novo Pagamento
                </button>
            </div>

            {/* TABS */}
            <div className="flex gap-2 bg-white p-1 rounded-2xl border border-neutral-100 w-fit">
                <button 
                    onClick={() => setActiveTab('PENDENTE')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'PENDENTE' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                    Em Aberto
                </button>
                <button 
                    onClick={() => setActiveTab('PAGO')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'PAGO' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                    Histórico (Pagos)
                </button>
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden min-h-[400px]">
                {/* SEARCH BAR */}
                <div className="p-4 border-b border-neutral-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por Colaborador, OS, Veículo..."
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                </div>

                {activeTab === 'PAGO' && (
                    <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex flex-wrap gap-4 items-end">
                        <div className="w-full md:w-auto min-w-[200px]">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Filtrar Colaborador</label>
                            <select 
                                value={filterHistColab} 
                                onChange={e => setFilterHistColab(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Todos</option>
                                {funcionarios.map((f: any) => (
                                    <option key={f.id_funcionario} value={f.id_funcionario}>{f.pessoa_fisica?.pessoa?.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">De</label>
                                <input type="date" value={filterHistStart} onChange={e => setFilterHistStart(e.target.value)} className="px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Até</label>
                                <input type="date" value={filterHistEnd} onChange={e => setFilterHistEnd(e.target.value)} className="px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold text-sm outline-none" />
                            </div>
                        </div>
                         {/* TOTAL CARD */}
                        <div className="ml-auto bg-neutral-900 text-white px-6 py-2 rounded-xl flex flex-col items-end shadow-lg">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Total Selecionado</span>
                            <span className="text-xl font-black">R$ {totalHistorico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                )}

                {activeTab === 'PENDENTE' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                <tr>
                                    <th className="p-4">OS / Data</th>
                                    <th className="p-4">Colaborador</th>
                                    <th className="p-4">Veículo / Cliente</th>
                                    <th className="p-4 text-right">Valor Comissão</th>
                                    <th className="p-4 text-center">Status OS</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {filteredPendentes.length === 0 ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-neutral-400 font-bold">Nenhum valor pendente encontrado.</td></tr>
                                ) : (
                                    filteredPendentes.map((item, idx) => {
                                        const func = funcionarios.find(f => f.id_funcionario === item.id_funcionario);
                                        return (
                                            <tr key={`${item.id_os}-${idx}`} className="hover:bg-neutral-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-black text-neutral-800">#{item.id_os}</div>
                                                    <div className="text-[10px] text-neutral-400">{new Date(item.ordem_de_servico?.dt_abertura).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">{func?.pessoa_fisica?.pessoa?.nome?.charAt(0)}</div>
                                                        <span className="font-bold text-sm text-neutral-700">{func?.pessoa_fisica?.pessoa?.nome || '???'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs font-bold text-neutral-800">
                                                        {item.ordem_de_servico?.veiculo?.modelo} 
                                                        {item.ordem_de_servico?.veiculo?.cor && <span className="text-neutral-500 font-normal ml-1">• {item.ordem_de_servico?.veiculo?.cor}</span>}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mt-0.5">{item.ordem_de_servico?.veiculo?.placa}</div>
                                                    <div className="text-[10px] text-neutral-400 mt-0.5">{item.ordem_de_servico?.cliente?.pessoa_fisica?.pessoa?.nome || item.ordem_de_servico?.cliente?.pessoa_juridica?.razao_social}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">R$ {Number(item.valor).toFixed(2)}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${
                                                        item.ordem_de_servico?.status === 'ABERTA' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        item.ordem_de_servico?.status === 'FINALIZADA' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        item.ordem_de_servico?.status === 'CANCELADA' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        'bg-gray-100 text-gray-700 border-gray-200'
                                                    }`}>
                                                        {item.ordem_de_servico?.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded uppercase">Pendente</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'PAGO' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                <tr>
                                    <th className="p-4">Data Pagto</th>
                                    <th className="p-4">Colaborador</th>
                                    <th className="p-4">Referência / OS</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4 text-center">Status OS</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {Array.isArray(filteredHistorico) && filteredHistorico.flatMap(h => {
                                    // If COMISSAO and has items, explode them.
                                    if (h.tipo_lancamento === 'COMISSAO' && h.servicos_pagos && h.servicos_pagos.length > 0) {
                                        const items = h.servicos_pagos.map((s: any) => ({
                                            type: 'ITEM',
                                            parent: h,
                                            item: s
                                        }));
                                        if (Number(h.premio_valor) > 0) {
                                            items.push({ type: 'PREMIO', parent: h });
                                        }
                                        return items;
                                    }
                                    // Else (Salary, Vale, or Commission without items/manual), show as single row
                                    return [{ type: 'HEAD', parent: h }];
                                }).map((row: any) => {
                                    const { type, parent, item } = row;
                                    
                                    if (type === 'HEAD' || type === 'PREMIO') {
                                        const isPremio = type === 'PREMIO';
                                        return (
                                            <tr key={`${type}-${parent.id_pagamento_equipe}`} className="hover:bg-neutral-50 transition-colors bg-neutral-50/30">
                                                <td className="p-4">
                                                    <div className="font-bold text-neutral-800">{new Date(parent.dt_pagamento).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-neutral-700">{parent.funcionario?.pessoa_fisica?.pessoa?.nome}</div>
                                                    <div className="text-[10px] uppercase font-black tracking-widest text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded w-fit mt-1">
                                                        {isPremio ? 'PRÊMIO/EXTRA' : parent.tipo_lancamento}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-neutral-600">
                                                    {parent.referencia_inicio && !isPremio && (
                                                        <div className="flex items-center gap-1 font-bold mb-1 text-neutral-500">
                                                            <Calendar size={10} />
                                                            {new Date(parent.referencia_inicio).toLocaleDateString()} - {new Date(parent.referencia_fim).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    <div className="truncate max-w-xs italic">{isPremio ? parent.premio_descricao : (parent.obs || '-')}</div>
                                                </td>
                                                <td className="p-4 font-black text-neutral-800">
                                                    R$ {Number(isPremio ? parent.premio_valor : parent.valor_total).toFixed(2)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-neutral-300 text-xs">-</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-neutral-300">-</span>
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        // ITEM ROW (Commission details)
                                        const os = item.ordem_de_servico;
                                        // Safety check: if OS relationship is missing, skip row to prevent crash
                                        if (!os) return null;

                                        return (
                                            <tr key={`item-${item.id_servico_mao_de_obra}`} className="hover:bg-neutral-50 transition-colors border-l-4 border-l-transparent hover:border-l-primary-500">
                                                <td className="p-4 pl-4 text-neutral-400">
                                                    <div className="text-[10px]">{new Date(parent.dt_pagamento).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-neutral-700 text-sm">{parent.funcionario?.pessoa_fisica?.pessoa?.nome}</div>
                                                    <div className="text-[9px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                                        COMISSÃO
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-neutral-100 text-neutral-700 border border-neutral-200 text-[10px] font-black px-1.5 rounded">OS #{os.id_os}</span>
                                                        <span className="text-xs font-bold text-neutral-600">
                                                            {os.veiculo?.modelo} 
                                                            <span className="font-normal text-neutral-400"> ({os.veiculo?.placa})</span>
                                                            {os.veiculo?.cor && <span className="font-normal text-neutral-400"> • {os.veiculo.cor}</span>}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-neutral-500 leading-relaxed max-w-md">
                                                        {os.defeito_relatado && <div><span className="font-bold">Defeito:</span> {os.defeito_relatado}</div>}
                                                        {os.diagnostico && <div><span className="font-bold">Diag:</span> {os.diagnostico}</div>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                   <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs">R$ {Number(item.valor).toFixed(2)}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                     <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${
                                                        os.status === 'ABERTA' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        os.status === 'FINALIZADA' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        os.status === 'CANCELADA' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        'bg-gray-100 text-gray-700 border-gray-200'
                                                    }`}>
                                                        {os.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => navigate('/ordem-de-servico', { state: { highlightOsId: os.id_os } })}
                                                        className="text-neutral-400 hover:text-primary-600 transition-colors"
                                                        title="Ir para OS"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    }
                                })}
                            </tbody>
                        </table>
                     </div>
                )}
            </div>


        </div>
    );
};

