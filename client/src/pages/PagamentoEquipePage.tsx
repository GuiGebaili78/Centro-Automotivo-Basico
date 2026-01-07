import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { DollarSign, ExternalLink, Calendar, CheckCircle2, User } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export const PagamentoEquipePage = () => {
    const navigate = useNavigate();
    console.log('PagamentoEquipePage mounted');
    // --- STATE ---
    const [selectedFuncId, setSelectedFuncId] = useState('');
    const [activeTab, setActiveTab] = useState<'PENDENTE' | 'PAGO'>('PENDENTE');
    
    // Data States
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [pendentes, setPendentes] = useState<any[]>([]); 
    const [historico, setHistorico] = useState<any[]>([]);
    
    // UI
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    
    // Filters (History Tab)
    const [filterHistStart, setFilterHistStart] = useState('');
    const [filterHistEnd, setFilterHistEnd] = useState('');

    // --- EFFECTS ---
    useEffect(() => {
        loadFuncionarios();
    }, []);

    useEffect(() => {
        if (!selectedFuncId) {
            setPendentes([]);
            setHistorico([]);
            return;
        }
        
        if (activeTab === 'PENDENTE') {
            loadPendentes(selectedFuncId);
        } else {
            loadHistorico(selectedFuncId);
        }
    }, [selectedFuncId, activeTab]);

    // --- LOADERS ---
    const loadFuncionarios = async () => {
        try { const res = await api.get('/funcionario'); setFuncionarios(res.data); } catch (e) { console.error(e); }
    };

    const loadPendentes = async (id: string) => {
        try {
            const res = await api.get(`/pagamento-equipe/pendentes/${id}`);
            // Ensure we have the full functionality of the mapping if needed, 
            // but the basic endpoint returns ServicoMaoDeObra with relations.
            setPendentes(res.data);
        } catch (e) { console.error(e); }
    };

    const loadHistorico = async (id: string) => {
        try {
            // Fetch ALL and filter in memory OR fetch by ID if endpoint exists. 
            // Currently endpoint /pagamento-equipe returns all. 
            // We can filter client-side for now as per previous logic.
            const res = await api.get('/pagamento-equipe'); 
            const filtered = res.data.filter((h: any) => String(h.id_funcionario) === String(id));
            setHistorico(filtered); 
        } catch(e) { console.error(e); }
    };

    // --- HELPERS ---
    const getComissaoInfo = (funcId: any, valorTotal: number) => {
        const func = funcionarios.find(f => String(f.id_funcionario) === String(funcId));
        const porcentagem = func?.comissao || 0;
        const valorComissao = (valorTotal * porcentagem) / 100;
        return { porcentagem, valorComissao };
    };

    // --- FILTERS ---
    const filteredHistorico = useMemo(() => {
        return historico.filter(h => {
             if (filterHistStart || filterHistEnd) {
                 const dtPagStr = h.dt_pagamento ? h.dt_pagamento.split('T')[0] : '';
                 if (filterHistStart && dtPagStr < filterHistStart) return false;
                 if (filterHistEnd && dtPagStr > filterHistEnd) return false;
             }
             return true;
        });
    }, [historico, filterHistStart, filterHistEnd]);

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
                    <p className="text-neutral-500">Gestão individual de comissões e pagamentos.</p>
                </div>
            </div>

            {/* SELEÇÃO COLABORADOR */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Selecione o Colaborador</label>
                <div className="relative max-w-md">
                    <select
                        value={selectedFuncId}
                        onChange={(e) => setSelectedFuncId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none text-neutral-800"
                    >
                        <option value="">Selecione um colaborador...</option>
                        {funcionarios.map((f: any) => (
                            <option key={f.id_funcionario} value={f.id_funcionario}>
                                {f.pessoa_fisica?.pessoa?.nome}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedFuncId ? (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    
                    {/* ACTION & TABS */}
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-neutral-100 w-fit">
                            <button 
                                onClick={() => setActiveTab('PENDENTE')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'PENDENTE' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
                            >
                                Visão Geral / Pendências
                            </button>
                            <button 
                                onClick={() => setActiveTab('PAGO')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'PAGO' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
                            >
                                Histórico (Pagos)
                            </button>
                        </div>

                        <button 
                            onClick={() => navigate('/pagamento-equipe/novo', { state: { funcionarioId: selectedFuncId } })}
                            className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
                        >
                            <DollarSign size={18} />
                            Novo Lançamento
                        </button>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden min-h-[400px]">
                        
                        {/* TAB: PENDENTE */}
                        {activeTab === 'PENDENTE' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="p-4">OS / Data</th>
                                            <th className="p-4">Veículo / Cliente</th>
                                            <th className="p-4 text-right">Valor Serviço</th>
                                            <th className="p-4 text-center">%</th>
                                            <th className="p-4 text-right">Valor A Receber</th>
                                            <th className="p-4 text-center">Status OS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50">
                                        {pendentes.length === 0 ? (
                                            <tr><td colSpan={6} className="p-12 text-center text-neutral-400 font-bold">Nenhuma pendência encontrada para este colaborador.</td></tr>
                                        ) : (
                                            pendentes.map((item, idx) => {
                                                const { porcentagem, valorComissao } = getComissaoInfo(selectedFuncId, Number(item.valor));
                                                return (
                                                    <tr key={`${item.id_os}-${idx}`} className="hover:bg-neutral-50 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-black text-neutral-800">#{item.id_os}</div>
                                                            <div className="text-[10px] text-neutral-400">{new Date(item.ordem_de_servico?.dt_abertura).toLocaleDateString()}</div>
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
                                                            <span className="text-xs font-bold text-neutral-400">R$ {Number(item.valor).toFixed(2)}</span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded">{porcentagem}%</span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">R$ {valorComissao.toFixed(2)}</span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${
                                                                item.ordem_de_servico?.status === 'ABERTA' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                item.ordem_de_servico?.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                item.ordem_de_servico?.status === 'CANCELADA' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                item.ordem_de_servico?.status === 'PRONTO_PARA_FINANCEIRO' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                                                                item.ordem_de_servico?.status === 'PAGA_CLIENTE' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                                                'bg-gray-50 text-gray-600 border-gray-100'
                                                            }`}>
                                                                {item.ordem_de_servico?.status ? item.ordem_de_servico.status.replace(/_/g, ' ') : 'N/A'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TAB: PAGO */}
                        {activeTab === 'PAGO' && (
                            <div>
                                {/* FILTROS HISTORICO */}
                                <div className="p-4 border-b border-neutral-100 flex gap-4 items-end bg-neutral-50/50">
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">De</label>
                                        <input type="date" value={filterHistStart} onChange={e => setFilterHistStart(e.target.value)} className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Até</label>
                                        <input type="date" value={filterHistEnd} onChange={e => setFilterHistEnd(e.target.value)} className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold outline-none" />
                                    </div>
                                    <div className="ml-auto flex flex-col items-end">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Total Pago no Período</span>
                                        <span className="text-lg font-black text-neutral-900">R$ {totalHistorico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="p-4">Data Pagto</th>
                                                <th className="p-4">Referência / Detalhes</th>
                                                <th className="p-4">Valor Pago</th>
                                                <th className="p-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50">
                                            {filteredHistorico.length === 0 ? (
                                                <tr><td colSpan={4} className="p-12 text-center text-neutral-400 font-bold">Nenhum histórico encontrado.</td></tr>
                                            ) : (
                                                filteredHistorico.flatMap(h => {
                                                    // Flatten logic similar to before but simpler for single employee view
                                                    if (h.tipo_lancamento === 'COMISSAO' && h.servicos_pagos?.length > 0) {
                                                        const items = h.servicos_pagos.map((s: any) => ({ type: 'ITEM', parent: h, item: s }));
                                                        if (Number(h.premio_valor) > 0) items.push({ type: 'PREMIO', parent: h });
                                                        // Also show Discounted Vales if any (complex, maybe just show net total in header row?)
                                                        // Let's show HEAD row anyway for summary
                                                        return [{ type: 'HEAD', parent: h }, ...items];
                                                    }
                                                    return [{ type: 'HEAD', parent: h }];
                                                }).map((row: any, idx) => {
                                                    // RENDER ROWS
                                                    if (row.type === 'HEAD') {
                                                        const h = row.parent;
                                                        const isVale = h.tipo_lancamento === 'VALE';
                                                        return (
                                                            <tr key={`head-${h.id_pagamento_equipe}-${idx}`} className="bg-neutral-50/30">
                                                                <td className="p-4">
                                                                    <div className="font-bold text-neutral-800">{new Date(h.dt_pagamento).toLocaleDateString()}</div>
                                                                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{h.forma_pagamento}</div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded w-fit ${isVale ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                        {isVale ? 'ADIANTAMENTO (VALE)' : 'PAGAMENTO / COMISSÃO'}
                                                                    </div>
                                                                    {h.obs && <div className="text-xs text-neutral-500 italic mt-1">{h.obs}</div>}
                                                                </td>
                                                                <td className="p-4 font-black">
                                                                    R$ {Number(h.valor_total).toFixed(2)}
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <CheckCircle2 size={16} className="mx-auto text-emerald-500" />
                                                                </td>
                                                            </tr>
                                                        );
                                                    } else if (row.type === 'ITEM') {
                                                         const { item, parent } = row;
                                                         const { valorComissao, porcentagem } = getComissaoInfo(selectedFuncId, Number(item.valor));
                                                         return (
                                                            <tr key={`item-${item.id_servico_mao_de_obra}-${idx}`} className="hover:bg-neutral-50 border-l-4 border-l-transparent hover:border-l-primary-500">
                                                                <td className="p-4 pl-8 opacity-50 text-[10px]">↳ Detalhe OS</td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-xs text-neutral-700">OS #{item.ordem_de_servico?.id_os}</span>
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                           item.ordem_de_servico?.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'
                                                                        }`}>
                                                                            {item.ordem_de_servico?.status}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-xs">
                                                                    <span className="font-bold text-emerald-600">R$ {valorComissao.toFixed(2)}</span>
                                                                    <span className="text-neutral-400 text-[10px] ml-1">({porcentagem}%)</span>
                                                                </td>
                                                                <td className="p-4"></td>
                                                            </tr>
                                                         )
                                                    }
                                                    return null;
                                                }) 
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            ) : (
                // EMPTY STATE
                <div className="bg-white rounded-3xl border border-dashed border-neutral-300 p-12 flex flex-col items-center justify-center text-center mt-6">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-4">
                        <User size={32} />
                    </div>
                    <h3 className="font-black text-lg text-neutral-800">Nenhum Colaborador Selecionado</h3>
                    <p className="text-neutral-500 max-w-sm mt-2">
                        Selecione um colaborador na lista acima para visualizar suas comissões, histórico e realizar pagamentos.
                    </p>
                </div>
            )}
        </div>
    );
};

