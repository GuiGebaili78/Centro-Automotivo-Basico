import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IPessoaFisica } from '../types/backend';
import { PessoaFisicaForm } from '../components/forms/PessoaFisicaForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit, UserCheck } from 'lucide-react';

export const PessoaFisicaPage = () => {
    const [pessoasFisicas, setPessoasFisicas] = useState<IPessoaFisica[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IPessoaFisica | null>(null);

    useEffect(() => {
        loadPessoasFisicas();
    }, []);

    const loadPessoasFisicas = async () => {
        try {
            const response = await api.get('/pessoa-fisica');
            setPessoasFisicas(response.data);
        } catch (error) {
            alert('Erro ao carregar pessoas físicas');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/pessoa-fisica/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Pessoa Física não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/pessoa-fisica/${editData.id_pessoa_fisica}`, editData);
            alert('Pessoa Física atualizada!');
            loadPessoasFisicas();
        } catch (error) {
            alert('Erro ao atualizar pessoa física');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/pessoa-fisica/${searchId}`);
            alert('Pessoa Física deletada!');
            loadPessoasFisicas();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar pessoa física');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pessoas Físicas</h1>
                    <p className="text-slate-500">Especialização de Pessoa com CPF.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Nova Pessoa Física
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID PF</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID Pessoa</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">CPF</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pessoasFisicas.map((pf) => (
                            <tr key={pf.id_pessoa_fisica} className="hover:bg-slate-50">
                                <td className="p-4 text-gray-500 font-mono">#{pf.id_pessoa_fisica}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                            <UserCheck size={18} />
                                        </div>
                                        <span className="font-medium text-slate-900">ID: {pf.id_pessoa}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-700">{pf.cpf || '-'}</td>
                                <td className="p-4 text-xs text-slate-500">
                                    {new Date(pf.dt_cadastro).toLocaleDateString('pt-BR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MANAGE */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">Manutenção (Por ID)</h2>
                <div className="flex gap-4 mb-4">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="Digite o ID da Pessoa Física..." 
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
                        <h3 className="font-bold mb-2">Editando PF #{editData.id_pessoa_fisica}</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold block mb-1">CPF</label>
                                <input 
                                    value={editData.cpf || ''} 
                                    onChange={(e) => setEditData({...editData, cpf: e.target.value})} 
                                    className="border p-2 w-full rounded" 
                                    maxLength={11}
                                />
                            </div>
                        </div>
                        <button onClick={handleUpdate} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold">
                            <Edit size={18} /> Salvar Alterações
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <Modal title="Nova Pessoa Física" onClose={() => setShowModal(false)}>
                    <PessoaFisicaForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadPessoasFisicas();
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
