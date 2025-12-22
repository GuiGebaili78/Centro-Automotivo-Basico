import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ITipo } from '../types/backend';
import { TipoForm } from '../components/forms/TipoForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit, Tag } from 'lucide-react';

export const TipoPage = () => {
    const [tipos, setTipos] = useState<ITipo[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<ITipo | null>(null);

    useEffect(() => {
        loadTipos();
    }, []);

    const loadTipos = async () => {
        try {
            const response = await api.get('/tipo');
            setTipos(response.data);
        } catch (error) {
            alert('Erro ao carregar tipos');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/tipo/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Tipo não encontrado');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/tipo/${editData.id_tipo}`, editData);
            alert('Tipo atualizado!');
            loadTipos();
        } catch (error) {
            alert('Erro ao atualizar tipo');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/tipo/${searchId}`);
            alert('Tipo deletado!');
            loadTipos();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar tipo');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tipos / Funções</h1>
                    <p className="text-slate-500">Categorias e funções de pessoas/empresas.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Novo Tipo
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Função</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tipos.map((t) => (
                            <tr key={t.id_tipo} className="hover:bg-slate-50">
                                <td className="p-4 text-gray-500 font-mono">#{t.id_tipo}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-50 p-2 rounded-lg text-green-600">
                                            <Tag size={18} />
                                        </div>
                                        <span className="font-medium text-slate-900">{t.funcao || 'Sem função definida'}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-xs text-slate-500">
                                    {new Date(t.dt_cadastro).toLocaleDateString('pt-BR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MANAGE */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">Manutenção de Tipo (Por ID)</h2>
                <div className="flex gap-4 mb-4">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="Digite o ID do Tipo..." 
                        className="border p-2 rounded w-64"
                    />
                    <button onClick={handleSearch} className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700">
                        <Search size={18} /> Localizar
                    </button>
                    {searchId && <button onClick={handleDelete} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
                        <Trash2 size={18} /> Excluir
                    </button>}
                </div>

                {editData && (
                    <div className="bg-slate-50 p-4 rounded border animate-in fade-in">
                        <h3 className="font-bold mb-2">Editando Tipo #{editData.id_tipo}</h3>
                        <div className="mb-4">
                            <label className="text-xs font-bold block mb-1">Função</label>
                            <input 
                                value={editData.funcao || ''} 
                                onChange={(e) => setEditData({...editData, funcao: e.target.value})} 
                                className="border p-2 w-full rounded" 
                            />
                        </div>
                        <button onClick={handleUpdate} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold">
                            <Edit size={18} /> Salvar Alterações
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <Modal title="Novo Tipo" onClose={() => setShowModal(false)}>
                    <TipoForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadTipos();
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
