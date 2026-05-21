import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IPessoa } from '../types/backend';
import { PessoaForm } from '../components/pessoa/Forms/PessoaForm';
import { Modal, Input, Select } from '../components/ui';
import { Plus, Search, Trash2, Edit, User } from 'lucide-react';

export const PessoaPage = () => {
    const [pessoas, setPessoas] = useState<IPessoa[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IPessoa | null>(null);

    useEffect(() => {
        loadPessoas();
    }, []);

    const loadPessoas = async () => {
        try {
            const response = await api.get('/pessoa');
            setPessoas(response.data);
        } catch (error) {
            alert('Erro ao carregar pessoas');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/pessoa/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Pessoa não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/pessoa/${editData.id_pessoa}`, editData);
            alert('Pessoa atualizada!');
            loadPessoas();
        } catch (error) {
            alert('Erro ao atualizar pessoa');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/pessoa/${searchId}`);
            alert('Pessoa deletada!');
            loadPessoas();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar pessoa');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gerenciar Pessoas</h1>
                    <p className="text-slate-500">Cadastro base de pessoas (antes de PF/PJ).</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Nova Pessoa
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Gênero</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Data Nascimento</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pessoas.map((p) => (
                            <tr key={p.id_pessoa} className="hover:bg-slate-50">
                                <td className="p-4 text-gray-500 font-mono">#{p.id_pessoa}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                            <User size={18} />
                                        </div>
                                        <div className="font-medium text-slate-900">{p.nome}</div>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-600">{p.genero || '-'}</td>
                                <td className="p-4 text-slate-600">
                                    {p.dt_nascimento ? new Date(p.dt_nascimento).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="p-4 text-xs text-slate-500">
                                    {new Date(p.dt_cadastro).toLocaleDateString('pt-BR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MANAGE */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">Manutenção de Pessoa (Por ID)</h2>
                <div className="flex gap-4 mb-4 items-end">
                    <div className="w-64">
                        <Input 
                            type="number" 
                            value={searchId} 
                            onChange={(e) => setSearchId(e.target.value)} 
                            placeholder="Digite o ID da Pessoa..." 
                        />
                    </div>
                    <button onClick={handleSearch} className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 font-medium h-11">
                        <Search size={18} /> Localizar
                    </button>
                    {searchId && <button onClick={handleDelete} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2.5 rounded-lg hover:bg-red-200 font-medium h-11">
                        <Trash2 size={18} /> Excluir
                    </button>}
                </div>

                {editData && (
                    <div className="bg-slate-50 p-4 rounded border animate-in fade-in">
                        <h3 className="font-bold mb-2">Editando: {editData.nome}</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="col-span-2">
                                <Input 
                                    label="Nome"
                                    value={editData.nome} 
                                    onChange={(e) => setEditData({...editData, nome: e.target.value})} 
                                />
                            </div>
                            <div>
                                <Select 
                                    label="Gênero"
                                    value={editData.genero || ''} 
                                    onChange={(e) => setEditData({...editData, genero: e.target.value})} 
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro</option>
                                </Select>
                            </div>
                        </div>
                        <button onClick={handleUpdate} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-bold">
                            <Edit size={18} /> Salvar Alterações
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <Modal title="Nova Pessoa" onClose={() => setShowModal(false)}>
                    <PessoaForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadPessoas();
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
