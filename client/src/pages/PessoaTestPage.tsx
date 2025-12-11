import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IPessoa } from '../types/backend';

export const PessoaTestPage = () => {
    const [pessoas, setPessoas] = useState<IPessoa[]>([]);
    const [formData, setFormData] = useState<{
        nome: string;
        genero: string;
        dt_nascimento: string;
        obs: string;
    }>({
        nome: '',
        genero: '',
        dt_nascimento: '',
        obs: ''
    });

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

    const handleCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                dt_nascimento: formData.dt_nascimento ? new Date(formData.dt_nascimento).toISOString() : null
            };
            await api.post('/pessoa', payload);
            alert('Pessoa criada!');
            loadPessoas();
            setFormData({ nome: '', genero: '', dt_nascimento: '', obs: '' });
        } catch (error) {
            alert('Erro ao criar pessoa');
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
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Pessoas</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Nova Pessoa</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                    <input name="nome" value={formData.nome} onChange={handleCreateChange} placeholder="Nome" className="border p-1 w-full" required />
                    <input name="genero" value={formData.genero} onChange={handleCreateChange} placeholder="Gênero" className="border p-1 w-full" />
                    <input type="date" name="dt_nascimento" value={formData.dt_nascimento} onChange={handleCreateChange} className="border p-1 w-full" />
                    <input name="obs" value={formData.obs} onChange={handleCreateChange} placeholder="Observação" className="border p-1 w-full" />
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Salvar Pessoa</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Pessoa (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID da Pessoa" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.nome} 
                            onChange={(e) => setEditData({...editData, nome: e.target.value})} 
                            placeholder="Nome" 
                            className="border p-1 w-full" 
                        />
                         <input 
                            value={editData.genero || ''} 
                            onChange={(e) => setEditData({...editData, genero: e.target.value})} 
                            placeholder="Gênero" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Pessoas</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">Nome</th>
                            <th className="p-2 border">Gênero</th>
                            <th className="p-2 border">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pessoas.map((p) => (
                            <tr key={p.id_pessoa} className="border-t">
                                <td className="p-2 border">{p.id_pessoa}</td>
                                <td className="p-2 border">{p.nome}</td>
                                <td className="p-2 border">{p.genero}</td>
                                <td className="p-2 border">{new Date(p.dt_cadastro).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
