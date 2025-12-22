import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';
import { Store, User, Phone, FileText, BadgeCheck } from 'lucide-react';

interface FornecedorFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const FornecedorForm = ({ onSuccess, onCancel }: FornecedorFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // Schema: nome, documento?, contato?
    const [nome, setNome] = useState('');
    const [documento, setDocumento] = useState('');
    const [contato, setContato] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                nome,
                documento: documento || null,
                contato: contato || null
            };

            const response = await api.post('/fornecedor', payload);
            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            alert('Erro ao cadastrar fornecedor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-orange-50 p-4 rounded-xl flex items-center gap-3 border border-orange-100">
                <Store className="text-orange-500" />
                <p className="text-sm text-orange-800 font-medium">Cadastre um novo parceiro para fornecimento de peças.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-black text-neutral-500 uppercase flex items-center gap-2 mb-2">
                        <User size={14} /> Nome / Razão Social *
                    </label>
                    <input 
                        value={nome} 
                        onChange={e => setNome(e.target.value)} 
                        className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 transition-all placeholder:font-normal"
                        required 
                        placeholder="Ex: Auto Peças Silva LTDA"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-black text-neutral-500 uppercase flex items-center gap-2 mb-2">
                            <FileText size={14} /> Documento (CPF/CNPJ)
                        </label>
                        <input 
                            value={documento} 
                            onChange={e => setDocumento(e.target.value)} 
                            className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 transition-all placeholder:font-normal"
                            placeholder="Somente números"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black text-neutral-500 uppercase flex items-center gap-2 mb-2">
                            <Phone size={14} /> Contato
                        </label>
                        <input 
                            value={contato} 
                            onChange={e => setContato(e.target.value)} 
                            className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 transition-all placeholder:font-normal"
                            placeholder="Telefone, Whatsapp ou Email"
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={onCancel} className="flex-1 py-4 text-neutral-600 font-black text-xs uppercase hover:bg-neutral-50 rounded-xl transition-colors">
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 py-4 bg-neutral-900 text-white font-black text-xs uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-50 shadow-xl shadow-neutral-900/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                    {loading ? 'Salvando...' : <><BadgeCheck size={18} /> Cadastrar Fornecedor</>}
                </button>
            </div>
        </form>
    );
};
