import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IFuncionario } from '../types/backend';

export const FuncionarioTestPage = () => {
    const [funcionarios, setFuncionarios] = useState<IFuncionario[]>([]);
    const [formData, setFormData] = useState<{
        id_pessoa_fisica: string;
        ativo: string;
        cargo: string;
        salario: string;
        dt_admissao: string;
    }>({
        id_pessoa_fisica: '',
        ativo: 'S',
        cargo: '',
        salario: '',
        dt_admissao: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IFuncionario | null>(null);

    useEffect(() => {
        loadFuncionarios();
    }, []);

    const loadFuncionarios = async () => {
        try {
            const response = await api.get('/funcionario');
            setFuncionarios(response.data);
        } catch (error) {
            alert('Erro ao carregar funcionários');
        }
    };

    const handleCreateChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                id_pessoa_fisica: Number(formData.id_pessoa_fisica),
                salario: Number(formData.salario),
                dt_admissao: new Date(formData.dt_admissao).toISOString()
            };
            await api.post('/funcionario', payload);
            alert('Funcionário criado!');
            loadFuncionarios();
            setFormData({
                id_pessoa_fisica: '',
                ativo: 'S',
                cargo: '',
                salario: '',
                dt_admissao: '',
            });
        } catch (error) {
            alert('Erro ao criar funcionário.');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/funcionario/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Funcionário não encontrado');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/funcionario/${editData.id_funcionario}`, editData);
            alert('Funcionário atualizado!');
            loadFuncionarios();
        } catch (error) {
            alert('Erro ao atualizar funcionário');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/funcionario/${searchId}`);
            alert('Funcionário deletado!');
            loadFuncionarios();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar funcionário');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Funcionários</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Novo Funcionário</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                    <input type="number" name="id_pessoa_fisica" value={formData.id_pessoa_fisica} onChange={handleCreateChange} placeholder="ID Pessoa Física" className="border p-1 w-full" required />
                    <select name="ativo" value={formData.ativo} onChange={handleCreateChange} className="border p-1 w-full">
                        <option value="S">Ativo (S)</option>
                        <option value="N">Inativo (N)</option>
                    </select>
                    <input name="cargo" value={formData.cargo} onChange={handleCreateChange} placeholder="Cargo" className="border p-1 w-full" required />
                    <input type="number" step="0.01" name="salario" value={formData.salario} onChange={handleCreateChange} placeholder="Salário" className="border p-1 w-full" />
                    <input type="date" name="dt_admissao" value={formData.dt_admissao} onChange={handleCreateChange} className="border p-1 w-full" required />
                    
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Salvar Funcionário</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Funcionário (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Funcionário" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.cargo} 
                            onChange={(e) => setEditData({...editData, cargo: e.target.value})} 
                            placeholder="Cargo" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Funcionários</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">ID PF</th>
                            <th className="p-2 border">Cargo</th>
                            <th className="p-2 border">Ativo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {funcionarios.map((f) => (
                            <tr key={f.id_funcionario} className="border-t">
                                <td className="p-2 border">{f.id_funcionario}</td>
                                <td className="p-2 border">{f.id_pessoa_fisica}</td>
                                <td className="p-2 border">{f.cargo}</td>
                                <td className="p-2 border">{f.ativo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
