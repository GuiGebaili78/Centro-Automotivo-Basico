import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IFornecedor } from '../types/backend';
import { FornecedorForm } from '../components/forms/FornecedorForm';
import { Button } from '../components/ui/Button';
import { StatusBanner } from '../components/ui/StatusBanner';
import { 
    Plus, Search, Trash2, Edit, Truck, MapPin, Phone, User
} from 'lucide-react';

export const FornecedorPage = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [fornecedores, setFornecedores] = useState<IFornecedor[]>([]);
    const [editData, setEditData] = useState<IFornecedor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    useEffect(() => {
        if (view === 'list') {
            loadFornecedores();
        }
    }, [view]);

    const loadFornecedores = async () => {
        try {
            const response = await api.get('/fornecedor');
            setFornecedores(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar lista de fornecedores.' });
        }
    };

    const handleDeleteFornecedor = async (id: number) => {
        if (!confirm('Deseja realmente remover este fornecedor?')) return;
        try {
            await api.delete(`/fornecedor/${id}`);
            setStatusMsg({ type: 'success', text: 'Fornecedor removido.' });
            loadFornecedores();
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao deletar fornecedor.' });
        }
    };

    const handleNew = () => {
        setEditData(null);
        setView('form');
    };

    const handleEdit = (f: IFornecedor) => {
        setEditData(f);
        setView('form');
    };

    const handleFormSuccess = () => {
        setStatusMsg({ type: 'success', text: editData ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!' });
        setView('list');
        setEditData(null);
        setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
    };

    const filteredFornecedores = fornecedores.filter(f => 
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (f.documento && f.documento.includes(searchTerm))
    );

    // RENDER: FORM VIEW
    if (view === 'form') {
        return (
            <div className="space-y-6">
                <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />
                <FornecedorForm 
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

    // RENDER: LIST VIEW
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Gestão de Fornecedores</h1>
                    <p className="text-neutral-500">Cadastro de parceiros de peças e serviços.</p>
                </div>
                <Button 
                    onClick={handleNew}
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

            <div className="grid grid-cols-1 gap-4">
                {filteredFornecedores.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-3xl border border-neutral-100">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-neutral-50 p-6 rounded-full text-neutral-200">
                                <Truck size={40} />
                            </div>
                            <p className="font-bold text-neutral-400">Nenhum fornecedor encontrado.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                    <th className="p-6">Fornecedor</th>
                                    <th className="p-6">Documento</th>
                                    <th className="p-6">Localização</th>
                                    <th className="p-6">Contato</th>
                                    <th className="p-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {filteredFornecedores.map((f) => (
                                    <tr key={f.id_fornecedor} className="hover:bg-neutral-50/50 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-black">
                                                    {f.tipo_pessoa === 'FISICA' ? <User size={20} /> : <Truck size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-neutral-900">{f.nome}</p>
                                                    {f.nome_fantasia && <p className="text-xs text-neutral-500 font-medium">{f.nome_fantasia}</p>}
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
                                                <MapPin size={14} className="text-neutral-400" />
                                                {f.cidade ? `${f.cidade}/${f.uf}` : '-'}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
                                                    <Phone size={14} className="text-neutral-400" />
                                                    {f.telefone || f.whatsapp || '-'}
                                                </div>
                                                <span className="text-[10px] text-neutral-400 font-bold uppercase">{f.contato}</span>
                                            </div>
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
                                                    onClick={() => handleDeleteFornecedor(f.id_fornecedor)}
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
