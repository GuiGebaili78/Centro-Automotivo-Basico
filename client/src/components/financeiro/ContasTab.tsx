import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { 
    Plus, Edit2, Trash2, Landmark, Eye, EyeOff, FileText 
} from 'lucide-react';
import type { IContaBancaria } from '../../types/backend';
import { StatusBanner } from '../ui/StatusBanner';

export const ContasTab = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<IContaBancaria[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<IContaBancaria | null>(null);
    const [formData, setFormData] = useState<Partial<IContaBancaria>>({
        nome: '',
        banco: '',
        agencia: '',
        conta: '',
        saldo_atual: 0,
        ativo: true
    });
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });
    const [showBalance, setShowBalance] = useState<Record<number, boolean>>({});

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const res = await api.get('/conta-bancaria');
            setAccounts(res.data);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar contas bancárias.' });
        }
    };

    const handleOpenCreate = () => {
        setEditingAccount(null);
        setFormData({
            nome: '',
            banco: '',
            agencia: '',
            conta: '',
            saldo_atual: 0,
            ativo: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (acc: IContaBancaria) => {
        setEditingAccount(acc);
        setFormData({
            nome: acc.nome,
            banco: acc.banco || '',
            agencia: acc.agencia || '',
            conta: acc.conta || '',
            saldo_atual: Number(acc.saldo_atual),
            ativo: acc.ativo
        });
        setIsModalOpen(true);
    };

    const handleOpenStatement = (acc: IContaBancaria) => {
        navigate(`/financeiro/extrato/${acc.id_conta}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await api.put(`/conta-bancaria/${editingAccount.id_conta}`, formData);
                setStatusMsg({ type: 'success', text: 'Conta atualizada com sucesso!' });
            } else {
                await api.post('/conta-bancaria', formData);
                setStatusMsg({ type: 'success', text: 'Conta criada com sucesso!' });
            }
            setIsModalOpen(false);
            loadAccounts();
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao salvar conta.' });
        }
    };

    const toggleDelete = async (acc: IContaBancaria) => {
        if (!window.confirm(`Tem certeza que deseja ${acc.ativo ? 'desativar' : 'ativar'} esta conta?`)) return;
        try {
            await api.put(`/conta-bancaria/${acc.id_conta}`, { ativo: !acc.ativo });
            loadAccounts();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao alterar status da conta.' });
        }
    };

    const toggleBalanceVisibility = (id: number) => {
        setShowBalance(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="p-6">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-bold text-neutral-800">Contas Bancárias e Caixas</h2>
                    <p className="text-neutral-500 text-sm">Gerencie onde o dinheiro entra e sai.</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all text-sm shadow-lg shadow-neutral-900/10"
                >
                    <Plus size={18} />
                    Nova Conta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <div key={acc.id_conta} className={`bg-white p-6 rounded-2xl border ${acc.ativo ? 'border-neutral-200' : 'border-neutral-100 opacity-60'} shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-neutral-100 p-3 rounded-xl text-neutral-600">
                                <Landmark size={24} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenEdit(acc)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => toggleDelete(acc)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-bold text-lg text-neutral-900 truncate">{acc.nome}</h3>
                            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{acc.banco || 'Caixa Físico'}</p>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-xl mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-neutral-400 uppercase">Saldo Atual</span>
                                <button onClick={() => toggleBalanceVisibility(acc.id_conta)} className="text-neutral-400 hover:text-neutral-600">
                                    {showBalance[acc.id_conta] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <div className={`text-2xl font-black ${Number(acc.saldo_atual) < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                                {showBalance[acc.id_conta] 
                                    ? `R$ ${Number(acc.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                    : '----'
                                }
                            </div>
                        </div>

                        <button 
                            onClick={() => handleOpenStatement(acc)}
                            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <FileText size={16} />
                            Ver Extrato
                        </button>

                        {!acc.ativo && (
                            <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                Inativo
                            </div>
                        )}
                    </div>
                ))}

                {/* Empty State Card */}
                <button onClick={handleOpenCreate} className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-neutral-400 hover:border-neutral-300 hover:bg-neutral-50 transition-all min-h-[250px] group">
                    <div className="bg-neutral-100 p-4 rounded-full group-hover:bg-neutral-200 transition-colors">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-sm">Adicionar Conta</span>
                </button>
            </div>

            {/* MODAL EDIT/CREATE */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-black text-neutral-900 mb-6">
                            {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome / Apelido</label>
                                <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400" placeholder="Ex: Nubank, Caixa Gaveta..." />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Banco (Opcional)</label>
                                    <input type="text" value={formData.banco || ''} onChange={e => setFormData({...formData, banco: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Saldo Inicial (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        disabled={!!editingAccount} 
                                        value={formData.saldo_atual} 
                                        onChange={e => setFormData({...formData, saldo_atual: Number(e.target.value)})} 
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400 disabled:opacity-60" 
                                    />
                                    {editingAccount && <p className="text-[10px] text-neutral-400 mt-1">Ajuste via Movimentações.</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Agência</label>
                                    <input type="text" value={formData.agencia || ''} onChange={e => setFormData({...formData, agencia: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Conta</label>
                                    <input type="text" value={formData.conta || ''} onChange={e => setFormData({...formData, conta: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-neutral-900 outline-none focus:border-neutral-400" />
                                </div>
                            </div>
                            
                            {!editingAccount && (
                                <div className="p-4 bg-yellow-50 text-yellow-800 text-xs rounded-xl font-medium">
                                    Atenção: O saldo inicial será registrado como primeira movimentação se for maior que zero.
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 shadow-lg">{editingAccount ? 'Salvar' : 'Criar Conta'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
};
