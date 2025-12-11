import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IItensOs } from '../types/backend';

export const ItensOsTestPage = () => {
    const [itens, setItens] = useState<IItensOs[]>([]);
    const [formData, setFormData] = useState<{
        id_os: string;
        id_pecas_estoque: string;
        descricao: string;
        qtd: string;
        valor_unt: string;
        valor_total: string;
    }>({
        id_os: '',
        id_pecas_estoque: '',
        descricao: '',
        qtd: '',
        valor_unt: '',
        valor_total: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IItensOs | null>(null);

    useEffect(() => {
        loadItens();
    }, []);

    const loadItens = async () => {
        try {
            const response = await api.get('/itens-os');
            setItens(response.data);
        } catch (error) {
            alert('Erro ao carregar itens');
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
                id_os: Number(formData.id_os),
                id_pecas_estoque: formData.id_pecas_estoque ? Number(formData.id_pecas_estoque) : null,
                qtd: Number(formData.qtd),
                valor_unt: Number(formData.valor_unt),
                valor_total: Number(formData.valor_total)
            };
            await api.post('/itens-os', payload);
            alert('Item criado!');
            loadItens();
            setFormData({
                id_os: '',
                id_pecas_estoque: '',
                descricao: '',
                qtd: '',
                valor_unt: '',
                valor_total: '',
            });
        } catch (error) {
            alert('Erro ao criar item');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/itens-os/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Item não encontrado');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
             const payload = {
                ...editData,
                qtd: Number(editData.qtd),
                valor_unt: Number(editData.valor_unt),
                valor_total: Number(editData.valor_total)
             }
            await api.put(`/itens-os/${editData.id_iten}`, payload);
            alert('Item atualizado!');
            loadItens();
        } catch (error) {
            alert('Erro ao atualizar item');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/itens-os/${searchId}`);
            alert('Item deletado!');
            loadItens();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar item');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Itens de OS</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Novo Item</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2 grid grid-cols-2 gap-2">
                    <input type="number" name="id_os" value={formData.id_os} onChange={handleCreateChange} placeholder="ID OS" className="border p-1 w-full" required />
                    <input type="number" name="id_pecas_estoque" value={formData.id_pecas_estoque} onChange={handleCreateChange} placeholder="ID Peça (Opcional)" className="border p-1 w-full" />
                    <input name="descricao" value={formData.descricao} onChange={handleCreateChange} placeholder="Descrição" className="col-span-2 border p-1 w-full" required />
                    <input type="number" name="qtd" value={formData.qtd} onChange={handleCreateChange} placeholder="Quantidade" className="border p-1 w-full" required />
                    <input type="number" step="0.01" name="valor_unt" value={formData.valor_unt} onChange={handleCreateChange} placeholder="Valor Unitário" className="border p-1 w-full" required />
                    <input type="number" step="0.01" name="valor_total" value={formData.valor_total} onChange={handleCreateChange} placeholder="Valor Total" className="border p-1 w-full" required />
                    
                    <button type="submit" className="col-span-2 bg-blue-500 text-white px-4 py-2 rounded">Salvar Item</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Item (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Item" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.descricao} 
                            onChange={(e) => setEditData({...editData, descricao: e.target.value})} 
                            placeholder="Descrição" 
                            className="border p-1 w-full" 
                        />
                         <input 
                            type="number"
                            value={editData.qtd} 
                            onChange={(e) => setEditData({...editData, qtd: Number(e.target.value)})} 
                            placeholder="Quantidade" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Itens</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">ID OS</th>
                            <th className="p-2 border">Descrição</th>
                            <th className="p-2 border">Qtd</th>
                            <th className="p-2 border">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.map((i) => (
                            <tr key={i.id_iten} className="border-t">
                                <td className="p-2 border">{i.id_iten}</td>
                                <td className="p-2 border">{i.id_os}</td>
                                <td className="p-2 border">{i.descricao}</td>
                                <td className="p-2 border">{i.qtd}</td>
                                <td className="p-2 border">{Number(i.valor_total).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
