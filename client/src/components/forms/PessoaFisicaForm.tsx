import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';

interface PessoaFisicaFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const PessoaFisicaForm = ({ onSuccess, onCancel }: PessoaFisicaFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // Schema: id_pessoa, cpf?
    const [idPessoa, setIdPessoa] = useState('');
    const [cpf, setCpf] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                id_pessoa: Number(idPessoa),
                cpf: cpf || null
            };

            const response = await api.post('/pessoa-fisica', payload);
            alert('Pessoa Física cadastrada com sucesso!');
            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            alert('Erro ao cadastrar. Verifique se o ID da Pessoa existe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100">
                <strong>Pré-requisito:</strong> A Pessoa base deve estar cadastrada primeiro.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">ID Pessoa *</label>
                    <input 
                        type="number"
                        value={idPessoa} 
                        onChange={e => setIdPessoa(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                        placeholder="Ex: 10"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CPF</label>
                    <input 
                        value={cpf} 
                        onChange={e => setCpf(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        maxLength={11}
                        placeholder="Somente números"
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
                    {loading ? 'Salvando...' : 'Salvar Pessoa Física'}
                </button>
            </div>
        </form>
    );
};
