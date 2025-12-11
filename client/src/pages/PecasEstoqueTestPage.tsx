import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IPecasEstoque } from '../types/backend';

export const PecasEstoqueTestPage = () => {
    const [pecas, setPecas] = useState<IPecasEstoque[]>([]);
    const [formData, setFormData] = useState<{
        nome: string;
        descricao: string;
        fabricante: string;
        valor_custo: string;
        valor_venda: string;
        estoque_atual: string;
        unidade_medida: string;
    }>({
        nome: '',
        descricao: '',
        fabricante: '',
        valor_custo: '',
        valor_venda: '',
        estoque_atual: '',
        unidade_medida: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IPecasEstoque | null>(null);

    useEffect(() => {
        loadPecas();
    }, []);

    const loadPecas = async () => {
        try {
            const response = await api.get('/pecas-estoque');
            setPecas(response.data);
        } catch (error) {
            alert('Erro ao carregar peças');
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
                valor_custo: Number(formData.valor_custo),
                valor_venda: Number(formData.valor_venda),
                estoque_atual: Number(formData.estoque_atual)
            };
            await api.post('/pecas-estoque', payload);
            alert('Peça criada!');
            loadPecas();
            setFormData({
                nome: '',
                descricao: '',
                fabricante: '',
                valor_custo: '',
                valor_venda: '',
                estoque_atual: '',
                unidade_medida: '',
            });
        } catch (error) {
            alert('Erro ao criar peça');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/pecas-estoque/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Peça não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
             const payload = {
                ...editData,
                valor_custo: Number(editData.valor_custo),
                valor_venda: Number(editData.valor_venda),
                estoque_atual: Number(editData.estoque_atual)
             }
            await api.put(`/pecas-estoque/${editData.id_pecas_estoque}`, payload);
            alert('Peça atualizada!');
            loadPecas();
        } catch (error) {
            alert('Erro ao atualizar peça');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/pecas-estoque/${searchId}`);
            alert('Peça deletada!');
            loadPecas();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar peça');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Estoque de Peças</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Nova Peça</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2 grid grid-cols-2 gap-2">
                    <input name="nome" value={formData.nome} onChange={handleCreateChange} placeholder="Nome" className="border p-1 w-full" required />
                    <input name="descricao" value={formData.descricao} onChange={handleCreateChange} placeholder="Descrição" className="border p-1 w-full" required />
                    <input name="fabricante" value={formData.fabricante} onChange={handleCreateChange} placeholder="Fabricante" className="border p-1 w-full" />
                    <input name="unidade_medida" value={formData.unidade_medida} onChange={handleCreateChange} placeholder="UN Medida" className="border p-1 w-full" />
                    <input type="number" step="0.01" name="valor_custo" value={formData.valor_custo} onChange={handleCreateChange} placeholder="Valor Custo" className="border p-1 w-full" required />
                    <input type="number" step="0.01" name="valor_venda" value={formData.valor_venda} onChange={handleCreateChange} placeholder="Valor Venda" className="border p-1 w-full" required />
                    <input type="number" name="estoque_atual" value={formData.estoque_atual} onChange={handleCreateChange} placeholder="Estoque Atual" className="border p-1 w-full" required />
                    
                    <button type="submit" className="col-span-2 bg-blue-500 text-white px-4 py-2 rounded">Salvar Peça</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Peça (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Peça" 
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
                            type="number"
                            value={editData.estoque_atual} 
                            onChange={(e) => setEditData({...editData, estoque_atual: Number(e.target.value)})} 
                            placeholder="Estoque" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Peças</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">Nome</th>
                            <th className="p-2 border">Fabricante</th>
                            <th className="p-2 border">Estoque</th>
                            <th className="p-2 border">Valor Venda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pecas.map((p) => (
                            <tr key={p.id_pecas_estoque} className="border-t">
                                <td className="p-2 border">{p.id_pecas_estoque}</td>
                                <td className="p-2 border">{p.nome}</td>
                                <td className="p-2 border">{p.fabricante}</td>
                                <td className="p-2 border">{p.estoque_atual}</td>
                                <td className="p-2 border">{Number(p.valor_venda).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
