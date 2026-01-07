import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IFuncionario } from '../types/backend';
import { FuncionarioForm } from '../components/forms/FuncionarioForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit, Briefcase, BadgeCheck, XCircle, FileText, CheckCircle } from 'lucide-react';
import { StatusBanner } from '../components/ui/StatusBanner';

export const FuncionarioPage = () => {
    const [funcionarios, setFuncionarios] = useState<IFuncionario[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Edit State
    const [editData, setEditData] = useState<IFuncionario | null>(null);
    const [editCargo, setEditCargo] = useState('');
    const [editSalario, setEditSalario] = useState('');
    const [editComissao, setEditComissao] = useState('');
    const [editAtivo, setEditAtivo] = useState('S');
    const [editObs, setEditObs] = useState('');
    const [editDtAdmissao, setEditDtAdmissao] = useState('');

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

    const handleOpenEdit = (funcionario: IFuncionario) => {
        setEditData(funcionario);
        setEditCargo(funcionario.cargo || '');
        setEditSalario(String(funcionario.salario || ''));
        setEditComissao(String(funcionario.comissao || ''));
        setEditAtivo(funcionario.ativo || 'S');
        setEditObs(funcionario.obs || '');
        setEditDtAdmissao(funcionario.dt_admissao ? new Date(funcionario.dt_admissao).toISOString().split('T')[0] : '');
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/funcionario/${editData.id_funcionario}`, {
                 cargo: editCargo,
                 ativo: editAtivo,
                 salario: Number(editSalario),
                 comissao: Number(editComissao),
                 obs: editObs,
                 dt_admissao: editDtAdmissao ? new Date(editDtAdmissao).toISOString() : null
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
        if (!confirm('Tem certeza que deseja excluir este colaborador?')) return;
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

    // Filter by Name or ID
    const filteredFuncionarios = funcionarios.filter(f => {
        const name = f.pessoa_fisica?.pessoa?.nome?.toLowerCase() || '';
        const id = String(f.id_funcionario);
        const search = searchTerm.toLowerCase();
        return name.includes(search) || id.includes(search);
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Equipe e Colaboradores</h1>
                    <p className="text-neutral-500">Gestão de colaboradores e acesso ao sistema.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="group bg-neutral-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-black/10 flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Novo Colaborador
                </button>
            </div>

            {/* QUICK SEARCH */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                    <input 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar por nome ou ID..." 
                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold placeholder:font-normal"
                    />
                </div>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                            <th className="p-6">Colaborador</th>
                            <th className="p-6">Cargo</th>
                            <th className="p-6">Admissão</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {filteredFuncionarios.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                                            <Briefcase size={40} />
                                        </div>
                                        <p className="font-bold text-neutral-400">Nenhum colaborador encontrado.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredFuncionarios.map((f: IFuncionario) => (
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
                                                onClick={() => handleOpenEdit(f)}
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

            {/* EDIT MODAL STANDARD */}
            {editData && (
                <Modal title={`Editando: ${editData.pessoa_fisica?.pessoa?.nome}`} onClose={() => setEditData(null)} className="max-w-4xl">
                    <div className="space-y-6">
                         {/* INFO HEADER */}
                         <div className="bg-primary-50 p-4 rounded-2xl flex items-center gap-4 border border-primary-100">
                            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/30">
                                {editData.pessoa_fisica?.pessoa?.nome?.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-primary-900 text-lg">{editData.pessoa_fisica?.pessoa?.nome}</h4>
                                <p className="text-sm text-primary-700 font-medium">CPF: {editData.pessoa_fisica?.cpf || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Coluna 1: Dados do Cargo */}
                             <div className="space-y-4">
                                <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={14} /> Dados Contratuais
                                </h3>
                                <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase block mb-1">Cargo</label>
                                    <input 
                                        value={editCargo} 
                                        onChange={(e) => setEditCargo(e.target.value)} 
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-500 uppercase block mb-1">Pagamento (R$)</label>
                                        <input 
                                            type="number"
                                            value={editSalario} 
                                            onChange={(e) => setEditSalario(e.target.value)} 
                                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-500 uppercase block mb-1">Comissão (%)</label>
                                        <input 
                                            type="number"
                                            value={editComissao} 
                                            onChange={(e) => setEditComissao(e.target.value)} 
                                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold" 
                                        />
                                    </div>
                                </div>
                             </div>

                             {/* Coluna 2: Status e Data */}
                             <div className="space-y-4">
                                 <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                     <BadgeCheck size={14} /> Status e Admissão
                                 </h3>
                                 <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase block mb-1">Status do Colaborador</label>
                                    <select 
                                        value={editAtivo}
                                        onChange={(e) => setEditAtivo(e.target.value)}
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-primary-600"
                                    >
                                        <option value="S">ATIVO</option>
                                        <option value="N">INATIVO</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase block mb-1">Data de Admissão</label>
                                    <input 
                                        type="date"
                                        value={editDtAdmissao} 
                                        onChange={(e) => setEditDtAdmissao(e.target.value)} 
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold" 
                                    />
                                </div>
                             </div>

                             {/* Obs - Full Width */}
                             <div className="col-span-1 md:col-span-2 space-y-4">
                                 <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                     <FileText size={14} /> Observações
                                 </h3>
                                 <textarea 
                                    value={editObs} 
                                    onChange={(e) => setEditObs(e.target.value)} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-medium text-neutral-800 min-h-[100px] resize-none" 
                                    placeholder="Observações internas..."
                                />
                             </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                             <button 
                                onClick={() => setEditData(null)}
                                className="px-6 py-3 rounded-xl font-bold text-neutral-500 hover:bg-neutral-50 transition-colors uppercase text-xs"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleUpdate}
                                className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs hover:bg-primary-600 transition-all shadow-lg flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </Modal>
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
