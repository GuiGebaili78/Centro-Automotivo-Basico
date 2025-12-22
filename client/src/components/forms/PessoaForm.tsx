import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';

interface PessoaFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const PessoaForm = ({ onSuccess, onCancel }: PessoaFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // Schema: nome, genero?, dt_nascimento?, obs?
    const [nome, setNome] = useState('');
    const [genero, setGenero] = useState('');
    const [dtNascimento, setDtNascimento] = useState('');
    const [obs, setObs] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                nome,
                genero: genero || null,
                dt_nascimento: dtNascimento ? new Date(dtNascimento) : null,
                obs: obs || null
            };

            const response = await api.post('/pessoa', payload);
            alert('Pessoa cadastrada com sucesso!');
            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            alert('Erro ao cadastrar pessoa.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo *</label>
                    <input 
                        value={nome} 
                        onChange={e => setNome(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gênero</label>
                    <select value={genero} onChange={e => setGenero(e.target.value)} className="w-full border p-2 rounded border-gray-300">
                        <option value="">Selecione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Nascimento</label>
                    <input 
                        type="date" 
                        value={dtNascimento} 
                        onChange={e => setDtNascimento(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observações</label>
                    <textarea 
                        value={obs} 
                        onChange={e => setObs(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        rows={3}
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Pessoa'}
                </button>
            </div>
        </form>
    );
};
