import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IVeiculo } from '../types/backend';

export const VeiculoTestPage = () => {
    const [veiculos, setVeiculos] = useState<IVeiculo[]>([]);
    const [formData, setFormData] = useState<{
        id_cliente: string;
        placa: string;
        chassi: string;
        marca: string;
        modelo: string;
        versao: string;
        ano_modelo: string;
        cor: string;
        combustivel: string;
        obs: string;
    }>({
        id_cliente: '',
        placa: '',
        chassi: '',
        marca: '',
        modelo: '',
        versao: '',
        ano_modelo: '',
        cor: '',
        combustivel: '',
        obs: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IVeiculo | null>(null);

    useEffect(() => {
        loadVeiculos();
    }, []);

    const loadVeiculos = async () => {
        try {
            const response = await api.get('/veiculo');
            setVeiculos(response.data);
        } catch (error) {
            alert('Erro ao carregar veículos');
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
                id_cliente: Number(formData.id_cliente)
            };
            await api.post('/veiculo', payload);
            alert('Veículo criado!');
            loadVeiculos();
            setFormData({
                id_cliente: '',
                placa: '',
                chassi: '',
                marca: '',
                modelo: '',
                versao: '',
                ano_modelo: '',
                cor: '',
                combustivel: '',
                obs: '',
            });
        } catch (error) {
            alert('Erro ao criar veículo. Verifique se o Cliente ID existe.');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/veiculo/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Veículo não encontrado');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/veiculo/${editData.id_veiculo}`, editData);
            alert('Veículo atualizado!');
            loadVeiculos();
        } catch (error) {
            alert('Erro ao atualizar veículo');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/veiculo/${searchId}`);
            alert('Veículo deletado!');
            loadVeiculos();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar veículo');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Veículos</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Novo Veículo</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2 grid grid-cols-2 gap-2">
                    <input type="number" name="id_cliente" value={formData.id_cliente} onChange={handleCreateChange} placeholder="ID Cliente" className="border p-1 w-full" required />
                    <input name="placa" value={formData.placa} onChange={handleCreateChange} placeholder="Placa" className="border p-1 w-full" required />
                    <input name="marca" value={formData.marca} onChange={handleCreateChange} placeholder="Marca" className="border p-1 w-full" required />
                    <input name="modelo" value={formData.modelo} onChange={handleCreateChange} placeholder="Modelo" className="border p-1 w-full" required />
                    <input name="versao" value={formData.versao} onChange={handleCreateChange} placeholder="Versão" className="border p-1 w-full" />
                    <input name="ano_modelo" value={formData.ano_modelo} onChange={handleCreateChange} placeholder="Ano Modelo" className="border p-1 w-full" required />
                    <input name="cor" value={formData.cor} onChange={handleCreateChange} placeholder="Cor" className="border p-1 w-full" required />
                    <input name="combustivel" value={formData.combustivel} onChange={handleCreateChange} placeholder="Combustível" className="border p-1 w-full" required />
                    
                    <button type="submit" className="col-span-2 bg-blue-500 text-white px-4 py-2 rounded">Salvar Veículo</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Veículo (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Veículo" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.placa} 
                            onChange={(e) => setEditData({...editData, placa: e.target.value})} 
                            placeholder="Placa" 
                            className="border p-1 w-full" 
                        />
                         <input 
                            value={editData.modelo} 
                            onChange={(e) => setEditData({...editData, modelo: e.target.value})} 
                            placeholder="Modelo" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Veículos</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">ID Cliente</th>
                            <th className="p-2 border">Placa</th>
                            <th className="p-2 border">Modelo</th>
                            <th className="p-2 border">Cor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {veiculos.map((v) => (
                            <tr key={v.id_veiculo} className="border-t">
                                <td className="p-2 border">{v.id_veiculo}</td>
                                <td className="p-2 border">{v.id_cliente}</td>
                                <td className="p-2 border">{v.placa}</td>
                                <td className="p-2 border">{v.modelo}</td>
                                <td className="p-2 border">{v.cor}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
