import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IPecasEstoque } from '../types/backend';
import { PecasEstoqueForm } from '../components/forms/PecasEstoqueForm';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Trash2, Edit, Package } from 'lucide-react';
import { StatusBanner } from '../components/ui/StatusBanner';

export const PecasEstoquePage = () => {
    const [pecas, setPecas] = useState<IPecasEstoque[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [editData, setEditData] = useState<IPecasEstoque | null>(null);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    useEffect(() => {
        loadPecas();
    }, []);

    const loadPecas = async () => {
        try {
            const response = await api.get('/pecas-estoque');
            setPecas(response.data);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao carregar estoque.' });
        }
    };

    const handleSearch = async () => {
        if (!searchId) return;
        try {
            const response = await api.get(`/pecas-estoque/${searchId}`);
            setEditData(response.data);
            setStatusMsg({ type: 'success', text: 'Peça localizada!' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 2000);
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Peça não encontrada.' });
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
            setStatusMsg({ type: 'success', text: 'Peça atualizada com sucesso!' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
            loadPecas();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar peça.' });
        }
    };

    const handleDelete = async () => {
        if (!searchId) return;
        if (!confirm('Deseja realmente excluir este item?')) return;
        try {
            await api.delete(`/pecas-estoque/${searchId}`);
            setStatusMsg({ type: 'success', text: 'Peça removida do sistema.' });
            setTimeout(() => setStatusMsg({ type: null, text: '' }), 3000);
            loadPecas();
            setEditData(null);
            setSearchId('');
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao deletar peça.' });
        }
    };

    return (
        <div className="space-y-6">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            <div className="flex justify-between items-center">
                <div>
                     <h1 className="text-2xl font-bold text-neutral-900">Estoque de Peças</h1>
                     <p className="text-neutral-500">Gerencie o inventário de peças e serviços.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Nova Peça
                </button>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase">ID</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase">Produto/Peça</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase">Fornecedor / Data</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase text-right">Estoque</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase text-right">Custo Unit.</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase text-right">Valor Venda</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {pecas.map((p) => {
                            const lastEntry = (p as any).itens_entrada?.[0]?.entrada;
                            const fornecedorName = lastEntry?.fornecedor?.nome || '-';
                            const dataCompra = lastEntry?.data_compra ? new Date(lastEntry.data_compra).toLocaleDateString() : '-';
                            const nf = lastEntry?.nota_fiscal || '-';

                            return (
                                <tr key={p.id_pecas_estoque} className="hover:bg-neutral-50">
                                    <td className="p-4 text-neutral-500 font-mono">#{p.id_pecas_estoque}</td>
                                    <td className="p-4 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-info-50 p-2 rounded-lg text-info-600">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <div className="text-neutral-900">{p.nome}</div>
                                                <div className="text-xs text-neutral-500">{p.descricao}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs">
                                            <div className="font-bold text-gray-700">{fornecedorName}</div>
                                            <div className="text-gray-500">{dataCompra} • NF: {nf}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 border-gray-100 text-right font-medium text-slate-700">{p.estoque_atual} {p.unidade_medida}</td>
                                    <td className="p-4 border-gray-100 text-right font-medium text-red-600">
                                        R$ {Number(p.valor_custo).toFixed(2)}
                                    </td>
                                    <td className="p-4 border-gray-100 text-right font-bold text-green-600">
                                        R$ {Number(p.valor_venda).toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MANAGE (Search/Update/Delete) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">Manutenção de Item (Por ID)</h2>
                <div className="flex gap-4 mb-4">
                    <input 
                        type="number" 
                        value={searchId} 
                        onChange={(e) => setSearchId(e.target.value)} 
                        placeholder="Digite o ID da Peça..." 
                        className="border p-2 rounded w-64"
                    />
                    <button onClick={handleSearch} className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700">
                        <Search size={18} /> Localizar
                    </button>
                    {searchId && <button onClick={handleDelete} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
                        <Trash2 size={18} /> Excluir
                    </button>}
                </div>

                {editData && (
                    <div className="bg-slate-50 p-4 rounded border animate-in fade-in">
                        <h3 className="font-bold mb-2">Editando: {editData.nome}</h3>
                         <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                 <label className="text-xs font-bold block mb-1">Nome</label>
                                 <input 
                                     value={editData.nome} 
                                     onChange={(e) => setEditData({...editData, nome: e.target.value})} 
                                     className="border p-2 w-full rounded" 
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold block mb-1">Estoque</label>
                                 <input 
                                     type="number"
                                     value={editData.estoque_atual} 
                                     onChange={(e) => setEditData({...editData, estoque_atual: Number(e.target.value)})} 
                                     className="border p-2 w-full rounded" 
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold block mb-1">Custo Unitário (R$)</label>
                                 <input 
                                     type="number"
                                     step="0.01"
                                     value={editData.valor_custo} 
                                     onChange={(e) => setEditData({...editData, valor_custo: Number(e.target.value)})} 
                                     className="border p-2 w-full rounded" 
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold block mb-1">Valor Venda (R$)</label>
                                 <input 
                                     type="number"
                                     step="0.01"
                                     value={editData.valor_venda} 
                                     onChange={(e) => setEditData({...editData, valor_venda: Number(e.target.value)})} 
                                     className="border p-2 w-full rounded" 
                                 />
                             </div>
                         </div>
                        <button onClick={handleUpdate} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold">
                            <Edit size={18} /> Salvar Alterações
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <Modal title="Nova Peça no Estoque" onClose={() => setShowModal(false)}>
                    <PecasEstoqueForm 
                        onSuccess={() => {
                            setShowModal(false);
                            loadPecas();
                        }}
                        onCancel={() => setShowModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};
