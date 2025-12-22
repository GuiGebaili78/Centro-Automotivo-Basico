import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';
import { normalizePlate } from '../../utils/normalize';
import { Car, Search, User, Check, X, CheckCircle, AlertCircle } from 'lucide-react';

interface VeiculoFormProps {
    clientId?: number | null;
    vehicleId?: number;
    initialData?: any;
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
    onCreateClient?: () => void;
}

interface ClientResult {
    id_cliente: number;
    email: string;
    telefone_1: string;
    pessoa_fisica?: {
        pessoa: { nome: string };
        cpf: string;
    };
    pessoa_juridica?: {
        razao_social: string;
        nome_fantasia: string;
        cnpj: string;
    };
}

export const VeiculoForm = ({ clientId, vehicleId, initialData, onSuccess, onCancel, onCreateClient }: VeiculoFormProps) => {
    const [loading, setLoading] = useState(false);
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    
    // Client Search State
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [clientResults, setClientResults] = useState<ClientResult[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<{id: number, name: string} | null>(null);
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    const firstInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [placa, setPlaca] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [cor, setCor] = useState('');
    const [anoModelo, setAnoModelo] = useState('');
    const [combustivel, setCombustivel] = useState('Flex');
    const [chassi, setChassi] = useState('');

    useEffect(() => {
        if (firstInputRef.current) {
            firstInputRef.current.focus();
        }
    }, [clientId, vehicleId]);

    useEffect(() => {
        if (initialData) {
            setPlaca(initialData.placa || '');
            setMarca(initialData.marca || '');
            setModelo(initialData.modelo || '');
            setCor(initialData.cor || '');
            setAnoModelo(initialData.ano_modelo || '');
            setCombustivel(initialData.combustivel || 'Flex');
            setChassi(initialData.chassi || '');
        }
    }, [initialData]);

    const [clientActiveIndex, setClientActiveIndex] = useState(-1);
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setClientResults([]);
            setClientActiveIndex(-1);
            return;
        }

        if (clientResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = clientActiveIndex + 1 >= clientResults.length ? 0 : clientActiveIndex + 1;
            setClientActiveIndex(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = clientActiveIndex - 1 < 0 ? clientResults.length - 1 : clientActiveIndex - 1;
            setClientActiveIndex(prev);
        } else if (e.key === 'Enter' && clientActiveIndex !== -1) {
            e.preventDefault();
            selectClient(clientResults[clientActiveIndex]);
        }
    };

    const handleSearchClient = async (term: string) => {
        setClientSearchTerm(term);
        setClientActiveIndex(-1);
        if (term.length < 3) {
            setClientResults([]);
            return;
        }

        setIsSearchingClient(true);
        try {
            const response = await api.get(`/cliente/search?name=${term}`);
            setClientResults(response.data);
        } catch (error) {
            console.error('Erro ao buscar clientes', error);
        } finally {
            setIsSearchingClient(false);
        }
    };

    const selectClient = (client: ClientResult) => {
        const name = client.pessoa_fisica?.pessoa?.nome || 
                     client.pessoa_juridica?.nome_fantasia || 
                     client.pessoa_juridica?.razao_social || 
                     'Cliente Sem Nome';
        
        setSelectedOwner({ id: client.id_cliente, name });
        setClientResults([]);
        setClientSearchTerm('');
        setClientActiveIndex(-1);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormStatus({ type: null, message: '' });
        
        const finalClientId = clientId || selectedOwner?.id;

        // For creation, clientId is required.
        if (!vehicleId && !finalClientId) {
            setFormStatus({ type: 'error', message: 'É necessário selecionar um proprietário.' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                id_cliente: finalClientId, 
                placa: normalizePlate(placa),
                marca,
                modelo,
                cor,
                ano_modelo: anoModelo,
                combustivel,
                chassi
            };

            if (vehicleId) {
                const response = await api.put(`/veiculo/${vehicleId}`, payload);
                setFormStatus({ type: 'success', message: 'Veículo atualizado com sucesso!' });
                setTimeout(() => onSuccess(response.data), 1500);
            } else {
                const response = await api.post('/veiculo', payload);
                setFormStatus({ type: 'success', message: 'Veículo cadastrado com sucesso!' });
                setTimeout(() => onSuccess(response.data), 1500);
            }
        } catch (error: any) {
            console.error(error);
            setFormStatus({ type: 'error', message: 'Erro ao salvar veículo: ' + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine if we need to show client selection
    const needsClientSelection = !vehicleId && !clientId;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 text-neutral-900">
            {formStatus.type && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${formStatus.type === 'success' ? 'bg-success-50 text-success-700 border border-success-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {formStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-bold">{formStatus.message}</p>
                </div>
            )}
            
            {/* 1. Client Selection Section (Only for new vehicles where ID isn't pre-injected) */}
            {needsClientSelection && (
                <div className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="text-primary-600" size={20} />
                        <h3 className="font-bold text-neutral-800">Proprietário do Veículo</h3>
                    </div>

                    {!selectedOwner ? (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                            <input
                                ref={firstInputRef}
                                type="text"
                                placeholder="Buscar cliente por nome..."
                                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-200 outline-none font-bold"
                                value={clientSearchTerm}
                                onChange={(e) => handleSearchClient(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            
                            {/* Results Dropdown */}
                            {clientResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {clientResults.map((client, idx) => {
                                         const name = client.pessoa_fisica?.pessoa?.nome || client.pessoa_juridica?.nome_fantasia || client.pessoa_juridica?.razao_social;
                                         const contact = client.telefone_1 || client.email || 'Sem Contato';
                                         return (
                                            <button
                                                key={client.id_cliente}
                                                type="button"
                                                onClick={() => selectClient(client)}
                                                className={`w-full text-left p-3 hover:bg-primary-50 transition-colors border-b border-neutral-100 last:border-0 ${idx === clientActiveIndex ? 'bg-primary-100' : ''}`}
                                            >
                                                <div className="font-bold text-sm text-neutral-800">{name}</div>
                                                <div className="text-xs text-neutral-500">{contact}</div>
                                            </button>
                                         );
                                    })}
                                </div>
                            )}
                            {clientSearchTerm.length > 2 && clientResults.length === 0 && !isSearchingClient && (
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-neutral-500 mb-2">Nenhum cliente encontrado.</p>
                                    {onCreateClient && (
                                        <button 
                                            type="button" 
                                            onClick={onCreateClient}
                                            className="text-sm text-primary-600 font-bold hover:underline"
                                        >
                                            + Cadastrar Novo Cliente
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-primary-50 p-3 rounded-lg border border-primary-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-600 text-white p-2 rounded-full">
                                    <Check size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-primary-600 font-bold uppercase">Cliente Selecionado</p>
                                    <p className="font-bold text-primary-900">{selectedOwner.name}</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSelectedOwner(null)}
                                className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                                title="Alterar Cliente"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 2. Vehicle Info Section */}
            <div className="space-y-4">
                <div className="bg-primary-50 p-4 rounded-lg flex items-center gap-3">
                    <Car className="text-primary-600" size={24} />
                    <div>
                        <h3 className="font-bold text-primary-900">Dados do Veículo</h3>
                        <p className="text-xs text-primary-700">Preencha as informações do veículo.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Placa *</label>
                        <input 
                            ref={needsClientSelection ? null : firstInputRef}
                            value={placa} 
                            onChange={e => setPlaca(e.target.value.toUpperCase())} 
                            maxLength={7}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-mono tracking-wider font-bold placeholder:text-neutral-300"
                            placeholder="ABC1234"
                            required 
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Marca *</label>
                         <input value={marca} onChange={e => setMarca(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-bold" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Modelo *</label>
                        <input value={modelo} onChange={e => setModelo(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-bold" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Cor *</label>
                        <input value={cor} onChange={e => setCor(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-bold" required />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Ano Modelo (YYYY)</label>
                        <input type="number" value={anoModelo} onChange={e => setAnoModelo(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Combustível</label>
                         <select value={combustivel} onChange={e => setCombustivel(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-bold">
                            <option value="Flex">Flex</option>
                            <option value="Gasolina">Gasolina</option>
                            <option value="Etanol">Etanol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="GNV">GNV</option>
                            <option value="Elétrico">Elétrico</option>
                         </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Chassi</label>
                        <input value={chassi} onChange={e => setChassi(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 font-mono font-bold" />
                    </div>
                </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button type="button" onClick={onCancel} className="flex-1 py-3 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={loading || (!clientId && !selectedOwner && !vehicleId)}
                    className="flex-1 py-3 bg-primary-600 text-white font-black rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/30"
                >
                    {loading ? 'Salvando...' : (vehicleId ? 'Salvar Alterações' : 'Salvar Veículo')}
                </button>
            </div>
        </form>
    );
};
