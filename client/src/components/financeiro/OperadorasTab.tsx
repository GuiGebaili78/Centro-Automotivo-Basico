import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    Plus, Edit2, CreditCard, X 
} from 'lucide-react';
import type { IOperadoraCartao, IContaBancaria } from '../../types/backend';
import { StatusBanner } from '../ui/StatusBanner';

export const OperadorasTab = () => {
    const [operadoras, setOperadoras] = useState<IOperadoraCartao[]>([]);
    const [contas, setContas] = useState<IContaBancaria[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOp, setEditingOp] = useState<IOperadoraCartao | null>(null);
    const [formData, setFormData] = useState<Partial<IOperadoraCartao>>({
        nome: '',
        taxa_debito: 0,
        prazo_debito: 1,
        taxa_credito_vista: 0,
        prazo_credito_vista: 30,
        taxa_credito_parc: 0,
        prazo_credito_parc: 30,
        taxa_antecipacao: 0,
        antecipacao_auto: false,
        id_conta_destino: 0
    });
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [opRes, accRes] = await Promise.all([
                api.get('/operadora-cartao'),
                api.get('/conta-bancaria')
            ]);
            setOperadoras(opRes.data);
            setContas(accRes.data.filter((c: IContaBancaria) => c.ativo));
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar dados.' });
        }
    };

    const handleOpenCreate = () => {
        setEditingOp(null);
        setFormData({
            nome: '',
            taxa_debito: 0,
            prazo_debito: 1,
            taxa_credito_vista: 0,
            prazo_credito_vista: 30,
            taxa_credito_parc: 0,
            prazo_credito_parc: 30,
            taxa_antecipacao: 0,
            antecipacao_auto: false,
            id_conta_destino: contas.length > 0 ? contas[0].id_conta : 0
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (op: IOperadoraCartao) => {
        setEditingOp(op);
        setFormData({
            ...op,
            taxa_debito: Number(op.taxa_debito),
            taxa_credito_vista: Number(op.taxa_credito_vista),
            taxa_credito_parc: Number(op.taxa_credito_parc),
            taxa_antecipacao: Number(op.taxa_antecipacao)
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOp) {
                await api.put(`/operadora-cartao/${editingOp.id_operadora}`, formData);
                setStatusMsg({ type: 'success', text: 'Operadora atualizada!' });
            } else {
                await api.post('/operadora-cartao', formData);
                setStatusMsg({ type: 'success', text: 'Operadora cadastrada!' });
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao salvar operadora.' });
        }
    };

    return (
        <div className="p-6">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-bold text-neutral-800">Operadoras de Cartão</h2>
                    <p className="text-neutral-500 text-sm">Configure taxas e prazos das suas maquininhas.</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all text-sm"
                >
                    <Plus size={18} />
                    Nova Operadora
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {operadoras.map(op => (
                    <div key={op.id_operadora} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-colors">
                        <div className="absolute top-0 left-0 w-1 h-full bg-neutral-200 group-hover:bg-blue-500 transition-colors"></div>
                        
                        <div className="flex justify-between items-start mb-6 pl-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-neutral-100 p-2 rounded-lg text-neutral-600">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-neutral-900">{op.nome}</h3>
                                    <p className="text-xs text-neutral-500">Conta Destino: {contas.find(c => c.id_conta === op.id_conta_destino)?.nome || '?'}</p>
                                </div>
                            </div>
                            <button onClick={() => handleOpenEdit(op)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-blue-600 transition-colors">
                                <Edit2 size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pl-4">
                            <div className="bg-neutral-50 p-3 rounded-xl">
                                <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Débito</p>
                                <p className="font-bold text-neutral-900">{op.taxa_debito}%</p>
                                <p className="text-[10px] text-neutral-500">D+{op.prazo_debito}</p>
                            </div>
                            <div className="bg-neutral-50 p-3 rounded-xl">
                                <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Créd. Vista</p>
                                <p className="font-bold text-neutral-900">{op.taxa_credito_vista}%</p>
                                <p className="text-[10px] text-neutral-500">D+{op.prazo_credito_vista}</p>
                            </div>
                            <div className="bg-neutral-50 p-3 rounded-xl">
                                <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">Créd. Parc</p>
                                <p className="font-bold text-neutral-900">{op.taxa_credito_parc}%</p>
                                <p className="text-[10px] text-neutral-500">D+{op.prazo_credito_parc}</p>
                            </div>
                        </div>

                        {op.antecipacao_auto && (
                            <div className="mt-4 pl-4 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-full">
                                <span>Antecipação Automática: {op.taxa_antecipacao}%</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

             {/* MODAL */}
             {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-neutral-900">
                                {editingOp ? 'Editar Operadora' : 'Nova Operadora'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-neutral-900" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome da Maquininha</label>
                                    <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400" placeholder="Ex: Stone, PagSeguro..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Conta Bancária de Destino</label>
                                    <select 
                                        required
                                        value={formData.id_conta_destino} 
                                        onChange={e => setFormData({...formData, id_conta_destino: Number(e.target.value)})} 
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400"
                                    >
                                        <option value={0} disabled>Selecione uma conta...</option>
                                        {contas.map(c => (
                                            <option key={c.id_conta} value={c.id_conta}>{c.nome} - {c.banco}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-neutral-50 p-6 rounded-2xl space-y-4">
                                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Taxas e Prazos</h3>
                                
                                {/* DEBITO */}
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 text-sm font-bold text-neutral-700">Débito</div>
                                    <div className="col-span-4">
                                        <div className="relative">
                                            <input type="number" step="0.01" value={formData.taxa_debito} onChange={e => setFormData({...formData, taxa_debito: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 rounded-lg border border-neutral-200 text-sm font-bold" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-4">
                                         <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">Dias</span>
                                            <input type="number" value={formData.prazo_debito} onChange={e => setFormData({...formData, prazo_debito: Number(e.target.value)})} className="w-full pl-12 pr-3 py-2 rounded-lg border border-neutral-200 text-sm font-bold" />
                                        </div>
                                    </div>
                                </div>

                                {/* CRED VISTA */}
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 text-sm font-bold text-neutral-700">Crédito à Vista</div>
                                    <div className="col-span-4">
                                        <div className="relative">
                                            <input type="number" step="0.01" value={formData.taxa_credito_vista} onChange={e => setFormData({...formData, taxa_credito_vista: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 rounded-lg border border-neutral-200 text-sm font-bold" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-4">
                                         <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">Dias</span>
                                            <input type="number" value={formData.prazo_credito_vista} onChange={e => setFormData({...formData, prazo_credito_vista: Number(e.target.value)})} className="w-full pl-12 pr-3 py-2 rounded-lg border border-neutral-200 text-sm font-bold" />
                                        </div>
                                    </div>
                                </div>

                                {/* CRED PARC */}
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4 text-sm font-bold text-neutral-700">Crédito Parcelado</div>
                                    <div className="col-span-4">
                                        <div className="relative">
                                            <input type="number" step="0.01" value={formData.taxa_credito_parc} onChange={e => setFormData({...formData, taxa_credito_parc: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 rounded-lg border border-neutral-200 text-sm font-bold" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-4">
                                         <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">Dias</span>
                                            <input type="number" value={formData.prazo_credito_parc} onChange={e => setFormData({...formData, prazo_credito_parc: Number(e.target.value)})} className="w-full pl-12 pr-3 py-2 rounded-lg border border-neutral-200 text-sm font-bold" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl">
                                <input 
                                    type="checkbox" 
                                    id="auto_antecipa"
                                    checked={formData.antecipacao_auto} 
                                    onChange={e => setFormData({...formData, antecipacao_auto: e.target.checked})} 
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <label htmlFor="auto_antecipa" className="block text-sm font-bold text-neutral-900">Antecipação Automática</label>
                                    <p className="text-xs text-neutral-500">O dinheiro cai no dia seguinte (com taxa extra).</p>
                                </div>
                                {formData.antecipacao_auto && (
                                    <div className="w-24 relative">
                                        <input type="number" step="0.01" value={formData.taxa_antecipacao} onChange={e => setFormData({...formData, taxa_antecipacao: Number(e.target.value)})} className="w-full pl-2 pr-6 py-1 rounded bg-white border border-blue-200 text-sm font-bold" />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">%</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 shadow-lg">Salvar Configurações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
