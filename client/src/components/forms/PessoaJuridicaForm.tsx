import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';

interface PessoaJuridicaFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const PessoaJuridicaForm = ({ onSuccess, onCancel }: PessoaJuridicaFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // Schema: id_pessoa, razao_social, nome_fantasia?, cnpj?, inscricao_estadual?
    const [idPessoa, setIdPessoa] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [nomeFantasia, setNomeFantasia] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [inscricaoEstadual, setInscricaoEstadual] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                id_pessoa: Number(idPessoa),
                razao_social: razaoSocial,
                nome_fantasia: nomeFantasia || null,
                cnpj: cnpj || null,
                inscricao_estadual: inscricaoEstadual || null
            };

            const response = await api.post('/pessoa-juridica', payload);
            alert('Pessoa Jurídica cadastrada com sucesso!');
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
            <div className="bg-purple-50 p-3 rounded text-sm text-purple-800 border border-purple-100">
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

                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Razão Social *</label>
                    <input 
                        value={razaoSocial} 
                        onChange={e => setRazaoSocial(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Fantasia</label>
                    <input 
                        value={nomeFantasia} 
                        onChange={e => setNomeFantasia(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CNPJ</label>
                    <input 
                        value={cnpj} 
                        onChange={e => setCnpj(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        maxLength={14}
                        placeholder="Somente números"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Inscrição Estadual</label>
                    <input 
                        value={inscricaoEstadual} 
                        onChange={e => setInscricaoEstadual(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
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
                    className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Pessoa Jurídica'}
                </button>
            </div>
        </form>
    );
};
