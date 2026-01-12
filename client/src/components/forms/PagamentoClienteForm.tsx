import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../services/api';
import { CreditCard, DollarSign, CheckCircle, Smartphone } from 'lucide-react';
import type { IOperadoraCartao } from '../../types/backend';

interface PagamentoClienteFormProps {
    osId: number;
    valorTotal: number;
    onSuccess: (payment: any) => void;
    onCancel: () => void;
}

export const PagamentoClienteForm = ({ osId, valorTotal, initialData, onSuccess, onCancel }: PagamentoClienteFormProps & { initialData?: any }) => {
    const [loading, setLoading] = useState(false);
    const [metodo, setMetodo] = useState('CREDITO');
    const [valor, setValor] = useState(String(valorTotal));
    const [bandeira, setBandeira] = useState('');
    const [parcelas, setParcelas] = useState('1');
    const [codigoTransacao, setCodigoTransacao] = useState('');

    useEffect(() => {
        if (initialData) {
            setMetodo(initialData.metodo_pagamento || 'CREDITO');
            setValor(String(initialData.valor));
            setBandeira(initialData.bandeira_cartao || '');
            setParcelas(String(initialData.qtd_parcelas || 1));
            setCodigoTransacao(initialData.codigo_transacao || '');
        }
    }, [initialData]);

    const [operadoras, setOperadoras] = useState<IOperadoraCartao[]>([]);
    const [idOperadora, setIdOperadora] = useState(0);
    
    const [contasBancarias, setContasBancarias] = useState<any[]>([]);
    const [idContaBancaria, setIdContaBancaria] = useState(0);

    const [error, setError] = useState('');

    useEffect(() => {
        loadOperadoras();
        loadContasBancarias();
    }, []);

    const loadOperadoras = async () => {
        try {
            const res = await api.get('/operadora-cartao');
            setOperadoras(res.data);
            // Se houver apenas uma operadora, seleciona automaticamente
            if (res.data.length === 1) {
                setIdOperadora(res.data[0].id_operadora);
            }
        } catch (error) {
            console.error("Erro ao carregar operadoras");
        }
    };

    const loadContasBancarias = async () => {
        try {
            const res = await api.get('/conta-bancaria');
            setContasBancarias(res.data.filter((c: any) => c.ativo));
            // Se houver apenas uma conta, seleciona automaticamente
            if (res.data.length === 1) {
                setIdContaBancaria(res.data[0].id_conta);
            }
        } catch (error) {
            console.error("Erro ao carregar contas bancárias");
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const cleanValor = String(valor).replace(',', '.');
            if (isNaN(Number(cleanValor)) || Number(cleanValor) <= 0) {
                setError('Valor inválido.');
                setLoading(false);
                return;
            }

            const payload = {
                id_os: osId,
                metodo_pagamento: metodo,
                valor: Number(cleanValor),
                data_pagamento: initialData?.data_pagamento || new Date().toISOString(),
                bandeira_cartao: (metodo === 'CREDITO' || metodo === 'DEBITO') ? bandeira : null,
                codigo_transacao: codigoTransacao || null,
                qtd_parcelas: metodo === 'CREDITO' ? Number(parcelas) : 1,
                id_operadora: (metodo === 'CREDITO' || metodo === 'DEBITO') ? idOperadora : undefined,
                id_conta_bancaria: (metodo === 'PIX' || metodo === 'DINHEIRO') ? idContaBancaria : undefined
            };

            let response;
            if (initialData?.id_pagamento_cliente) {
                response = await api.put(`/pagamento-cliente/${initialData.id_pagamento_cliente}`, payload);
            } else {
                response = await api.post('/pagamento-cliente', payload);
            }
            
            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            setError('Erro ao salvar pagamento. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-green-50 p-4 rounded-xl flex items-center gap-3 border border-green-100">
                <DollarSign className="text-green-600" />
                <div>
                    <strong className="block text-green-900 text-sm">{initialData ? 'Editar Pagamento' : 'Registro de Pagamento'}</strong>
                    <p className="text-xs text-green-700">Informe os detalhes do recebimento do cliente.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Valor do Pagamento (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl font-black text-2xl text-green-600 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['CREDITO', 'DEBITO', 'PIX', 'DINHEIRO'].map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMetodo(m)}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${metodo === m ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-white'}`}
                            >
                                {m === 'CREDITO' && <CreditCard size={20} />}
                                {m === 'DEBITO' && <CreditCard size={20} />}
                                {m === 'PIX' && <Smartphone size={20} />}
                                {m === 'DINHEIRO' && <DollarSign size={20} />}
                                <span className="text-[10px] font-bold">{m}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {(metodo === 'CREDITO' || metodo === 'DEBITO') && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bandeira</label>
                            <select 
                                value={bandeira} 
                                onChange={e => setBandeira(e.target.value)}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 font-bold text-gray-700"
                            >
                                <option value="">Selecione...</option>
                                <option value="VISA">Visa</option>
                                <option value="MASTER">Mastercard</option>
                                <option value="ELO">Elo</option>
                                <option value="AMEX">Amex</option>
                                <option value="HIPER">Hipercard</option>
                            </select>
                        </div>
                        {metodo === 'CREDITO' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Parcelas</label>
                                <select 
                                    value={parcelas} 
                                    onChange={e => setParcelas(e.target.value)}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 font-bold text-gray-700"
                                >
                                    {[1,2,3,4,5,6,10,12].map(p => (
                                        <option key={p} value={p}>{p}x</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-2">
                             <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Maquininha / Operadora</label>
                             <select
                                value={idOperadora}
                                onChange={e => setIdOperadora(Number(e.target.value))}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 font-bold text-gray-700"
                            >
                                <option value={0}>Selecione a Maquininha...</option>
                                {operadoras.map(op => (
                                    <option key={op.id_operadora} value={op.id_operadora}>{op.nome}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1">Necessário para cálculo de taxas e recebíveis.</p>
                        </div>
                    </>
                )}

                {(metodo === 'PIX' || metodo === 'DINHEIRO') && (
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Conta Bancária / Destino</label>
                        <select
                            value={idContaBancaria}
                            onChange={e => setIdContaBancaria(Number(e.target.value))}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 font-bold text-gray-700"
                        >
                            <option value={0}>Selecione a Conta...</option>
                            {contasBancarias.map(conta => (
                                <option key={conta.id_conta} value={conta.id_conta}>
                                    {conta.nome} {conta.banco ? `- ${conta.banco}` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">Conta onde o valor será depositado.</p>
                    </div>
                )}

                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        {metodo === 'PIX' ? 'ID da Transação (Pix)' : 'Código de Autorização / NSU'}
                    </label>
                    <input 
                        value={codigoTransacao}
                        onChange={e => setCodigoTransacao(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 font-mono text-sm"
                        placeholder="Opcional"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={onCancel} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 py-3 bg-green-600 text-white font-black uppercase text-xs rounded-xl hover:bg-green-700 shadow-xl shadow-green-200 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? 'Processando...' : <><CheckCircle size={18} /> {initialData ? 'Salvar Alterações' : 'Confirmar Pagamento'}</>}
                </button>
            </div>
        </form>
    );
};
