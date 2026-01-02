
import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Check, X, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import type { FormEvent } from 'react';

// Tipagem básica para garantir o funcionamento
interface LaborService {
    id_servico_mao_de_obra?: number;
    id_temporary?: string; // Para modo draft
    id_funcionario: number | string;
    valor: number | string;
    descricao?: string;
    funcionario?: {
        pessoa_fisica?: {
            pessoa?: {
                nome: string;
            }
        }
    }
}

interface LaborManagerProps {
    osId?: number;
    mode: 'api' | 'draft';
    initialData?: LaborService[]; // Para carregar dados ou estado inicial
    onChange?: (services: LaborService[]) => void; // Para retornar dados no modo draft
    employees: any[];
    readOnly?: boolean;
    onTotalChange?: (total: number) => void;
}

export const LaborManager: React.FC<LaborManagerProps> = ({ 
    osId, 
    mode, 
    initialData = [], 
    onChange, 
    employees, 
    readOnly = false,
    onTotalChange
}) => {
    const [laborServices, setLaborServices] = useState<LaborService[]>(initialData);
    const [newLaborService, setNewLaborService] = useState({ id_funcionario: '', valor: '', descricao: '' });
    const [editingLaborId, setEditingLaborId] = useState<number | string | null>(null);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: '' });

    // Sincroniza com dados externos se mudarem
    useEffect(() => {
        if (initialData) {
            setLaborServices(initialData);
        }
    }, [initialData]);

    // Recalcula total sempre que laborServices mudar
    useEffect(() => {
        const total = laborServices.reduce((acc, svc) => acc + Number(svc.valor), 0);
        if (onTotalChange) onTotalChange(total);
    }, [laborServices, onTotalChange]);

    const handleAddLabor = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        
        const val = Number(newLaborService.valor);
        if (isNaN(val) || val < 0) {
             setStatusMsg({ type: 'error', text: 'Valor inválido.' });
             return;
        }
        if (!newLaborService.id_funcionario) {
            setStatusMsg({ type: 'error', text: 'Selecione um funcionário.' });
            return;
        }

        const employee = employees.find(emp => String(emp.id_funcionario) === String(newLaborService.id_funcionario));
        
        const newItem: LaborService = {
            id_funcionario: newLaborService.id_funcionario,
            valor: val,
            descricao: newLaborService.descricao,
            funcionario: employee
        };

        if (mode === 'api') {
            if (!osId) return;
            try {
                if (editingLaborId) {
                    const payload = {
                        id_funcionario: newItem.id_funcionario,
                        valor: newItem.valor,
                        descricao: newItem.descricao
                    };
                    await api.put(`/servico-mao-de-obra/${editingLaborId}`, payload);
                    setStatusMsg({ type: 'success', text: 'Mão de obra atualizada!' });
                } else {
                    const payload = {
                        id_os: osId,
                        id_funcionario: newItem.id_funcionario,
                        valor: newItem.valor,
                        descricao: newItem.descricao
                    };
                    await api.post('/servico-mao-de-obra', payload);
                    setStatusMsg({ type: 'success', text: 'Mão de obra adicionada!' });
                }
                
                if (onChange) onChange([]); // Trigger reload request
                
                // Reset form
                setNewLaborService({ id_funcionario: '', valor: '', descricao: '' });
                setEditingLaborId(null);
                setTimeout(() => setStatusMsg({ type: null, text: '' }), 1500);
            } catch (error) {
                setStatusMsg({ type: 'error', text: 'Erro ao salvar mão de obra.' });
            }
        } else {
            // DRAFT MODE
            if (editingLaborId) {
                const updatedList = laborServices.map(item => 
                    (item.id_temporary === editingLaborId || item.id_servico_mao_de_obra === editingLaborId) 
                    ? { ...item, ...newItem } 
                    : item
                );
                setLaborServices(updatedList);
                if (onChange) onChange(updatedList);
            } else {
                const newItemWithId = { ...newItem, id_temporary: Date.now().toString() };
                const newList = [...laborServices, newItemWithId];
                setLaborServices(newList);
                if (onChange) onChange(newList);
            }
            setNewLaborService({ id_funcionario: '', valor: '', descricao: '' });
            setEditingLaborId(null);
        }
    };

    const handleEditLabor = (service: LaborService) => {
        setNewLaborService({
            id_funcionario: String(service.id_funcionario),
            valor: String(service.valor),
            descricao: service.descricao || ''
        });
        // Important: Store the correct ID depending on mode/existence
        const idToEdit = service.id_servico_mao_de_obra || service.id_temporary;
        setEditingLaborId(idToEdit || null);
    };

    const handleDeleteLabor = async (id: number | string) => {
        if (mode === 'api') {
            // In API mode, we expect a real numeric ID
            if (!id || typeof id !== 'number') return; 
            try {
                await api.delete(`/servico-mao-de-obra/${id}`);
                setStatusMsg({ type: 'success', text: 'Removido!' });
                if (onChange) onChange([]); // Trigger parent reload
                setTimeout(() => setStatusMsg({ type: null, text: '' }), 1500);
            } catch (error) {
                setStatusMsg({ type: 'error', text: 'Erro ao remover.' });
            }
        } else {
            // In Draft mode, filter by whatever ID we have
            const newList = laborServices.filter(s => (s.id_temporary !== id && s.id_servico_mao_de_obra !== id));
            setLaborServices(newList);
            if (onChange) onChange(newList);
        }
    };

    return (
        <div className="space-y-4">
             {statusMsg.text && (
                 <div className={`text-xs font-bold p-2 rounded-lg text-center ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                     {statusMsg.text}
                 </div>
             )}
             
             {!readOnly && (
                <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-5">
                        <label className="text-[10px] font-black text-primary-400 uppercase mb-1 block">Profissional / Mecânico</label>
                        <select 
                            value={newLaborService.id_funcionario}
                            onChange={e => setNewLaborService({...newLaborService, id_funcionario: e.target.value})}
                            className="w-full p-3 rounded-xl border border-primary-200 outline-none focus:border-primary-500 font-bold text-sm bg-white"
                        >
                            <option value="">Selecione...</option>
                            {employees.map(emp => (
                                <option key={emp.id_funcionario} value={emp.id_funcionario}>
                                    {emp.pessoa_fisica?.pessoa?.nome} ({emp.cargo})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                         <label className="text-[10px] font-black text-primary-400 uppercase mb-1 block">Descrição (Opcional)</label>
                         <input 
                            value={newLaborService.descricao}
                            onChange={e => setNewLaborService({...newLaborService, descricao: e.target.value})}
                            placeholder="Ex: Troca de óleo..."
                            className="w-full p-3 rounded-xl border border-primary-200 outline-none focus:border-primary-500 font-bold text-sm bg-white"
                         />
                    </div>
                    <div className="col-span-12 md:col-span-2">
                        <label className="text-[10px] font-black text-primary-400 uppercase mb-1 block">Valor (R$)</label>
                        <input 
                            type="number" step="0.01"
                            value={newLaborService.valor}
                            onChange={e => setNewLaborService({...newLaborService, valor: e.target.value})}
                            placeholder="0.00"
                            className="w-full p-3 rounded-xl border border-primary-200 outline-none focus:border-primary-500 font-black text-sm bg-white"
                        />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex gap-1">
                        <button 
                            onClick={handleAddLabor} 
                            disabled={!newLaborService.id_funcionario || !newLaborService.valor}
                            className={`w-full h-[46px] rounded-xl flex items-center justify-center transition-colors shadow-lg ${editingLaborId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'} text-white disabled:opacity-50`}
                        >
                            {editingLaborId ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
                        </button>
                        {editingLaborId && (
                            <button 
                                onClick={() => {
                                    setNewLaborService({ id_funcionario: '', valor: '', descricao: '' });
                                    setEditingLaborId(null);
                                }}
                                className="h-[46px] w-[46px] bg-neutral-200 text-neutral-500 hover:bg-neutral-300 rounded-xl flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Lista Mão de Obra */}
            <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                {laborServices.length === 0 ? (
                    <div className="p-6 text-center text-neutral-400 text-xs italic">Nenhum serviço de mão de obra lançado.</div>
                ) : (
                    <table className="w-full text-xs text-left">
                         <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="p-3 font-black text-neutral-400 uppercase text-[9px] tracking-widest">Profissional</th>
                                <th className="p-3 font-black text-neutral-400 uppercase text-[9px] tracking-widest">Descrição</th>
                                <th className="p-3 font-black text-neutral-400 uppercase text-[9px] tracking-widest text-right">Valor</th>
                                <th className="p-3 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {laborServices.map(svc => (
                                <tr key={svc.id_servico_mao_de_obra || svc.id_temporary}>
                                    <td className="p-3 font-bold text-neutral-700">
                                        {svc.funcionario?.pessoa_fisica?.pessoa?.nome || employees.find(e => String(e.id_funcionario) === String(svc.id_funcionario))?.pessoa_fisica?.pessoa?.nome || 'Mecânico'}
                                    </td>
                                    <td className="p-3 text-neutral-600">{svc.descricao || '-'}</td>
                                    <td className="p-3 text-right font-black text-neutral-900">R$ {Number(svc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="p-3 text-center">
                                        {!readOnly && (
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditLabor(svc)} className="text-neutral-400 hover:text-amber-500 transition-colors" title="Editar">
                                                    <Wrench size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteLabor(svc.id_servico_mao_de_obra || svc.id_temporary!)} className="text-neutral-400 hover:text-red-500 transition-colors" title="Remover">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
