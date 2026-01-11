import { useState, useEffect } from 'react';
import { api } from '../services/api';
// import { Modal } from '../components/ui/Modal'; // Removed
import { Button } from '../components/ui/Button';
import { FuncionarioForm } from '../components/forms/FuncionarioForm';
import { StatusBanner } from '../components/ui/StatusBanner';
import { 
    Plus, Search, Trash2, Edit, Users, UserCog, User, Briefcase, Phone
} from 'lucide-react';
import type { IFuncionario } from '../types/backend';

export const FuncionarioPage = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [funcionarios, setFuncionarios] = useState<IFuncionario[]>([]);
    const [editData, setEditData] = useState<IFuncionario | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    useEffect(() => {
        if (view === 'list') {
            loadFuncionarios();
        }
    }, [view]);

    const loadFuncionarios = async () => {
        try {
            const response = await api.get('/funcionario');
            setFuncionarios(response.data);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao carregar colaboradores.' });
        }
    };

    const handleDeleteFuncionario = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover este colaborador?')) return;
        try {
            await api.delete(`/funcionario/${id}`);
            setStatusMsg({ type: 'success', text: 'Colaborador removido.' });
            loadFuncionarios();
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error) {
            console.error(error);
            setStatusMsg({ type: 'error', text: 'Erro ao remover colaborador.' });
        }
    };

    const handleNew = () => {
        setEditData(null);
        setView('form');
    };

    const handleEdit = (func: IFuncionario) => {
        setEditData(func);
        setView('form');
    };

    const handleFormSuccess = () => {
        setStatusMsg({ type: 'success', text: editData ? 'Cadastro atualizado!' : 'Novo colaborador cadastrado!' });
        setView('list');
        setEditData(null);
        setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
    };

    const filteredFuncionarios = funcionarios.filter(f => {
        const nome = f.pessoa_fisica?.pessoa?.nome?.toLowerCase() || '';
        const cpf = f.pessoa_fisica?.cpf || '';
        const search = searchTerm.toLowerCase();
        return nome.includes(search) || cpf.includes(search);
    });

    // RENDER FORM
    if (view === 'form') {
        return (
            <div className="space-y-6">
                 <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />
                 <FuncionarioForm 
                    initialData={editData}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                        setView('list');
                        setEditData(null);
                    }}
                 />
            </div>
        );
    }

    // RENDER LIST
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Equipe & MEI</h1>
                    <p className="text-neutral-500">Gestão de colaboradores e prestadores de serviço.</p>
                </div>
                <Button 
                    onClick={handleNew}
                    className="shadow-xl shadow-black/10"
                >
                    <Plus size={20} /> Novo Colaborador
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                    <input 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar por nome ou CPF..." 
                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 outline-none font-bold"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredFuncionarios.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-3xl border border-neutral-100">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                                <Users size={40} />
                            </div>
                            <p className="font-bold text-neutral-400">Nenhum colaborador encontrado.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                    <th className="p-6">Colaborador</th>
                                    <th className="p-6">Cargo / Função</th>
                                    <th className="p-6">Contato</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {filteredFuncionarios.map((f) => (
                                    <tr key={f.id_funcionario} className="hover:bg-neutral-50/50 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500 font-black">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-neutral-900">{f.pessoa_fisica?.pessoa?.nome}</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase">CPF: {f.pessoa_fisica?.cpf || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                                    <Briefcase size={14} />
                                                </div>
                                                <span className="font-bold text-neutral-600 text-xs">{f.cargo}</span>
                                            </div>
                                            {f.especialidade && (
                                                <p className="text-[10px] text-neutral-400 font-medium ml-8 mt-1">{f.especialidade}</p>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-neutral-600 text-xs font-bold">
                                                    <Phone size={12} className="text-neutral-400" />
                                                    {f.telefone_pessoal || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {f.ativo === 'S' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wide">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wide">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Inativo
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(f)}
                                                    className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteFuncionario(f.id_funcionario)}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
