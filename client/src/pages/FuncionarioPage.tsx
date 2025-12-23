import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IFuncionario } from '../types/backend';
import { FuncionarioForm } from '../components/forms/FuncionarioForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit, Briefcase, BadgeCheck, XCircle } from 'lucide-react';
import { StatusBanner } from '../components/ui/StatusBanner';

export const FuncionarioPage = () => {
    const [funcionarios, setFuncionarios] = useState<IFuncionario[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IFuncionario | null>(null);

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    useEffect(() => {
        loadFuncionarios();
    }, []);

    const loadFuncionarios = async () => {
        try {
            const response = await api.get('/funcionario');
            setFuncionarios(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar colaboradores.' });
        }
    };

    const handleSearch = async () => {
        if (!searchId) return;
        try {
            const response = await api.get(`/funcionario/${searchId}`);
            setEditData(response.data);
            setStatusMsg({ type: 'success', text: 'Colaborador localizado!' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 2000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Colaborador não encontrado.' });
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/funcionario/${editData.id_funcionario}`, {
                 cargo: editData.cargo,
                 ativo: editData.ativo,
                 salario: Number(editData.salario),
                 comissao: Number(editData.comissao),
                 obs: editData.obs
            });
            setStatusMsg({ type: 'success', text: 'Colaborador atualizado com sucesso!' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
            loadFuncionarios();
            setEditData(null);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar colaborador.' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;
        try {
            await api.delete(`/funcionario/${id}`);
            setStatusMsg({ type: 'success', text: 'Colaborador removido com sucesso!' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
            loadFuncionarios();
            if (editData?.id_funcionario === id) setEditData(null);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao remover colaborador. Verifique se há vínculos.' });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Equipe e Funcionários</h1>
                    <p className="text-neutral-500">Gestão de colaboradores e acesso ao sistema.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="group bg-neutral-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-black/10 flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Novo Funcionário
                </button>
            </div>

            {/* QUICK SEARCH */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="Buscar funcionário por ID..." 
                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 outline-none font-bold"
                    />
                </div>
                <button 
                    onClick={handleSearch}
                    className="bg-neutral-100 text-neutral-600 px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-neutral-200 transition-all"
                >
                    Localizar
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                            <th className="p-6">Funcionário</th>
                            <th className="p-6">Cargo</th>
                            <th className="p-6">Admissão</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {funcionarios.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                                            <Briefcase size={40} />
                                        </div>
                                        <p className="font-bold text-neutral-400">Nenhum funcionário cadastrado.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            funcionarios.map((f: any) => (
                                <tr key={f.id_funcionario} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-black">
                                                {f.pessoa_fisica?.pessoa?.nome?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-neutral-900">{f.pessoa_fisica?.pessoa?.nome}</p>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase">#{String(f.id_funcionario).padStart(3, '0')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-bold text-neutral-600">{f.cargo}</p>
                                    </td>
                                    <td className="p-6">
                                        <p className="text-sm font-medium text-neutral-500">
                                            {f.dt_admissao ? new Date(f.dt_admissao).toLocaleDateString() : '-'}
                                        </p>
                                    </td>
                                    <td className="p-6">
                                        {f.ativo === 'S' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success-50 text-success-700 rounded-lg text-[10px] font-black uppercase">
                                                <BadgeCheck size={14} /> Ativo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-[10px] font-black uppercase">
                                                <XCircle size={14} /> Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setSearchId(String(f.id_funcionario));
                                                    handleSearch();
                                                }}
                                                className="p-2 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(f.id_funcionario)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* EDIT MODAL/DRAWER */}
            {editData && (
                <div className="bg-neutral-900 p-8 rounded-3xl text-white shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-black flex items-center gap-3">
                                <Edit className="text-primary-400" /> Editando Colaborador
                            </h3>
                            <p className="text-neutral-400 text-sm">#{editData.id_funcionario} • {editData.pessoa_fisica?.pessoa?.nome}</p>
                        </div>
                        <button onClick={() => setEditData(null)} className="text-neutral-500 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="text-[10px] font-black text-neutral-500 uppercase block mb-2">Cargo</label>
                            <input 
                                value={editData.cargo} 
                                onChange={(e) => setEditData({...editData, cargo: e.target.value})} 
                                className="w-full bg-neutral-800 border-none p-4 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none font-bold" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-neutral-500 uppercase block mb-2">Salário Atual</label>
                            <input 
                                type="number"
                                value={editData.salario as any} 
                                onChange={(e) => setEditData({...editData, salario: e.target.value as any})} 
                                className="w-full bg-neutral-800 border-none p-4 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none font-bold" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-neutral-500 uppercase block mb-2">Status</label>
                            <select 
                                value={editData.ativo}
                                onChange={(e) => setEditData({...editData, ativo: e.target.value})}
                                className="w-full bg-neutral-800 border-none p-4 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-primary-400"
                            >
                                <option value="S">ATIVO</option>
                                <option value="N">INATIVO</option>
                            </select>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleUpdate} 
                        className="w-full bg-primary-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-primary-500/20"
                    >
                        Salvar Alterações <BadgeCheck size={20} />
                    </button>
                </div>
            )}

            {showModal && (
                <Modal title="Novo Colaborador" onClose={() => setShowModal(false)}>
                    <FuncionarioForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadFuncionarios();
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
