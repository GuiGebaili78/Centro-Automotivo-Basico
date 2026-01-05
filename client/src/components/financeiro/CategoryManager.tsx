import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Trash2, Plus, X, AlertTriangle, Edit2 } from 'lucide-react';

interface Category {
    id_categoria: number;
    nome: string;
    tipo: string;
}

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const CategoryManager = ({ isOpen, onClose, onUpdate }: CategoryManagerProps) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('AMBOS');
    const [loading, setLoading] = useState(false);
    
    // Conflict Resolution State
    const [conflictData, setConflictData] = useState<{ id: number; message: string; count: number } | null>(null);
    const [replacementCat, setReplacementCat] = useState('');

    // Editing State
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('AMBOS');

    useEffect(() => {
        if (isOpen) {
             loadCategories(); // This will hit the backend which now syncs
             setConflictData(null);
             setReplacementCat('');
        }
    }, [isOpen]);

    const loadCategories = async () => {
        try {
            const res = await api.get('/categoria-financeira');
            setCategories(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/categoria-financeira', { nome: newCatName, tipo: newCatType });
            setNewCatName('');
            loadCategories();
            onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, replacement?: string) => {
        if (!replacement && !confirm('Tem certeza que deseja excluir esta categoria?')) return;
        
        try {
            // Need to pass replacement in body if it exists. Note: axios delete config for body is distinct.
            await api.delete(`/categoria-financeira/${id}`, { 
                data: { replacementCategory: replacement }
            });
            
            // Success
            setConflictData(null);
            setReplacementCat('');
            loadCategories();
            onUpdate();
        } catch (error: any) {
            if (error.response && error.response.status === 409) {
                setConflictData({
                    id,
                    message: error.response.data.message,
                    count: error.response.data.usageCount
                });
                // Set default replacement to first available
                const firstAvailable = categories.find(c => c.id_categoria !== id);
                if (firstAvailable) setReplacementCat(firstAvailable.nome);
            } else {
                console.error(error);
                alert('Erro ao excluir categoria');
            }
        }
    };

    const startEditing = (cat: Category) => {
        setEditingCatId(cat.id_categoria);
        setEditName(cat.nome);
        setEditType(cat.tipo);
    };

    const handleEdit = async (id: number) => {
        try {
            // Optimistic update for UI responsiveness
            setCategories(categories.map(c => c.id_categoria === id ? { ...c, nome: editName, tipo: editType } : c));
            setEditingCatId(null);

            await api.put(`/categoria-financeira/${id}`, { nome: editName, tipo: editType });
            loadCategories();
            onUpdate();
        } catch (error) {
            console.error(error);
            alert('Erro ao editar categoria');
            loadCategories(); // Revert on error
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-neutral-900">Gerenciar Categorias</h2>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900">
                        <X size={20} />
                    </button>
                </div>

                {conflictData ? (
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6">
                        <div className="flex items-center gap-3 text-orange-600 mb-2">
                            <AlertTriangle size={20} />
                            <h3 className="font-bold">Categoria em uso</h3>
                        </div>
                        <p className="text-sm text-neutral-600 mb-4">{conflictData.message}</p>
                        
                        <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1">Substituir por:</label>
                        <select 
                            value={replacementCat}
                            onChange={(e) => setReplacementCat(e.target.value)}
                            className="w-full bg-white border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-orange-300 mb-4"
                        >
                            {categories.filter(c => c.id_categoria !== conflictData.id).map(c => (
                                <option key={c.id_categoria} value={c.nome}>{c.nome}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => setConflictData(null)} className="flex-1 py-2 font-bold text-neutral-500 hover:bg-white rounded-lg transition-colors">Cancelar</button>
                            <button onClick={() => handleDelete(conflictData.id, replacementCat)} className="flex-1 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors">Confirmar Troca</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                            <input 
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                placeholder="Nova categoria..."
                                className="flex-1 bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
                                required
                            />
                            <select 
                                value={newCatType}
                                onChange={e => setNewCatType(e.target.value)}
                                className="w-24 bg-neutral-50 border border-neutral-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-neutral-400"
                            >
                                <option value="AMBOS">Ambos</option>
                                <option value="ENTRADA">Entrada</option>
                                <option value="SAIDA">Saída</option>
                            </select>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="bg-neutral-900 text-white p-3 rounded-xl hover:bg-neutral-800 disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </form>

                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {categories.map(cat => (
                                <div key={cat.id_categoria} className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl border border-neutral-100 group hover:border-neutral-200 transition-colors">
                                    {editingCatId === cat.id_categoria ? (
                                        <div className="flex gap-2 w-full">
                                            <input 
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="flex-1 bg-white border border-neutral-300 p-2 rounded-lg font-bold text-sm outline-none focus:border-neutral-400"
                                                autoFocus
                                            />
                                            <select 
                                                value={editType}
                                                onChange={e => setEditType(e.target.value)}
                                                className="w-24 bg-white border border-neutral-300 p-2 rounded-lg font-bold text-sm outline-none focus:border-neutral-400"
                                            >
                                                <option value="AMBOS">Ambos</option>
                                                <option value="ENTRADA">Entrada</option>
                                                <option value="SAIDA">Saída</option>
                                            </select>
                                            <button onClick={() => handleEdit(cat.id_categoria)} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600">
                                                <Plus size={16} /> {/* Reusing Plus for Save icon visually or could import Save */}
                                            </button>
                                            <button onClick={() => setEditingCatId(null)} className="bg-neutral-200 text-neutral-600 p-2 rounded-lg hover:bg-neutral-300">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="font-bold text-neutral-800">{cat.nome}</p>
                                                <p className="text-[10px] uppercase font-black text-neutral-400">{cat.tipo}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => startEditing(cat)}
                                                    className="text-neutral-300 hover:text-primary-500 transition-colors p-2"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cat.id_categoria)}
                                                    className="text-neutral-300 hover:text-red-500 transition-colors p-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <p className="text-center text-neutral-400 text-sm py-4">Nenhuma categoria cadastrada.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
