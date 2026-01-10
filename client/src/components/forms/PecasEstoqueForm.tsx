import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';

interface PecasEstoqueFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const PecasEstoqueForm = ({ onSuccess, onCancel }: PecasEstoqueFormProps) => {
    const [loading, setLoading] = useState(false);

    // Form States
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [fabricante, setFabricante] = useState('');
    const [unidadeMedida, setUnidadeMedida] = useState('');
    const [valorCusto, setValorCusto] = useState('');
    const [valorVenda, setValorVenda] = useState('');
    const [estoqueAtual, setEstoqueAtual] = useState('');
    const [custoUnitarioPadrao, setCustoUnitarioPadrao] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                nome,
                descricao,
                unidade_medida: unidadeMedida,
                valor_custo: Number(valorCusto),
                valor_venda: Number(valorVenda),
                estoque_atual: Number(estoqueAtual),
                custo_unitario_padrao: custoUnitarioPadrao ? Number(custoUnitarioPadrao) : 0
            };

            const response = await api.post('/pecas-estoque', payload);
            alert('Peça cadastrada com sucesso!');
            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            alert('Erro ao cadastrar peça.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome da Peça *</label>
                    <input value={nome} onChange={e => setNome(e.target.value)} className="w-full border p-2 rounded border-gray-300" required />
                </div>
                 <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição Detalhada *</label>
                    <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full border p-2 rounded border-gray-300" required />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unidade Medida</label>
                    <input value={unidadeMedida} onChange={e => setUnidadeMedida(e.target.value)} className="w-full border p-2 rounded border-gray-300" placeholder="Ex: UN, KG, LT" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor Custo (R$) *</label>
                    <input type="number" step="0.01" value={valorCusto} onChange={e => setValorCusto(e.target.value)} className="w-full border p-2 rounded border-gray-300" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor Venda (R$) *</label>
                    <input type="number" step="0.01" value={valorVenda} onChange={e => setValorVenda(e.target.value)} className="w-full border p-2 rounded border-gray-300" required />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estoque Atual *</label>
                    <input type="number" value={estoqueAtual} onChange={e => setEstoqueAtual(e.target.value)} className="w-full border p-2 rounded border-gray-300" required />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Custo Padrão (Ref.)</label>
                    <input type="number" step="0.01" value={custoUnitarioPadrao} onChange={e => setCustoUnitarioPadrao(e.target.value)} className="w-full border p-2 rounded border-gray-300" />
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
                    {loading ? 'Salvando...' : 'Salvar Peça'}
                </button>
            </div>
        </form>
    );
};
