import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IPessoaJuridica } from '../types/backend';
import { PessoaJuridicaForm } from '../components/forms/PessoaJuridicaForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit, Building2 } from 'lucide-react';

export const PessoaJuridicaPage = () => {
    const [pessoasJuridicas, setPessoasJuridicas] = useState<IPessoaJuridica[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IPessoaJuridica | null>(null);

    useEffect(() => {
        loadPessoasJuridicas();
    }, []);

    const loadPessoasJuridicas = async () => {
        try {
            const response = await api.get('/pessoa-juridica');
            setPessoasJuridicas(response.data);
        } catch (error) {
            alert('Erro ao carregar pessoas jurídicas');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/pessoa-juridica/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Pessoa Jurídica não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/pessoa-juridica/${editData.id_pessoa_juridica}`, editData);
            alert('Pessoa Jurídica atualizada!');
            loadPessoasJuridicas();
        } catch (error) {
            alert('Erro ao atualizar pessoa jurídica');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/pessoa-juridica/${searchId}`);
            alert('Pessoa Jurídica deletada!');
            loadPessoasJuridicas();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar pessoa jurídica');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pessoas Jurídicas</h1>
                    <p className="text-slate-500">Especialização de Pessoa com CNPJ.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Nova Pessoa Jurídica
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID PJ</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Empresa</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">CNPJ</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID Pessoa</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pessoasJuridicas.map((pj) => (
                            <tr key={pj.id_pessoa_juridica} className="hover:bg-slate-50">
                                <td className="p-4 text-gray-500 font-mono">#{pj.id_pessoa_juridica}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{pj.razao_social}</div>
                                            {pj.nome_fantasia && <div className="text-xs text-slate-500">{pj.nome_fantasia}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-700">{pj.cnpj || '-'}</td>
                                <td className="p-4 text-slate-600">ID: {pj.id_pessoa}</td>
                                <td className="p-4 text-xs text-slate-500">
                                    {new Date(pj.dt_cadastro).toLocaleDateString('pt-BR')}
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
                        placeholder="Digite o ID da Pessoa Jurídica..." 
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
                        <h3 className="font-bold mb-2">Editando: {editData.razao_social}</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold block mb-1">Razão Social</label>
                                <input 
                                    value={editData.razao_social} 
                                    onChange={(e) => setEditData({...editData, razao_social: e.target.value})} 
                                    className="border p-2 w-full rounded" 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1">CNPJ</label>
                                <input 
                                    value={editData.cnpj || ''} 
                                    onChange={(e) => setEditData({...editData, cnpj: e.target.value})} 
                                    className="border p-2 w-full rounded" 
                                    maxLength={14}
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
                <Modal title="Nova Pessoa Jurídica" onClose={() => setShowModal(false)}>
                    <PessoaJuridicaForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadPessoasJuridicas();
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
