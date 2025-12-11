import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IPessoaFisica } from '../types/backend';

export const PessoaFisicaTestPage = () => {
    const [pessoasFisicas, setPessoasFisicas] = useState<IPessoaFisica[]>([]);
    const [formData, setFormData] = useState<{
        id_pessoa: string;
        cpf: string;
    }>({
        id_pessoa: '',
        cpf: '',
    });

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

    const handleCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                id_pessoa: Number(formData.id_pessoa)
            };
            await api.post('/pessoa-fisica', payload);
            alert('Pessoa Física criada!');
            loadPessoasFisicas();
            setFormData({ id_pessoa: '', cpf: '' });
        } catch (error) {
            alert('Erro ao criar pessoa física. Verifique se o ID Pessoa existe e não tem PF vinculada.');
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
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Pessoas Físicas</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Nova Pessoa Física</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                    <input type="number" name="id_pessoa" value={formData.id_pessoa} onChange={handleCreateChange} placeholder="ID Pessoa (Existente)" className="border p-1 w-full" required />
                    <input name="cpf" value={formData.cpf} onChange={handleCreateChange} placeholder="CPF" className="border p-1 w-full" />
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Salvar Pessoa Física</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Pessoa Física (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Pessoa Física" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.cpf || ''} 
                            onChange={(e) => setEditData({...editData, cpf: e.target.value})} 
                            placeholder="CPF" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Pessoas Físicas</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID PF</th>
                            <th className="p-2 border">ID Pessoa</th>
                            <th className="p-2 border">CPF</th>
                            <th className="p-2 border">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pessoasFisicas.map((pf) => (
                            <tr key={pf.id_pessoa_fisica} className="border-t">
                                <td className="p-2 border">{pf.id_pessoa_fisica}</td>
                                <td className="p-2 border">{pf.id_pessoa}</td>
                                <td className="p-2 border">{pf.cpf}</td>
                                <td className="p-2 border">{new Date(pf.dt_cadastro).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
