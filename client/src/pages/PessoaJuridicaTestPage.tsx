import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../services/api';
import type { IPessoaJuridica } from '../types/backend';

export const PessoaJuridicaTestPage = () => {
    const [pessoasJuridicas, setPessoasJuridicas] = useState<IPessoaJuridica[]>([]);
    const [formData, setFormData] = useState<{
        id_pessoa: string;
        razao_social: string;
        nome_fantasia: string;
        cnpj: string;
        inscricao_estadual: string;
    }>({
        id_pessoa: '',
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
    });

    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IPessoaJuridica | null>(null);

    useEffect(() => {
        loadPessoasJuridicas();
    }, []);

    const loadPessoasJuridicas = async () => {
        try {
            const response = await api.get('/pessoa-juridica');
            setPessoasJuridicas(response.data);
        } catch (error) {
            alert('Erro ao carregar pessoas jurídicas');
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
            await api.post('/pessoa-juridica', payload);
            alert('Pessoa Jurídica criada!');
            loadPessoasJuridicas();
            setFormData({ id_pessoa: '', razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '' });
        } catch (error) {
            alert('Erro ao criar pessoa jurídica. Verifique se o ID Pessoa existe e não tem PJ vinculada.');
        }
    };

    const handleSearch = async () => {
        try {
            const response = await api.get(`/pessoa-juridica/${searchId}`);
            setEditData(response.data);
        } catch (error) {
            alert('Pessoa Jurídica não encontrada');
            setEditData(null);
        }
    };

    const handleUpdate = async () => {
        if (!editData) return;
        try {
            await api.put(`/pessoa-juridica/${editData.id_pessoa_juridica}`, editData);
            alert('Pessoa Jurídica atualizada!');
            loadPessoasJuridicas();
        } catch (error) {
            alert('Erro ao atualizar pessoa jurídica');
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        try {
            await api.delete(`/pessoa-juridica/${searchId}`);
            alert('Pessoa Jurídica deletada!');
            loadPessoasJuridicas();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            alert('Erro ao deletar pessoa jurídica');
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Pessoas Jurídicas</h1>

            {/* CREATE */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Criar Nova Pessoa Jurídica</h2>
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                    <input type="number" name="id_pessoa" value={formData.id_pessoa} onChange={handleCreateChange} placeholder="ID Pessoa (Existente)" className="border p-1 w-full" required />
                    <input name="razao_social" value={formData.razao_social} onChange={handleCreateChange} placeholder="Razão Social" className="border p-1 w-full" required />
                    <input name="nome_fantasia" value={formData.nome_fantasia} onChange={handleCreateChange} placeholder="Nome Fantasia" className="border p-1 w-full" />
                    <input name="cnpj" value={formData.cnpj} onChange={handleCreateChange} placeholder="CNPJ" className="border p-1 w-full" />
                    <input name="inscricao_estadual" value={formData.inscricao_estadual} onChange={handleCreateChange} placeholder="Inscrição Estadual" className="border p-1 w-full" />
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Salvar PJ</button>
                </form>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="border p-4 mb-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Gerenciar PJ (ID)</h2>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="ID PJ" 
                        className="border p-1"
                    />
                    <button onClick={handleSearch} className="bg-yellow-500 text-white px-4 py-1 rounded">Localizar</button>
                    <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-1 rounded">Excluir</button>
                </div>

                {editData && (
                    <div className="space-y-2 border-t pt-2">
                         <input 
                            value={editData.razao_social} 
                            onChange={(e) => setEditData({...editData, razao_social: e.target.value})} 
                            placeholder="Razão Social" 
                            className="border p-1 w-full" 
                        />
                         <input 
                            value={editData.nome_fantasia || ''} 
                            onChange={(e) => setEditData({...editData, nome_fantasia: e.target.value})} 
                            placeholder="Nome Fantasia" 
                            className="border p-1 w-full" 
                        />
                        <button onClick={handleUpdate} className="bg-green-500 text-white px-4 py-2 rounded w-full">Atualizar</button>
                    </div>
                )}
            </div>

            {/* LIST */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Lista de Pessoas Jurídicas</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">ID PJ</th>
                            <th className="p-2 border">ID Pessoa</th>
                            <th className="p-2 border">Razão Social</th>
                            <th className="p-2 border">CNPJ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pessoasJuridicas.map((pj) => (
                            <tr key={pj.id_pessoa_juridica} className="border-t">
                                <td className="p-2 border">{pj.id_pessoa_juridica}</td>
                                <td className="p-2 border">{pj.id_pessoa}</td>
                                <td className="p-2 border">{pj.razao_social}</td>
                                <td className="p-2 border">{pj.cnpj}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
