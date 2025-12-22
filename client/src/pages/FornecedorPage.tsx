import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IFornecedor } from '../types/backend';
import { FornecedorForm } from '../components/forms/FornecedorForm';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { StatusBanner } from '../components/ui/StatusBanner';
import { 
    Plus, Search, Trash2, Edit, Truck, BadgeCheck, Store, Calendar, Phone 
} from 'lucide-react';

export const FornecedorPage = () => {
    const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState<IFornecedor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    useEffect(() => {
        loadFornecedores();
    }, []);

    const loadFornecedores = async () => {
        try {
            const response = await api.get('/fornecedor');
            setFornecedores(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar lista de fornecedores.' });
        }
    };

    const handleUpdateFornecedor = async () => {
        if (!editData) return;
        try {
            await api.put(`/fornecedor/${editData.id_fornecedor}`, editData);
            setStatusMsg({ type: 'success', text: 'Dados atualizados com sucesso!' });
            loadFornecedores();
            setEditData(null);
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao salvar alterações.' });
        }
    };

    const handleDeleteFornecedor = async (id: number) => {
        if (!confirm('Deseja realmente remover este fornecedor?')) return;
        try {
            await api.delete(`/fornecedor/${id}`);
            setStatusMsg({ type: 'success', text: 'Fornecedor removido.' });
            loadFornecedores();
            if (editData?.id_fornecedor === id) setEditData(null);
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao deletar fornecedor.' });
        }
    };

    const filteredFornecedores = fornecedores.filter(f => 
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (f.documento && f.documento.includes(searchTerm))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Gestão de Fornecedores</h1>
                    <p className="text-neutral-500">Cadastro de parceiros de peças.</p>
                </div>
                <Button 
                    onClick={() => setShowModal(true)}
                    className="shadow-xl shadow-black/10"
                >
                    <Plus size={20} /> Novo Fornecedor
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                    <input 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar por nome ou documento..." 
                        className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 outline-none font-bold"
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                            <th className="p-6">Fornecedor</th>
                            <th className="p-6">Documento</th>
                            <th className="p-6">Contato</th>
                            <th className="p-6">Cadastro</th>
                            <th className="p-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {filteredFornecedores.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                                            <Store size={40} />
                                        </div>
                                        <p className="font-bold text-neutral-400">Nenhum fornecedor encontrado.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredFornecedores.map((f) => (
                                <tr key={f.id_fornecedor} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-black">
                                                <Truck size={20} />
                                            </div>
                                            <div>
                                                <p className="font-black text-neutral-900">{f.nome}</p>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase">ID #{String(f.id_fornecedor).padStart(3, '0')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-mono text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-1 rounded w-fit">
                                            {f.documento || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
                                            <Phone size={14} className="text-neutral-400" />
                                            {f.contato || '-'}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-neutral-500 text-xs">
                                            <Calendar size={14} />
                                            {new Date(f.dt_cadastro).toLocaleDateString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditData(f)}
                                                className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteFornecedor(f.id_fornecedor)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                title="Excluir"
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

            {/* EDIT DRAWER */}
            {editData && (
                <div className="bg-neutral-900 p-8 rounded-3xl text-white shadow-2xl fixed inset-y-0 right-0 w-full md:w-[500px] z-50 animate-in slide-in-from-right duration-500 border-l border-neutral-800 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-black flex items-center gap-3">
                                <Edit className="text-orange-500" /> Editando Fornecedor
                            </h3>
                            <p className="text-neutral-400 text-sm">Atualize os dados cadastrais.</p>
                        </div>
                        <button onClick={() => setEditData(null)} className="text-neutral-500 hover:text-white transition-colors">
                            <Plus size={24} className="rotate-45" />
                        </button>
                    </div>
                    
                    <div className="space-y-6 mb-8">
                        <div>
                            <label className="text-[10px] font-black text-neutral-500 uppercase block mb-2">Razão Social / Nome</label>
                            <input 
                                value={editData.nome} 
                                onChange={(e) => setEditData({...editData, nome: e.target.value})} 
                                className="w-full bg-neutral-800 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold placeholder-neutral-600"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-neutral-500 uppercase block mb-2">Documento (CNPJ/CPF)</label>
                            <input 
                                value={editData.documento || ''} 
                                onChange={(e) => setEditData({...editData, documento: e.target.value})} 
                                className="w-full bg-neutral-800 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold placeholder-neutral-600"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-neutral-500 uppercase block mb-2">Contato</label>
                            <input 
                                value={editData.contato || ''} 
                                onChange={(e) => setEditData({...editData, contato: e.target.value})} 
                                className="w-full bg-neutral-800 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold placeholder-neutral-600"
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleUpdateFornecedor} 
                        className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-orange-900/20"
                    >
                        Salvar Alterações <BadgeCheck size={20} />
                    </button>
                </div>
            )}

            {showModal && (
                <Modal title="Novo Fornecedor" onClose={() => setShowModal(false)}>
                    <FornecedorForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadFornecedores();
                            setStatusMsg({ type: 'success', text: 'Fornecedor cadastrado com sucesso!' });
                            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
