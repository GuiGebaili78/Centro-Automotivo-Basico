import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { ICliente } from '../types/backend';

export const ClienteTestPage = () => {
    const [clientes, setClientes] = useState<ICliente[]>([]);
    const [formData, setFormData] = useState<{
        id_pessoa_fisica: string;
        id_pessoa_juridica: string;
        tipo_pessoa: string;
        telefone_1: string;
        telefone_2: string;
        telefone_3: string;
        email: string;
        logradouro: string;
        nr_logradouro: string;
        compl_logradouro: string;
        bairro: string;
        cidade: string;
        estado: string;
    }>({
        id_pessoa_fisica: '',
        id_pessoa_juridica: '',
        tipo_pessoa: '',
        telefone_1: '',
        telefone_2: '',
        telefone_3: '',
        email: '',
        logradouro: '',
        nr_logradouro: '',
        compl_logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<ICliente | null>(null);

    useEffect(() => {
        loadClientes();
    }, []);

    const loadClientes = async () => {
        try {
            const response = await api.get('/cliente');
            setClientes(response.data);
        } catch (error) {
            alert('Erro ao carregar clientes');
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
                id_pessoa_fisica: formData.id_pessoa_fisica ? Number(formData.id_pessoa_fisica) : null,
                id_pessoa_juridica: formData.id_pessoa_juridica ? Number(formData.id_pessoa_juridica) : null,
                tipo_pessoa: Number(formData.tipo_pessoa)
            };
            await api.post('/cliente', payload);
            alert('Cliente criado!');
            loadClientes();
            setFormData({
                id_pessoa_fisica: '',
                id_pessoa_juridica: '',
                tipo_pessoa: '',
                telefone_1: '',
                telefone_2: '',
                telefone_3: '',
                email: '',
                logradouro: '',
                nr_logradouro: '',
                compl_logradouro: '',
                bairro: '',
                cidade: '',
                estado: '',
            });
        } catch (error) {
            console.error(error);
            alert('Erro ao criar cliente. Verifique os IDs (PF/PJ/Tipo).');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/cliente/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Cliente não encontrado');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/cliente/${editData.id_cliente}`, editData);
            alert('Cliente atualizado!');
            loadClientes();
        } catch (error) {
            alert('Erro ao atualizar cliente');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/cliente/${searchId}`);
            alert('Cliente deletado!');
            loadClientes();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar cliente');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Clientes</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Novo Cliente</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2 grid grid-cols-2 gap-2">
                    <input type="number" name="id_pessoa_fisica" value={formData.id_pessoa_fisica} onChange={handleCreateChange} placeholder="ID PF (Opcional)" className="border p-1 w-full" />
                    <input type="number" name="id_pessoa_juridica" value={formData.id_pessoa_juridica} onChange={handleCreateChange} placeholder="ID PJ (Opcional)" className="border p-1 w-full" />
                    <input type="number" name="tipo_pessoa" value={formData.tipo_pessoa} onChange={handleCreateChange} placeholder="ID Tipo (Obrigatório)" className="border p-1 w-full" required />
                    
                    <input name="telefone_1" value={formData.telefone_1} onChange={handleCreateChange} placeholder="Telefone 1" className="border p-1 w-full" required />
                    <input name="telefone_2" value={formData.telefone_2} onChange={handleCreateChange} placeholder="Telefone 2" className="border p-1 w-full" />
                    <input name="email" value={formData.email} onChange={handleCreateChange} placeholder="Email" className="border p-1 w-full" />
                    
                    <input name="logradouro" value={formData.logradouro} onChange={handleCreateChange} placeholder="Logradouro" className="border p-1 w-full" required />
                    <input name="nr_logradouro" value={formData.nr_logradouro} onChange={handleCreateChange} placeholder="Número" className="border p-1 w-full" required />
                    <input name="bairro" value={formData.bairro} onChange={handleCreateChange} placeholder="Bairro" className="border p-1 w-full" required />
                    <input name="cidade" value={formData.cidade} onChange={handleCreateChange} placeholder="Cidade" className="border p-1 w-full" required />
                    <input name="estado" value={formData.estado} onChange={handleCreateChange} placeholder="Estado (UF)" className="border p-1 w-full" required maxLength={2} />
                    
                    <div className="col-span-2">
                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded w-full">Salvar Cliente</button>
                    </div>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar Cliente (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID Cliente" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.email || ''} 
                            onChange={(e) => setEditData({...editData, email: e.target.value})} 
                            placeholder="Email" 
                            className="border p-1 w-full" 
                        />
                         <input 
                            value={editData.telefone_1} 
                            onChange={(e) => setEditData({...editData, telefone_1: e.target.value})} 
                            placeholder="Telefone 1" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Clientes</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">Email</th>
                            <th className="p-2 border">Cidade/UF</th>
                            <th className="p-2 border">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map((c) => (
                            <tr key={c.id_cliente} className="border-t">
                                <td className="p-2 border">{c.id_cliente}</td>
                                <td className="p-2 border">{c.email}</td>
                                <td className="p-2 border">{c.cidade}/{c.estado}</td>
                                <td className="p-2 border">{new Date(c.dt_cadastro).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
