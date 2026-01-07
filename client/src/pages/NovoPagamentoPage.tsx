
import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { StatusBanner } from '../components/ui/StatusBanner';
import { User, ArrowRight, Calculator, CheckCircle2, Circle, DollarSign, CheckSquare, Square } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const NovoPagamentoPage = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const location = useLocation();

    const [funcPendentes, setFuncPendentes] = useState<any[]>([]); // Comissões Pendentes
    const [valesPendentes, setValesPendentes] = useState<any[]>([]); // Vales Pendentes

    // Selection
    const [selectedItems, setSelectedItems] = useState<number[]>([]); // IDs Comissões
    const [selectedVales, setSelectedVales] = useState<number[]>([]); // IDs Vales

    // MODE: 'PAGAMENTO' (Full) or 'ADIANTAMENTO' (Simple Vale)
    const [mode, setMode] = useState<'PAGAMENTO' | 'ADIANTAMENTO'>('PAGAMENTO');

    // Values
    const [valorSalario, setValorSalario] = useState(''); // Salário Base (Editable)
    const [valorPremio, setValorPremio] = useState('');   // Prêmio Extra
    
    // Common Inputs
    const [obsExtra, setObsExtra] = useState(''); // Obs Prêmio
    const [obsPagamento, setObsPagamento] = useState(''); // Obs Geral
    const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');

    // Simple Adiantamento Inputs
    const [valorAdiantamento, setValorAdiantamento] = useState('');
    const [dataAdiantamento, setDataAdiantamento] = useState(new Date().toISOString().split('T')[0]);

    // Date Filters (Comissões)
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    // --- EFFECTS ---
    useEffect(() => {
        loadFuncionarios();
    }, []);

    // Auto-select from navigation state
    useEffect(() => {
        if (location.state?.funcionarioId && funcionarios.length > 0) {
            setSelectedFuncionarioId(String(location.state.funcionarioId));
            // Clear state to avoid re-triggering if needed, but react-router handles this cleanly ideally
            // window.history.replaceState({}, document.title); 
        }
    }, [location.state, funcionarios]);

    useEffect(() => {
        if (selectedFuncionarioId) {
            loadData(selectedFuncionarioId);
            
            // Auto-fill Salary from selected Funcionario
            const func = funcionarios.find(f => String(f.id_funcionario) === String(selectedFuncionarioId));
            if (func && func.salario) {
                setValorSalario(String(func.salario));
            } else {
                setValorSalario('');
            }
        } else {
            setFuncPendentes([]);
            setValesPendentes([]);
            setSelectedItems([]);
            setSelectedVales([]);
            setValorSalario('');
        }
    }, [selectedFuncionarioId, funcionarios]);

    // --- LOADERS ---
    const loadFuncionarios = async () => {
        try { const res = await api.get('/funcionario'); setFuncionarios(res.data); } catch (e) { console.error(e); }
    };

    const loadData = async (id: string) => {
        try {
            // 1. Comissões
            const resComissao = await api.get(`/pagamento-equipe/pendentes/${id}`);
            setFuncPendentes(resComissao.data);
            // Auto-select Finalized Commissions
            setSelectedItems(
                resComissao.data
                    .filter((i: any) => i.ordem_de_servico?.status === 'FINALIZADA')
                    .map((i: any) => i.id_servico_mao_de_obra)
            );

            // 2. Vales Pendentes
            const resVales = await api.get(`/pagamento-equipe/vales/${id}`);
            setValesPendentes(resVales.data);
            // Auto-select ALL Vales by default for Deduction
            setSelectedVales(resVales.data.map((v: any) => v.id_pagamento_equipe));

        } catch (error) { console.error(error); }
    };

    // --- FILTERS ---
    const filteredComissioes = useMemo(() => {
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
    }, [funcPendentes, filterStart, filterEnd]);

    // --- TOTALS (Mode PAGAMENTO) ---
    // Helper to calculate commission value per item
    const getCommissionValue = (itemVal: number) => {
        const func = funcionarios.find(f => String(f.id_funcionario) === String(selectedFuncionarioId));
        const pct = func?.comissao || 0;
        return (itemVal * pct) / 100;
    };

    const totalComissoes = useMemo(() => {
        return funcPendentes
            .filter(i => selectedItems.includes(i.id_servico_mao_de_obra))
            .reduce((acc, curr) => {
                const comissao = getCommissionValue(Number(curr.valor));
                return acc + comissao;
            }, 0);
    }, [funcPendentes, selectedItems, funcionarios, selectedFuncionarioId]);

    const totalDescontos = useMemo(() => {
        // Sum of SELECTED Vales to deduct
        return valesPendentes
            .filter(v => selectedVales.includes(v.id_pagamento_equipe))
            .reduce((acc, v) => acc + Number(v.valor_total), 0);
    }, [valesPendentes, selectedVales]);

    const finalTotalPagamento = useMemo(() => {
        const salario = Number(valorSalario) || 0;
        const premios = Number(valorPremio) || 0;
        return (salario + totalComissoes + premios) - totalDescontos;
    }, [valorSalario, totalComissoes, valorPremio, totalDescontos]);


    // --- HANDLERS ---
    const handleSelectAllComissoes = () => {
        const payables = filteredComissioes.filter((i: any) => i.ordem_de_servico?.status === 'FINALIZADA');
        const allSelected = payables.length > 0 && payables.every((p: any) => selectedItems.includes(p.id_servico_mao_de_obra));
        if (allSelected) setSelectedItems([]);
        else setSelectedItems(payables.map((i: any) => i.id_servico_mao_de_obra));
    };

    const handleSelectAllVales = () => {
        if (valesPendentes.length === selectedVales.length) setSelectedVales([]);
        else setSelectedVales(valesPendentes.map(v => v.id_pagamento_equipe));
    };

    const handlePay = async () => {
        if (!selectedFuncionarioId) return;

        try {
            if (mode === 'ADIANTAMENTO') {
                // Post ADIANTAMENTO (Vale)
                await api.post('/pagamento-equipe', {
                    id_funcionario: selectedFuncionarioId,
                    servicos_ids: [],
                    vales_ids: [], // No deduction when creating a vale
                    valor_total: valorAdiantamento,
                    obs: obsPagamento, // General Obs
                    forma_pagamento: paymentMethod,
                    premio_valor: null,
                    tipo_lancamento: 'VALE', // Backend uses VALE for Adiantamento
                    referencia_inicio: dataAdiantamento ? new Date(dataAdiantamento) : null // Use ref date as creation date override if needed, or just obs
                });
            } else {
                // Post PAGAMENTO (Full)
                await api.post('/pagamento-equipe', {
                    id_funcionario: selectedFuncionarioId,
                    servicos_ids: selectedItems,
                    vales_ids: selectedVales, // Deduct these vales
                    valor_total: finalTotalPagamento, // Net Value
                    obs: obsPagamento,
                    forma_pagamento: paymentMethod,
                    premio_valor: valorPremio || null,
                    premio_descricao: obsExtra || null,
                    tipo_lancamento: 'COMISSAO', // Or 'PAGAMENTO' if backend supports, keeping 'COMISSAO' for now as it consolidates OSs
                    referencia_inicio: null
                });
            }

            setStatusMsg({ type: 'success', text: 'Lançamento realizado com sucesso!' });
            setTimeout(() => navigate('/pagamento-equipe'), 1500);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao processar lançamento.' });
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                     <button onClick={() => navigate('/pagamento-equipe')} className="text-sm font-bold text-neutral-500 hover:text-neutral-800 mb-1 flex items-center gap-1">
                        <ArrowRight className="rotate-180" size={14} /> Voltar
                     </button>
                     <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Novo Pagamento / Adiantamento</h1>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. SELEÇÃO DE COLABORADOR */}
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

                {/* 2. TIPO DE LANÇAMENTO (MODE) */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-2">Modo de Lançamento</label>
                    <div className="flex gap-2 p-1 bg-neutral-50 rounded-xl border border-neutral-200 w-fit">
                         <button
                            onClick={() => setMode('PAGAMENTO')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                mode === 'PAGAMENTO' 
                                ? 'bg-neutral-900 text-white shadow' 
                                : 'text-neutral-500 hover:bg-white'
                            }`}
                         >
                            Pagamento (Salário/Comissões)
                         </button>
                         <button
                            onClick={() => setMode('ADIANTAMENTO')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                mode === 'ADIANTAMENTO' 
                                ? 'bg-amber-500 text-white shadow' 
                                : 'text-neutral-500 hover:bg-white'
                            }`}
                         >
                            Adiantamento (Novo Vale)
                         </button>
                    </div>
                </div>

            </div>

            {selectedFuncionarioId && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* LEFT COLUMN: DETAILS */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* CARD COMISSÕES (Only in PAGAMENTO mode) */}
                        {mode === 'PAGAMENTO' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                                <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
                                    <h3 className="font-black text-neutral-700 flex items-center gap-2">
                                        <Calculator size={18} className="text-primary-500" /> Comissões
                                        <span className="text-xs font-normal text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                                            {funcionarios.find(f => String(f.id_funcionario) === String(selectedFuncionarioId))?.comissao || 0}%
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleSelectAllComissoes} className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700">
                                            {selectedItems.length > 0 && selectedItems.length >= filteredComissioes.filter((i:any) => i.ordem_de_servico?.status === 'FINALIZADA').length ? 'Desmarcar Todas' : 'Marcar Todas'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 border-b border-neutral-100 bg-white">
                                    <div>
                                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1">De</label>
                                        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Até</label>
                                        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-bold outline-none" />
                                    </div>
                                </div>
                                
                                <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 bg-neutral-50/30">
                                    {filteredComissioes.length === 0 ? (
                                        <div className="p-8 text-center text-neutral-400 text-sm italic">Nenhuma comissão pendente.</div>
                                    ) : (
                                        filteredComissioes.map((item: any) => {
                                            const isPayable = item.ordem_de_servico?.status === 'FINALIZADA';
                                            const isSelected = selectedItems.includes(item.id_servico_mao_de_obra);
                                            const os = item.ordem_de_servico;
                                            const valorComissao = getCommissionValue(Number(item.valor));
                                            
                                            return (
                                                <div 
                                                    key={item.id_servico_mao_de_obra}
                                                    onClick={() => { if (isPayable) isSelected ? setSelectedItems(prev => prev.filter(id => id !== item.id_servico_mao_de_obra)) : setSelectedItems(prev => [...prev, item.id_servico_mao_de_obra]) }}
                                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${isSelected ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-100' : isPayable ? 'bg-white border-neutral-200 hover:border-primary-200' : 'bg-neutral-100 border-neutral-100 opacity-60 cursor-not-allowed'}`}
                                                >
                                                    <div className={`mt-1 ${isSelected ? 'text-primary-600' : isPayable ? 'text-neutral-300' : 'text-neutral-200'}`}>
                                                        {isSelected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        {/* ROW 1: Header */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 uppercase">OS #{item.id_os}</span>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${
                                                                    os?.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    os?.status === 'ABERTA' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                                    os?.status === 'CANCELADA' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    os?.status === 'PAGA_CLIENTE' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                                                    'bg-gray-50 text-gray-500 border-gray-100'
                                                                }`}>{os?.status ? os.status.replace(/_/g, ' ') : 'N/A'}</span>
                                                                {!isPayable && <span className="text-[10px] font-bold text-red-400 uppercase ml-2">(Não Finalizada)</span>}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-black text-emerald-600 text-lg">R$ {valorComissao.toFixed(2)}</span>
                                                                <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wide">Valor Serviço: R$ {Number(item.valor).toFixed(2)}</div>
                                                            </div>
                                                        </div>

                                                        {/* ROW 2: Vehicle */}
                                                        <div className="flex items-center gap-2 text-sm text-neutral-800">
                                                            <span className="font-bold">{os?.veiculo?.modelo}</span>
                                                            <span className="text-neutral-300">•</span>
                                                            <span className="text-neutral-600">{os?.veiculo?.cor}</span>
                                                            <span className="text-neutral-300">•</span>
                                                            <span className="font-mono bg-neutral-100 px-1 rounded text-neutral-600 text-xs">{os?.veiculo?.placa}</span>
                                                        </div>

                                                        {/* ROW 3: Client */}
                                                        <div className="text-xs font-bold text-neutral-500">
                                                            Cliente: <span className="text-neutral-700">{os?.cliente?.pessoa_fisica?.pessoa?.nome || os?.cliente?.pessoa_juridica?.razao_social || 'Desconhecido'}</span>
                                                        </div>

                                                        {/* ROW 4: Defect/Diag */}
                                                        {(os?.defeito_relatado || os?.diagnostico) && (
                                                            <div className="bg-neutral-50 p-2 rounded-lg text-[11px] space-y-1 mt-1 border border-neutral-100/50">
                                                                {os?.defeito_relatado && <div className="text-neutral-600"><strong className="text-neutral-400 uppercase tracking-wider text-[9px]">Defeito:</strong> {os.defeito_relatado}</div>}
                                                                {os?.diagnostico && <div className="text-neutral-600"><strong className="text-neutral-400 uppercase tracking-wider text-[9px]">Diag:</strong> {os.diagnostico}</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* CARD ADIANTAMENTOS PENDENTES (Histórico) */}
                        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                             <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                                <h3 className="font-black text-amber-800 flex items-center gap-2">
                                    <DollarSign size={18} className="text-amber-600" /> 
                                    {mode === 'PAGAMENTO' ? 'Descontar Adiantamentos Pendentes' : 'Histórico de Adiantamentos Pendentes'}
                                </h3>
                                {mode === 'PAGAMENTO' && (
                                    <button onClick={handleSelectAllVales} className="text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-900">
                                        {valesPendentes.length > 0 && selectedVales.length === valesPendentes.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[250px] overflow-y-auto p-2 space-y-2 bg-neutral-50/30">
                                {valesPendentes.length === 0 ? (
                                    <div className="p-6 text-center text-neutral-400 text-sm italic">O colaborador não possui adiantamentos pendentes.</div>
                                ) : (
                                    valesPendentes.map((vale: any) => {
                                        const isSelected = selectedVales.includes(vale.id_pagamento_equipe);
                                        // In Adiantamento mode, items are not selectable (read-only list)
                                        const isReadOnly = mode === 'ADIANTAMENTO'; 

                                        return (
                                            <div 
                                                key={vale.id_pagamento_equipe}
                                                onClick={() => !isReadOnly && (isSelected ? setSelectedVales(prev => prev.filter(id => id !== vale.id_pagamento_equipe)) : setSelectedVales(prev => [...prev, vale.id_pagamento_equipe]))}
                                                className={`p-3 rounded-xl border transition-all flex gap-3 ${!isReadOnly ? 'cursor-pointer hover:border-amber-200' : ''} ${isSelected && !isReadOnly ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-100' : 'bg-white border-neutral-200'}`}
                                            >
                                                {!isReadOnly && (
                                                     <div className={`mt-1 ${isSelected ? 'text-amber-600' : 'text-neutral-300'}`}>
                                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>
                                                )}
                                                <div className="flex-1 flex justify-between items-center">
                                                    <div>
                                                        <div className="text-xs font-bold text-neutral-800">
                                                            Lançado em {new Date(vale.dt_pagamento).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-[10px] text-neutral-500 italic mt-0.5">{vale.obs || 'Sem observação'}</div>
                                                    </div>
                                                    <span className="font-black text-red-500 text-sm font-mono">- R$ {Number(vale.valor_total).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                            {valesPendentes.length > 0 && mode === 'PAGAMENTO' && (
                                <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Total a Descontar: </span>
                                    <span className="text-sm font-black text-red-600">R$ {totalDescontos.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY & ACTIONS */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        {/* CARD FORMULÁRIO (Context Sensitive) */}
                        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6 space-y-4">
                            <h3 className="font-black text-neutral-900 text-lg">Detalhes</h3>
                            
                            {mode === 'PAGAMENTO' ? (
                                <>
                                    {/* PAGAMENTO MODE INPUTS */}
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Pagamento (Base Salarial R$)</label>
                                        <input 
                                            type="number"
                                            value={valorSalario}
                                            onChange={e => setValorSalario(e.target.value)}
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Prêmios / Extras (R$)</label>
                                        <input 
                                            type="number"
                                            value={valorPremio}
                                            onChange={e => setValorPremio(e.target.value)}
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {valorPremio && (
                                        <div>
                                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Motivo do Prêmio</label>
                                            <input value={obsExtra} onChange={e => setObsExtra(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-xs outline-none" placeholder="Ex: Meta Batida" />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* ADIANTAMENTO MODE INPUTS */}
                                     <div>
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Valor do Novo Adiantamento (R$)</label>
                                        <input 
                                            type="number"
                                            value={valorAdiantamento}
                                            onChange={e => setValorAdiantamento(e.target.value)}
                                            className="w-full px-4 py-3 bg-neutral-50 border-amber-200 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500/20 text-amber-900"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Data do Lançamento</label>
                                        <input 
                                            type="date"
                                            value={dataAdiantamento}
                                            onChange={e => setDataAdiantamento(e.target.value)}
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold outline-none"
                                        />
                                    </div>
                                </>
                            )}
                            
                             <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Forma Pagto</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-sm outline-none">
                                    <option value="DINHEIRO">Dinheiro</option>
                                    <option value="PIX">Pix</option>
                                    <option value="TRANSFERENCIA">Transferência</option>
                                </select>
                             </div>

                             <div>
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Obs Geral</label>
                                <textarea value={obsPagamento} onChange={e => setObsPagamento(e.target.value)} className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-xs outline-none" rows={2} />
                             </div>
                        </div>

                        {/* TOTAL FINAL CARD (Only in PAGAMENTO mode, or just Button in Adiantamento) */}
                        {mode === 'PAGAMENTO' ? (
                            <div className="bg-neutral-900 text-white rounded-3xl shadow-xl shadow-neutral-900/10 p-6 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>(+) Pagamento</span>
                                        <span className="font-bold text-emerald-400">R$ {(Number(valorSalario)||0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>(+) Comissões</span>
                                        <span className="font-bold text-emerald-400">R$ {totalComissoes.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>(+) Prêmios</span>
                                        <span className="font-bold text-emerald-400">R$ {(Number(valorPremio)||0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-400 pt-1 border-t border-dashed border-neutral-800">
                                        <span>(-) Descontos</span>
                                        <span className="font-bold text-red-400">R$ {totalDescontos.toFixed(2)}</span>
                                    </div>

                                    <div className="border-t border-neutral-800 my-2 pt-3 flex justify-between items-end">
                                        <span className="font-black uppercase tracking-widest text-xs text-white">Total a Pagar</span>
                                        <span className="font-black text-3xl">R$ {finalTotalPagamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handlePay}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Pagamento
                                </button>
                            </div>
                        ) : (
                             <div className="bg-amber-500 text-white rounded-3xl shadow-xl shadow-amber-900/10 p-6 space-y-4">
                                <div className="flex justify-between items-end border-b border-white/20 pb-4">
                                    <span className="font-black uppercase tracking-widest text-xs text-amber-100">Valor Adiantamento</span>
                                    <span className="font-black text-3xl">R$ {Number(valorAdiantamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <button 
                                    onClick={handlePay}
                                    className="w-full bg-white text-amber-600 hover:bg-amber-50 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95"
                                >
                                    Confirmar Lançamento
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};
