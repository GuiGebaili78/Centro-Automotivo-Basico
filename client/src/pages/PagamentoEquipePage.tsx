import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { Modal } from '../components/ui/Modal';
import { Search, DollarSign, User, ArrowRight, ExternalLink, Calendar } from 'lucide-react';

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
    
    // Modal Novo Pagamento
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [funcPendentes, setFuncPendentes] = useState<any[]>([]); // Pendentes do func selecionado no modal
    const [selectedItems, setSelectedItems] = useState<number[]>([]); // IDs dos serviços selecionados para pagar
    const [extraValue, setExtraValue] = useState(''); // Valor prêmio/salario extra
    const [obsExtra, setObsExtra] = useState(''); // Motivo do prêmio
    const [obsPagamento, setObsPagamento] = useState('');
    
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

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

    useEffect(() => {
        if (selectedFuncionarioId) {
            loadFuncionarioPendentes(selectedFuncionarioId);
        } else {
            setFuncPendentes([]);
            setSelectedItems([]);
        }
    }, [selectedFuncionarioId]);

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

    const loadFuncionarioPendentes = async (id: string) => {
        try {
            const res = await api.get(`/pagamento-equipe/pendentes/${id}`);
            setFuncPendentes(res.data);
            // Auto-select all
            setSelectedItems(res.data.map((i: any) => i.id_servico_mao_de_obra));
        } catch (error) { console.error(error); }
    };

    // --- HANDLERS ---
    const handlePay = async (paymentMethodArg?: string, tipoLancamentoArg?: string, refInicio?: string, refFim?: string) => {
        if (!selectedFuncionarioId) return;
        if (selectedItems.length === 0 && !extraValue) {
            setStatusMsg({ type: 'error', text: 'Selecione ao menos um item ou informe um valor extra.' });
            return;
        }

        try {
            const totalComissao = funcPendentes
                .filter(i => selectedItems.includes(i.id_servico_mao_de_obra))
                .reduce((acc, curr) => acc + Number(curr.valor), 0);
            
            const totalFinal = (tipoLancamentoArg === 'COMISSAO' ? totalComissao : 0) + (Number(extraValue) || 0);

            await api.post('/pagamento-equipe', {
                id_funcionario: selectedFuncionarioId,
                servicos_ids: tipoLancamentoArg === 'COMISSAO' ? selectedItems : [],
                valor_total: totalFinal,
                obs: obsPagamento,
                forma_pagamento: paymentMethodArg || 'DINHEIRO',
                premio_valor: extraValue || null,
                premio_descricao: obsExtra || null,
                tipo_lancamento: tipoLancamentoArg || 'COMISSAO',
                referencia_inicio: refInicio || null,
                referencia_fim: refFim || null
            });

            setStatusMsg({ type: 'success', text: 'Pagamento realizado com sucesso!' });
            setShowPayModal(false);
            setExtraValue('');
            setObsExtra('');
            setObsPagamento('');
            setSelectedFuncionarioId('');
            loadAllPendentes(); // Refresh
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao processar pagamento.' });
        }
    };

    // --- CALCULATED ---
    const modalTotal = useMemo(() => {
        const sumItems = funcPendentes
            .filter(i => selectedItems.includes(i.id_servico_mao_de_obra))
            .reduce((acc, curr) => acc + Number(curr.valor), 0);
        return sumItems + (Number(extraValue) || 0);
    }, [funcPendentes, selectedItems, extraValue]);

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
                    onClick={() => setShowPayModal(true)}
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
                    {/* Date Filters could go here */}
                </div>

                {activeTab === 'PENDENTE' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                <tr>
                                    <th className="p-4">OS / Data</th>
                                    <th className="p-4">Colaborador</th>
                                    <th className="p-4">Veículo / Cliente</th>
                                    <th className="p-4 text-right">Valor Comissão</th>
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
                                                    <div className="text-xs font-bold text-neutral-700">{item.ordem_de_servico?.veiculo?.modelo}</div>
                                                    <div className="text-[10px] text-neutral-400">{item.ordem_de_servico?.cliente?.pessoa_fisica?.pessoa?.nome || item.ordem_de_servico?.cliente?.pessoa_juridica?.razao_social}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">R$ {Number(item.valor).toFixed(2)}</span>
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
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {Array.isArray(historico) && historico.flatMap(h => {
                                    // If COMISSAO and has items, explode them.
                                    if (h.tipo_lancamento === 'COMISSAO' && h.servicos_pagos && h.servicos_pagos.length > 0) {
                                        const items = h.servicos_pagos.map((s: any) => ({
                                            type: 'ITEM',
                                            parent: h,
                                            item: s
                                        }));
                                        // Add Extra/Premium row if exists separately? 
                                        // User wants to see lines. If there is extra value, it should be a separate line or attached to header?
                                        // Let's show a header line ONLY if there is extra value or global obs, otherwise just items?
                                        // User wants "3 OSs, linha a linha".
                                        // If I show items, I obscure the total payment event.
                                        // But I can show a summary row if needed.
                                        // For now, let's show items. And if there is "Premio", show a separate row for Prize?
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
                                                        <span className="bg-neutral-800 text-white text-[10px] font-black px-1.5 rounded">OS #{os.id_os}</span>
                                                        <span className="text-xs font-bold text-neutral-600">{os.veiculo?.modelo} <span className="font-normal text-neutral-400">({os.veiculo?.placa})</span></span>
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

            {/* MODAL NOVO PAGAMENTO */}
            {showPayModal && (
                <Modal title="Novo Pagamento" onClose={() => setShowPayModal(false)} className="max-w-5xl">
                    <PayModalContent 
                        funcionarios={funcionarios}
                        selectedFuncionarioId={selectedFuncionarioId}
                        setSelectedFuncionarioId={setSelectedFuncionarioId}
                        funcPendentes={funcPendentes}
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        extraValue={extraValue}
                        setExtraValue={setExtraValue}
                        obsExtra={obsExtra}
                        setObsExtra={setObsExtra}
                        obsPagamento={obsPagamento}
                        setObsPagamento={setObsPagamento}
                        handlePay={handlePay}
                        modalTotal={modalTotal}
                        navigate={navigate}
                    />
                </Modal>
            )}
        </div>
    );
};

// Sub-component to manage complex modal state/logic cleanly
const PayModalContent = ({ 
    funcionarios, selectedFuncionarioId, setSelectedFuncionarioId,
    funcPendentes, selectedItems, setSelectedItems,
    extraValue, setExtraValue, obsExtra, setObsExtra, obsPagamento, setObsPagamento,
    handlePay, navigate 
}: any) => {
    const [tipoLancamento, setTipoLancamento] = useState<'COMISSAO' | 'SALARIO' | 'VALE'>('COMISSAO');
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
    
    // Periodo Referencia Salario
    const [refInicio, setRefInicio] = useState('');
    const [refFim, setRefFim] = useState('');

    const activeFunc = funcionarios.find((f: any) => String(f.id_funcionario) === String(selectedFuncionarioId));

    // Filter Logic
    const filteredItems = useMemo(() => {
        if (tipoLancamento !== 'COMISSAO') return [];
        return funcPendentes.filter((item: any) => {
            if (!filterStart && !filterEnd) return true;
            const dateStr = item.ordem_de_servico?.dt_finalizacao || item.ordem_de_servico?.dt_entrega || item.ordem_de_servico?.dt_abertura;
            const osDate = dateStr ? new Date(dateStr) : null;
            if (!osDate) return true;
            
            const start = filterStart ? new Date(filterStart) : new Date('1900-01-01');
            const end = filterEnd ? new Date(filterEnd) : new Date('2100-01-01');
            end.setHours(23,59,59);

            return osDate >= start && osDate <= end;
        });
    }, [funcPendentes, filterStart, filterEnd, tipoLancamento]);

    const handleSelectAll = () => {
        if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredItems.map((i: any) => i.id_servico_mao_de_obra));
        }
    };

    const isAllSelected = filteredItems.length > 0 && selectedItems.length === filteredItems.length;

    // Override parent total calculation for display if not commisison
    const displayTotal = useMemo(() => {
        if (tipoLancamento === 'COMISSAO') {
             const sumItems = funcPendentes
                .filter((i: any) => selectedItems.includes(i.id_servico_mao_de_obra))
                .reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);
            return sumItems + (Number(extraValue) || 0);
        } else {
            return Number(extraValue) || 0;
        }
    }, [tipoLancamento, funcPendentes, selectedItems, extraValue]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. SELEÇÃO DE FUNCIONÁRIO */}
                <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Colaborador</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <select
                            value={selectedFuncionarioId}
                            onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none text-neutral-700"
                        >
                            <option value="">Selecione...</option>
                            {funcionarios.map((f: any) => (
                                <option key={f.id_funcionario} value={f.id_funcionario}>
                                    {f.pessoa_fisica?.pessoa?.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 2. TIPO DE LANÇAMENTO */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Tipo de Lançamento</label>
                    <div className="flex gap-2 p-1 bg-neutral-50 rounded-xl border border-neutral-200 w-fit">
                        {['COMISSAO', 'SALARIO', 'VALE'].map(type => (
                             <button
                                key={type}
                                onClick={() => {
                                    setTipoLancamento(type as any);
                                    if (type !== 'COMISSAO') setSelectedItems([]); // Clear commission selection
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                    tipoLancamento === type 
                                    ? 'bg-neutral-900 text-white shadow' 
                                    : 'text-neutral-500 hover:bg-white'
                                }`}
                             >
                                {type === 'COMISSAO' ? 'Comissões' : type === 'SALARIO' ? 'Salário Mensal' : 'Vale / Adiant.'}
                             </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* 3. CONTEÚDO DINÂMICO */}
            {selectedFuncionarioId && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                    
                    {/* VISUALIZAÇÃO DE COMISSÕES */}
                    {tipoLancamento === 'COMISSAO' && (
                        <>
                            {/* FILTRO DE DATA */}
                            <div className="flex gap-4 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">De (Data OS)</label>
                                    <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Até</label>
                                    <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[400px]">
                                <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" className="w-5 h-5 accent-primary-600 rounded-md cursor-pointer" checked={isAllSelected} onChange={handleSelectAll} />
                                        <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">{isAllSelected ? 'Desmarcar Todos' : 'Marcar Todos'}</span>
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400">{filteredItems.length} itens encontrados</span>
                                </div>
                                
                                <div className="overflow-y-auto p-2 space-y-2">
                                    {filteredItems.length === 0 ? (
                                        <p className="p-8 text-center text-sm text-neutral-400 italic">Nenhuma comissão pendente encontrada neste período.</p>
                                    ) : (
                                        filteredItems.map((item: any) => {
                                            const comissaoPercent = activeFunc?.comissao || 0;
                                            const valorComissao = Number(item.valor);
                                            // Back-calculate Base Labor Value: Base = Comissao / (% / 100)
                                            // AVOID DIVISION BY ZERO
                                            const baseLabor = comissaoPercent > 0 ? (valorComissao / (comissaoPercent / 100)) : 0; 

                                            return (
                                                <label key={item.id_servico_mao_de_obra} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                                    selectedItems.includes(item.id_servico_mao_de_obra)
                                                    ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-200'
                                                    : 'bg-white border-neutral-100 hover:border-primary-200'
                                                }`}>
                                                    <input 
                                                        type="checkbox"
                                                        className="mt-1 w-5 h-5 accent-primary-600 rounded-md"
                                                        checked={selectedItems.includes(item.id_servico_mao_de_obra)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedItems([...selectedItems, item.id_servico_mao_de_obra]);
                                                            else setSelectedItems(selectedItems.filter((id: number) => id !== item.id_servico_mao_de_obra));
                                                        }}
                                                    />
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-neutral-200 text-neutral-800 text-[10px] font-black px-1.5 rounded">OS #{item.id_os}</span>
                                                            <span className="text-xs font-bold text-neutral-700">
                                                                {new Date(item.ordem_de_servico?.dt_entrega || item.ordem_de_servico?.dt_abertura).toLocaleDateString()}
                                                            </span>
                                                            {/* External Link Button */}
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.preventDefault(); 
                                                                    e.stopPropagation();
                                                                    navigate('/ordem-de-servico', { state: { highlightOsId: item.id_os } });
                                                                }}
                                                                className="ml-2 text-neutral-400 hover:text-primary-600 transition-colors"
                                                                title="Visualizar OS"
                                                            >
                                                                <ExternalLink size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="text-xs text-neutral-600 font-medium md:text-right">
                                                            {item.ordem_de_servico?.cliente?.pessoa_fisica?.pessoa?.nome || item.ordem_de_servico?.cliente?.pessoa_juridica?.razao_social}
                                                        </div>
                                                        
                                                        <div className="col-span-1 md:col-span-2 text-xs text-neutral-800">
                                                            <span className="font-bold">{item.ordem_de_servico?.veiculo?.modelo}</span> • {item.ordem_de_servico?.veiculo?.cor} • {item.ordem_de_servico?.veiculo?.placa}
                                                        </div>

                                                        {/* CALCULATED VALUES DISPLAY */}
                                                        <div className="col-span-1 md:col-span-2 flex items-center gap-3 mt-2 text-xs bg-neutral-50 p-2 rounded border border-neutral-100">
                                                            <div>
                                                                <span className="text-neutral-400 uppercase tracking-wider font-bold text-[9px]">M.O. Total</span>
                                                                <p className="font-bold text-neutral-700">R$ {baseLabor.toFixed(2)}</p>
                                                            </div>
                                                            <div className="text-neutral-300">|</div>
                                                            <div>
                                                                <span className="text-neutral-400 uppercase tracking-wider font-bold text-[9px]">Comissão</span>
                                                                <p className="font-bold text-neutral-700">{comissaoPercent}%</p>
                                                            </div>
                                                            <div className="text-neutral-300">|</div>
                                                            <div>
                                                                <span className="text-neutral-400 uppercase tracking-wider font-bold text-[9px]">A Receber</span>
                                                                <p className="font-black text-emerald-600">R$ {valorComissao.toFixed(2)}</p>
                                                            </div>
                                                        </div>

                                                        {(item.ordem_de_servico?.defeito_relatado || item.ordem_de_servico?.diagnostico) && (
                                                            <div className="col-span-1 md:col-span-2 text-[10px] text-neutral-600 mt-1">
                                                                {item.ordem_de_servico?.defeito_relatado && <span className="mr-2"><span className="font-bold">Defeito:</span> {item.ordem_de_servico.defeito_relatado}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end justify-center h-full">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedItems.includes(item.id_servico_mao_de_obra)} 
                                                            readOnly 
                                                            className="w-5 h-5 accent-emerald-500 pointer-events-none" 
                                                        />
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* SALARIO / VALE - DATA RANGE */}
                    {tipoLancamento !== 'COMISSAO' && (
                        <div className="grid grid-cols-2 gap-4 bg-amber-50 p-6 rounded-2xl border border-amber-100">
                            <div className="col-span-2 text-amber-800 font-bold flex items-center gap-2">
                                <Calendar size={18} />
                                Referência do Pagamento
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">De (Início Período)</label>
                                <input type="date" value={refInicio} onChange={e => setRefInicio(e.target.value)} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">Até (Fim Período)</label>
                                <input type="date" value={refFim} onChange={e => setRefFim(e.target.value)} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
                            </div>
                        </div>
                    )}


                    {/* EXTRAS E PAGAMENTO */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">
                                    {tipoLancamento === 'COMISSAO' ? 'Prêmio / Extra (R$)' : 'Valor a Pagar (R$)'}
                                </label>
                                <input 
                                    type="number"
                                    value={extraValue}
                                    onChange={e => setExtraValue(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                                    placeholder="0,00"
                                />
                            </div>
                            {tipoLancamento === 'COMISSAO' && (
                                <div>
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Motivo do Prêmio</label>
                                    <input 
                                        value={obsExtra}
                                        onChange={e => setObsExtra(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="Meta, Aniversário..."
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Forma Pagamento</label>
                            <select 
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="DINHEIRO">DINHEIRO</option>
                                <option value="PIX">PIX</option>
                                <option value="TRANSFERENCIA">TRANSFERÊNCIA</option>
                            </select>
                        </div>
                        <div>
                             <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Obs Geral</label>
                            <input 
                                value={obsPagamento}
                                onChange={e => setObsPagamento(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
                                placeholder="Ref..."
                            />
                        </div>
                    </div>

                    {/* TOTAL E AÇÃO */}
                    <div className="bg-neutral-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-xl shadow-neutral-900/10">
                        <div>
                            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
                            <p className="text-3xl font-black tracking-tight">R$ {displayTotal.toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={() => handlePay(paymentMethod, tipoLancamento, refInicio, refFim)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={displayTotal <= 0}
                        >
                            Confirmar <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

