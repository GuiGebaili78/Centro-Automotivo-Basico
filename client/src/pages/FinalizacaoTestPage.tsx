import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IFinalizacao } from '../types/backend';

export const FinalizacaoTestPage = () => {
    const [finalizacoes, setFinalizacoes] = useState<IFinalizacao[]>([]);
    const [formData, setFormData] = useState<{
        id_os: string;
        valor_peca_entrada: string;
        valor_peca_saida: string;
        valor_pago_funcionario: string;
        obs: string;
    }>({
        id_os: '',
        valor_peca_entrada: '',
        valor_peca_saida: '',
        valor_pago_funcionario: '',
        obs: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IFinalizacao | null>(null);

    useEffect(() => {
        loadFinalizacoes();
    }, []);

    const loadFinalizacoes = async () => {
        try {
            const response = await api.get('/finalizacao');
            setFinalizacoes(response.data);
        } catch (error) {
            alert('Erro ao carregar finalizações');
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
                valor_peca_entrada: formData.valor_peca_entrada ? Number(formData.valor_peca_entrada) : null,
                valor_peca_saida: formData.valor_peca_saida ? Number(formData.valor_peca_saida) : null,
                valor_pago_funcionario: formData.valor_pago_funcionario ? Number(formData.valor_pago_funcionario) : null
            };
            await api.post('/finalizacao', payload);
            alert('Finalização criada!');
            loadFinalizacoes();
            setFormData({
                id_os: '',
                valor_peca_entrada: '',
                valor_peca_saida: '',
                valor_pago_funcionario: '',
                obs: '',
            });
        } catch (error) {
            alert('Erro ao criar finalização. Verifique se ID OS existe e é 1:1.');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/finalizacao/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Finalização não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            const payload = {
                ...editData,
                valor_peca_entrada: editData.valor_peca_entrada ? Number(editData.valor_peca_entrada) : null,
                valor_peca_saida: editData.valor_peca_saida ? Number(editData.valor_peca_saida) : null,
                valor_pago_funcionario: editData.valor_pago_funcionario ? Number(editData.valor_pago_funcionario) : null
            }
            await api.put(`/finalizacao/${editData.id_finalizacao}`, payload);
            alert('Finalização atualizada!');
            loadFinalizacoes();
        } catch (error) {
            alert('Erro ao atualizar finalização');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/finalizacao/${searchId}`);
            alert('Finalização deletada!');
            loadFinalizacoes();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar finalização');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Finalização</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Nova Finalização</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2 grid grid-cols-2 gap-2">
                    <input type="number" name="id_os" value={formData.id_os} onChange={handleCreateChange} placeholder="ID OS (Único)" className="col-span-2 border p-1 w-full" required />
                    <input type="number" step="0.01" name="valor_peca_entrada" value={formData.valor_peca_entrada} onChange={handleCreateChange} placeholder="Valor Peça Entrada" className="border p-1 w-full" />
                    <input type="number" step="0.01" name="valor_peca_saida" value={formData.valor_peca_saida} onChange={handleCreateChange} placeholder="Valor Peça Saída" className="border p-1 w-full" />
                    <input type="number" step="0.01" name="valor_pago_funcionario" value={formData.valor_pago_funcionario} onChange={handleCreateChange} placeholder="Pago ao Funcionário" className="border p-1 w-full" />
                    <input name="obs" value={formData.obs} onChange={handleCreateChange} placeholder="Observação" className="border p-1 w-full" />
                    
                    <button type="submit" className="col-span-2 bg-blue-500 text-white px-4 py-2 rounded">Salvar Finalização</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Finalização (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Finalização" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.obs || ''} 
                            onChange={(e) => setEditData({...editData, obs: e.target.value})} 
                            placeholder="Observação" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Finalizações</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">ID OS</th>
                            <th className="p-2 border">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {finalizacoes.map((f) => (
                            <tr key={f.id_finalizacao} className="border-t">
                                <td className="p-2 border">{f.id_finalizacao}</td>
                                <td className="p-2 border">{f.id_os}</td>
                                <td className="p-2 border">{new Date(f.dt_cadastro).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
