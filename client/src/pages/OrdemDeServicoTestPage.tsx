import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IOrdemDeServico } from '../types/backend';

export const OrdemDeServicoTestPage = () => {
    const [oss, setOss] = useState<IOrdemDeServico[]>([]);
    const [formData, setFormData] = useState<{
        id_cliente: string;
        id_veiculo: string;
        id_funcionario: string;
        km_entrada: string;
        status: string;
        parcelas: string;
        defeito_relatado: string;
    }>({
        id_cliente: '',
        id_veiculo: '',
        id_funcionario: '',
        km_entrada: '',
        status: 'ABERTA',
        parcelas: '1',
        defeito_relatado: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IOrdemDeServico | null>(null);

    useEffect(() => {
        loadOss();
    }, []);

    const loadOss = async () => {
        try {
            const response = await api.get('/ordem-de-servico');
            setOss(response.data);
        } catch (error) {
            alert('Erro ao carregar OSs');
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
                id_cliente: Number(formData.id_cliente),
                id_veiculo: Number(formData.id_veiculo),
                id_funcionario: Number(formData.id_funcionario),
                km_entrada: Number(formData.km_entrada),
                parcelas: Number(formData.parcelas)
            };
            await api.post('/ordem-de-servico', payload);
            alert('OS criada!');
            loadOss();
            setFormData({
                id_cliente: '',
                id_veiculo: '',
                id_funcionario: '',
                km_entrada: '',
                status: 'ABERTA',
                parcelas: '1',
                defeito_relatado: '',
            });
        } catch (error) {
            alert('Erro ao criar OS. Verifique IDs.');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/ordem-de-servico/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('OS não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/ordem-de-servico/${editData.id_os}`, editData);
            alert('OS atualizada!');
            loadOss();
        } catch (error) {
            alert('Erro ao atualizar OS');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/ordem-de-servico/${searchId}`);
            alert('OS deletada!');
            loadOss();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar OS');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Ordens de Serviço</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Nova OS</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2 grid grid-cols-2 gap-2">
                    <input type="number" name="id_cliente" value={formData.id_cliente} onChange={handleCreateChange} placeholder="ID Cliente" className="border p-1 w-full" required />
                    <input type="number" name="id_veiculo" value={formData.id_veiculo} onChange={handleCreateChange} placeholder="ID Veículo" className="border p-1 w-full" required />
                    <input type="number" name="id_funcionario" value={formData.id_funcionario} onChange={handleCreateChange} placeholder="ID Funcionário" className="border p-1 w-full" required />
                    <input type="number" name="km_entrada" value={formData.km_entrada} onChange={handleCreateChange} placeholder="KM Entrada" className="border p-1 w-full" required />
                    <input name="status" value={formData.status} onChange={handleCreateChange} placeholder="Status" className="border p-1 w-full" required />
                    <input type="number" name="parcelas" value={formData.parcelas} onChange={handleCreateChange} placeholder="Parcelas" className="border p-1 w-full" required />
                    <input name="defeito_relatado" value={formData.defeito_relatado} onChange={handleCreateChange} placeholder="Defeito Relatado" className="col-span-2 border p-1 w-full" />
                    
                    <button type="submit" className="col-span-2 bg-blue-500 text-white px-4 py-2 rounded">Salvar OS</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar OS (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID OS" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.status} 
                            onChange={(e) => setEditData({...editData, status: e.target.value})} 
                            placeholder="Status" 
                            className="border p-1 w-full" 
                        />
                         <input 
                            value={editData.diagnostico || ''} 
                            onChange={(e) => setEditData({...editData, diagnostico: e.target.value})} 
                            placeholder="Diagnóstico" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de OSs</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">ID Cliente</th>
                            <th className="p-2 border">Status</th>
                            <th className="p-2 border">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {oss.map((o) => (
                            <tr key={o.id_os} className="border-t">
                                <td className="p-2 border">{o.id_os}</td>
                                <td className="p-2 border">{o.id_cliente}</td>
                                <td className="p-2 border">{o.status}</td>
                                <td className="p-2 border">{new Date(o.dt_cadastro).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
