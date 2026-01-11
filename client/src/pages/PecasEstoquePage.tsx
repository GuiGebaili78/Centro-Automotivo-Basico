import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { IPecasEstoque } from '../types/backend';
import { Modal } from '../components/ui/Modal';
import { Search, Trash2, Edit, Package, CheckCircle, ShoppingCart } from 'lucide-react';
import { StatusBanner } from '../components/ui/StatusBanner';
import { useNavigate } from 'react-router-dom';

export const PecasEstoquePage = () => {
    const navigate = useNavigate();
    const [pecas, setPecas] = useState<IPecasEstoque[]>([]);
    
    // const [showNewModal, setShowNewModal] = useState(false); // Removed
    
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    // Search
    const [searchId, setSearchId] = useState('');
    const [listSearchTerm, setListSearchTerm] = useState(''); // Global filter
    
    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<IPecasEstoque | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        fabricante: '',
        descricao: '',
        unidade_medida: 'UN',
        valor_custo: '',
        margem_lucro: '',
        valor_venda: '',
        estoque_atual: ''
    });

    useEffect(() => {
        loadPecas();
    }, []);

    // ... (keep handleRecalcMargin, handleRecalcSale, loadPecas, handleSearch, etc.)

    // FILTERED LIST
    const filteredPecas = pecas.filter(p => {
        if (!listSearchTerm) return true;
        const term = listSearchTerm.toLowerCase();
        return (
            p.nome.toLowerCase().includes(term) ||
            p.descricao.toLowerCase().includes(term) ||
            (p.fabricante && p.fabricante.toLowerCase().includes(term)) ||
            String(p.id_pecas_estoque).includes(term)
        );
    });

    const handleRecalcMargin = (saleVal: string) => {
        setFormData(prev => {
            const sale = Number(saleVal);
            const cost = Number(prev.valor_custo);
            let margin = prev.margem_lucro;
            if (cost > 0 && sale > 0) {
                 margin = (((sale - cost) / cost) * 100).toFixed(2);
            }
            return { ...prev, valor_venda: saleVal, margem_lucro: margin };
        });
    };

    const handleRecalcSale = (marginVal: string) => {
        setFormData(prev => {
            const margin = Number(marginVal);
            const cost = Number(prev.valor_custo);
            let sale = prev.valor_venda;
            if (cost > 0) {
                 sale = (cost + (cost * (margin / 100))).toFixed(2);
            }
            return { ...prev, margem_lucro: marginVal, valor_venda: sale };
        });
    };

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
            // Setup Form Data
            const p = response.data;
            setEditData(p);
            
            // Calc Margin
            let margin = '';
            if (Number(p.valor_custo) > 0) {
                margin = (((Number(p.valor_venda) - Number(p.valor_custo)) / Number(p.valor_custo)) * 100).toFixed(2);
            }

            setFormData({
                nome: p.nome,
                fabricante: p.fabricante || '',
                descricao: p.descricao || '',
                unidade_medida: p.unidade_medida || 'UN',
                valor_custo: Number(p.valor_custo).toFixed(2),
                margem_lucro: margin,
                valor_venda: Number(p.valor_venda).toFixed(2),
                estoque_atual: String(p.estoque_atual)
            });
            
            setEditModalOpen(true);
            setSearchId(''); // Clear search ID after opening
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Peça não encontrada por ID.' });
            setEditData(null);
        }
    };

    const handleOpenEdit = (p: IPecasEstoque) => {
        setEditData(p);
         // Calc Margin
         let margin = '';
         if (Number(p.valor_custo) > 0) {
             margin = (((Number(p.valor_venda) - Number(p.valor_custo)) / Number(p.valor_custo)) * 100).toFixed(2);
         }

         setFormData({
             nome: p.nome,
             fabricante: p.fabricante || '',
             descricao: p.descricao || '',
             unidade_medida: p.unidade_medida || 'UN',
             valor_custo: Number(p.valor_custo).toFixed(2),
             margem_lucro: margin,
             valor_venda: Number(p.valor_venda).toFixed(2),
             estoque_atual: String(p.estoque_atual)
         });
         setEditModalOpen(true);
    };

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        msg: string;
        onConfirm: () => void;
        type: 'warning' | 'info' | 'danger';
    }>({ show: false, title: '', msg: '', onConfirm: () => {}, type: 'info' });

    // ... (existing code)

    const handleCloseModal = () => {
        if (editData) {
             setConfirmModal({
                show: true,
                title: 'Descartar Alterações?',
                msg: 'Existem dados carregados. Deseja sair sem salvar?',
                type: 'warning',
                onConfirm: () => {
                    setEditModalOpen(false);
                    setEditData(null);
                    setConfirmModal(prev => ({ ...prev, show: false }));
                }
             });
        } else {
             setEditModalOpen(false);
        }
    };

    const executeUpdate = async () => {
        if (!editData) return;
        try {
             const payload = {
                ...editData,
                nome: formData.nome,
                fabricante: formData.fabricante,
                descricao: formData.descricao,
                unidade_medida: formData.unidade_medida,
                valor_custo: Number(formData.valor_custo),
                valor_venda: Number(formData.valor_venda),
                estoque_atual: Number(formData.estoque_atual)
             }
            await api.put(`/pecas-estoque/${editData.id_pecas_estoque}`, payload);
            setStatusMsg({ type: 'success', text: 'Peça atualizada com sucesso!' });
            setEditModalOpen(false);
            setEditData(null);
            loadPecas();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao atualizar peça.' });
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        setConfirmModal({
            show: true,
            title: 'Salvar Alterações',
            msg: 'Deseja confirmar as atualizações neste item?',
            type: 'info',
            onConfirm: executeUpdate
        });
    };

    const executeDelete = async () => {
        if (!editData) return;
        try {
            await api.delete(`/pecas-estoque/${editData.id_pecas_estoque}`);
            setStatusMsg({ type: 'success', text: 'Peça removida do sistema.' });
            loadPecas();
            setEditModalOpen(false);
            setEditData(null);
            setSearchId('');
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Erro ao deletar peça.' });
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
    };

    const handleDelete = () => {
        if (!editData) return;
        setConfirmModal({
            show: true,
            title: 'Excluir Item',
            msg: 'Tem certeza que deseja remover este item permanentemente?',
            type: 'danger',
            onConfirm: executeDelete
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <StatusBanner msg={statusMsg} onClose={() => setStatusMsg({type: null, text: ''})} />

            {/* CONFIRMATION MODAL */}
            {confirmModal.show && (
                <Modal title={confirmModal.title} onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))} zIndex={60}>
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border ${confirmModal.type === 'danger' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                            <p className="font-bold text-center">{confirmModal.msg}</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                className="px-4 py-2 text-neutral-500 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmModal.onConfirm}
                                className={`px-6 py-2 text-white font-bold rounded-lg shadow-md transition-all ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-black'}`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                     <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Estoque de Peças</h1>
                     <p className="text-neutral-500">Gerencie o inventário de peças e serviços.</p>
                </div>
                <button 
                    onClick={() => navigate('/entrada-estoque')}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                >
                    <ShoppingCart size={20} />
                    Nova Compra / Entrada
                </button>
            </div>

            {/* ACTION CARDS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Maintenance By ID (Left) */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                    <h2 className="text-sm font-black text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2 mb-4">
                        Manutenção de Item (Por ID)
                    </h2>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                             <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">ID da Peça</label>
                             <input 
                                type="number" 
                                value={searchId} 
                                onChange={(e) => setSearchId(e.target.value)} 
                                placeholder="123" 
                                className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-800 outline-none focus:border-primary-500 transition-colors"
                            />
                        </div>
                        <button 
                            onClick={handleSearch} 
                            disabled={!searchId}
                            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                        >
                            <Search size={18} /> ABRIR
                        </button>
                    </div>
                </div>

                {/* 2. Global Search / Filtering (Right) */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                    <h2 className="text-sm font-black text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2 mb-4">
                        Localizar / Filtrar Lista
                    </h2>
                    <div className="relative">
                         <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Buscar em todas as colunas</label>
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                            <input 
                                value={listSearchTerm} 
                                onChange={(e) => setListSearchTerm(e.target.value)} 
                                placeholder="Nome, Fabricante, Descrição..." 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-neutral-800 outline-none focus:border-primary-500 transition-colors"
                            />
                         </div>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ID</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Produto / Peça</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Fornecedor / Data</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Estoque</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Custo Unit.</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Valor Venda</th>
                            <th className="p-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {filteredPecas.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-neutral-400 italic">Nenhum item encontrado.</td></tr>
                        ) : (
                            filteredPecas.map((p) => {
                                // ... row rendering
                                const lastEntry = (p as any).itens_entrada?.[0]?.entrada;
                                const fornecedorName = lastEntry?.fornecedor?.nome || '-';
                                const dataCompra = lastEntry?.data_compra ? new Date(lastEntry.data_compra).toLocaleDateString() : '-';
                                const nf = lastEntry?.nota_fiscal || '-';
    
                                return (
                                    <tr key={p.id_pecas_estoque} className="hover:bg-neutral-25 group">
                                        <td className="p-4 text-neutral-500 font-mono text-xs">#{p.id_pecas_estoque}</td>
                                        <td className="p-4 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary-50 p-2.5 rounded-xl text-primary-600">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-neutral-900">{p.nome}</div>
                                                    <div className="text-xs text-neutral-500 max-w-[200px] truncate">{p.descricao}</div>
                                                    {p.fabricante && <div className="text-[10px] text-neutral-400 uppercase font-bold">{p.fabricante}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs">
                                                <div className="font-bold text-neutral-700">{fornecedorName}</div>
                                                <div className="text-neutral-400">{dataCompra} • NF: {nf}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                             <span className={`px-2 py-1 rounded-md text-xs font-black ${p.estoque_atual > 0 ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}>
                                                {p.estoque_atual} {p.unidade_medida || 'UN'}
                                             </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-neutral-600">
                                            R$ {Number(p.valor_custo).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right font-black text-neutral-900">
                                            R$ {Number(p.valor_venda).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleOpenEdit(p)}
                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* EDIT MODAL */}
            {editModalOpen && (
                <Modal 
                    title={`Manutenção de Item: ${editData?.nome}`} 
                    onClose={handleCloseModal}
                    className="max-w-4xl"
                >
                    <form onSubmit={handleUpdate} className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome do Item</label>
                                <input 
                                    value={formData.nome}
                                    onChange={e => setFormData({...formData, nome: e.target.value})}
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                                    required
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Fabricante</label>
                                    <input 
                                        value={formData.fabricante}
                                        onChange={e => setFormData({...formData, fabricante: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold"
                                        placeholder="Marca..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Unidade</label>
                                    <select 
                                        value={formData.unidade_medida}
                                        onChange={e => setFormData({...formData, unidade_medida: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm h-[50px]"
                                    >
                                         <option value="UN">Unidade (UN)</option>
                                         <option value="L">Litro (L)</option>
                                         <option value="KG">Quilo (KG)</option>
                                         <option value="KIT">Kit</option>
                                         <option value="PAR">Par</option>
                                    </select>
                                </div>
                             </div>
                        </div>

                        {/* Values Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Estoque Atual</label>
                                <input 
                                    type="number"
                                    value={formData.estoque_atual}
                                    onChange={e => setFormData({...formData, estoque_atual: e.target.value})}
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-center font-black focus:bg-white outline-none focus:border-primary-500"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Custo Unit (R$)</label>
                                <input 
                                    type="number" step="0.01"
                                    value={formData.valor_custo}
                                    onChange={e => setFormData({...formData, valor_custo: e.target.value})}
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-right font-medium focus:bg-white outline-none focus:border-primary-500"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Margem (%)</label>
                                <input 
                                    type="number" step="0.5"
                                    value={formData.margem_lucro}
                                    onChange={e => handleRecalcSale(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-center font-medium focus:bg-white outline-none focus:border-primary-500"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-primary-600 uppercase mb-1">Venda Unit (R$)</label>
                                <input 
                                    type="number" step="0.01"
                                    value={formData.valor_venda}
                                    onChange={e => handleRecalcMargin(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-primary-200 bg-primary-50 text-primary-800 text-right font-black focus:bg-white outline-none focus:border-primary-500"
                                />
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="col-span-2">
                                 <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Descrição / Aplicação / Obs</label>
                                 <textarea 
                                    value={formData.descricao}
                                    onChange={e => setFormData({...formData, descricao: e.target.value})}
                                    className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-medium text-sm h-24 resize-none"
                                    placeholder="Detalhes adicionais..."
                                 />
                             </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                             <button 
                                type="button"
                                onClick={handleDelete}
                                className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 flex items-center gap-2"
                             >
                                 <Trash2 size={20} /> Excluir Item
                             </button>

                             <button 
                                type="submit"
                                className="px-8 py-3 bg-primary-600 text-white font-black uppercase rounded-xl shadow-lg hover:bg-primary-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                             >
                                 <CheckCircle size={20} /> Salvar Alterações
                             </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
