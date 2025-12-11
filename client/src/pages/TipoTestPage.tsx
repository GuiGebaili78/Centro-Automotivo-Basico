import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { ITipo } from '../types/backend';

export const TipoTestPage = () => {
    const [tipos, setTipos] = useState<ITipo[]>([]);
    const [formData, setFormData] = useState<{
        funcao: string;
    }>({
        funcao: '',
    });

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

    const handleCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/tipo', formData);
            alert('Tipo criado!');
            loadTipos();
            setFormData({ funcao: '' });
        } catch (error) {
            alert('Erro ao criar tipo');
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
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Tipos</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Novo Tipo</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                    <input name="funcao" value={formData.funcao} onChange={handleCreateChange} placeholder="Função" className="border p-1 w-full" required />
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Salvar Tipo</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Tipo (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID do Tipo" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.funcao || ''} 
                            onChange={(e) => setEditData({...editData, funcao: e.target.value})} 
                            placeholder="Função" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Tipos</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">Função</th>
                            <th className="p-2 border">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tipos.map((t) => (
                            <tr key={t.id_tipo} className="border-t">
                                <td className="p-2 border">{t.id_tipo}</td>
                                <td className="p-2 border">{t.funcao}</td>
                                <td className="p-2 border">{new Date(t.dt_cadastro).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
