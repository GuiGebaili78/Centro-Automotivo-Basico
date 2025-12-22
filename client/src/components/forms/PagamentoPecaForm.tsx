import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';

interface PagamentoPecaFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const PagamentoPecaForm = ({ onSuccess, onCancel }: PagamentoPecaFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // Schema: id_item_os, id_fornecedor, custo_real, data_compra, data_pagamento_fornecedor?, pago_ao_fornecedor
    const [idItemOs, setIdItemOs] = useState('');
    const [idFornecedor, setIdFornecedor] = useState('');
    const [custoReal, setCustoReal] = useState('');
    const [dataCompra, setDataCompra] = useState('');
    const [dataPagamentoFornecedor, setDataPagamentoFornecedor] = useState('');
    const [pagoAoFornecedor, setPagoAoFornecedor] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                id_item_os: Number(idItemOs),
                id_fornecedor: Number(idFornecedor),
                custo_real: Number(custoReal),
                data_compra: new Date(dataCompra).toISOString(),
                data_pagamento_fornecedor: dataPagamentoFornecedor ? new Date(dataPagamentoFornecedor).toISOString() : null,
                pago_ao_fornecedor: pagoAoFornecedor
            };

            const response = await api.post('/pagamento-peca', payload);
            alert('Pagamento de peça registrado com sucesso!');
            onSuccess(response.data);
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar pagamento de peça.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-orange-50 p-3 rounded text-sm text-orange-800 border border-orange-100">
                <strong>Rastreio de Custo Real:</strong> Registre o custo efetivo pago ao fornecedor.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">ID Item OS *</label>
                    <input 
                        type="number"
                        value={idItemOs} 
                        onChange={e => setIdItemOs(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                        placeholder="ID do item da OS"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">ID Fornecedor *</label>
                    <input 
                        type="number"
                        value={idFornecedor} 
                        onChange={e => setIdFornecedor(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                        placeholder="ID do fornecedor"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Custo Real (R$) *</label>
                    <input 
                        type="number"
                        step="0.01"
                        value={custoReal} 
                        onChange={e => setCustoReal(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data da Compra *</label>
                    <input 
                        type="date"
                        value={dataCompra} 
                        onChange={e => setDataCompra(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                        required 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Pagamento Fornecedor</label>
                    <input 
                        type="date"
                        value={dataPagamentoFornecedor} 
                        onChange={e => setDataPagamentoFornecedor(e.target.value)} 
                        className="w-full border p-2 rounded border-gray-300" 
                    />
                </div>

                <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={pagoAoFornecedor} 
                            onChange={e => setPagoAoFornecedor(e.target.checked)} 
                            className="w-5 h-5 text-green-600"
                        />
                        <span className="text-sm font-bold text-gray-700">Pago ao Fornecedor</span>
                    </label>
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Registrar Pagamento'}
                </button>
            </div>
        </form>
    );
};
