import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../services/api';
import { 
    Phone, FileText, BadgeCheck, MapPin, DollarSign, 
    ArrowLeft, Search, Building2 
} from 'lucide-react';
import type { IFornecedor } from '../../types/backend';

interface FornecedorFormProps {
    initialData?: IFornecedor | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export const FornecedorForm = ({ initialData, onSuccess, onCancel }: FornecedorFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        // Identificação
        tipo_pessoa: 'JURIDICA',
        nome: '', // Razão Social / Nome Completo
        nome_fantasia: '',
        documento: '', // CNPJ / CPF
        inscricao_estadual: '',
        inscricao_municipal: '',
        
        // Contato
        contato: '', // Nome Vendedor
        telefone: '',
        whatsapp: '',
        email: '',
        
        // Endereço
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        
        // Financeiro
        banco: '',
        agencia: '',
        conta: '',
        chave_pix: '',
        condicoes_pagamento: '',
        categoria_produto: '',
        
        // Extra
        obs: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                tipo_pessoa: initialData.tipo_pessoa || 'JURIDICA',
                nome: initialData.nome || '',
                nome_fantasia: initialData.nome_fantasia || '',
                documento: initialData.documento || '',
                inscricao_estadual: initialData.inscricao_estadual || '',
                inscricao_municipal: initialData.inscricao_municipal || '',
                
                contato: initialData.contato || '',
                telefone: initialData.telefone || '',
                whatsapp: initialData.whatsapp || '',
                email: initialData.email || '',
                
                cep: initialData.cep || '',
                logradouro: initialData.logradouro || '',
                numero: initialData.numero || '',
                complemento: initialData.complemento || '',
                bairro: initialData.bairro || '',
                cidade: initialData.cidade || '',
                uf: initialData.uf || '',
                
                banco: initialData.banco || '',
                agencia: initialData.agencia || '',
                conta: initialData.conta || '',
                chave_pix: initialData.chave_pix || '',
                condicoes_pagamento: initialData.condicoes_pagamento || '',
                categoria_produto: initialData.categoria_produto || '',
                
                obs: initialData.obs || ''
            });
        }
    }, [initialData]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCepBlur = async () => {
        const cepRaw = formData.cep.replace(/\D/g, '');
        if (cepRaw.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        uf: data.uf
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData?.id_fornecedor) {
                await api.put(`/fornecedor/${initialData.id_fornecedor}`, formData);
            } else {
                await api.post('/fornecedor', formData);
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar fornecedor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Actions */}
            <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-100 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onCancel} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-neutral-900 tracking-tight">
                            {initialData ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                        </h2>
                        <p className="text-sm text-neutral-500 font-medium">Preencha os dados completos do parceiro.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="hidden sm:block px-6 py-3 text-neutral-500 font-bold text-xs uppercase hover:bg-neutral-50 rounded-xl transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-8 py-3 bg-neutral-900 text-white font-black text-xs uppercase rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-all shadow-xl shadow-neutral-900/10 flex items-center gap-2 active:scale-95"
                    >
                        {loading ? 'Salvando...' : <><BadgeCheck size={18} /> Salvar Dados</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Identification & Contact */}
                <div className="space-y-8 xl:col-span-2">
                    
                    {/* SECTION 1: IDENTIFICAÇÃO */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <Building2 size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Identificação</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Tipo de Pessoa</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 cursor-pointer border p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${formData.tipo_pessoa === 'JURIDICA' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}>
                                        <input 
                                            type="radio" 
                                            name="tipo_pessoa" 
                                            value="JURIDICA" 
                                            checked={formData.tipo_pessoa === 'JURIDICA'} 
                                            onChange={(e) => handleChange('tipo_pessoa', e.target.value)}
                                            className="hidden"
                                        />
                                        Jurídica (CNPJ)
                                    </label>
                                    <label className={`flex-1 cursor-pointer border p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${formData.tipo_pessoa === 'FISICA' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}>
                                        <input 
                                            type="radio" 
                                            name="tipo_pessoa" 
                                            value="FISICA" 
                                            checked={formData.tipo_pessoa === 'FISICA'} 
                                            onChange={(e) => handleChange('tipo_pessoa', e.target.value)}
                                            className="hidden"
                                        />
                                        Física (CPF)
                                    </label>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Razão Social / Nome Completo *</label>
                                <input 
                                    value={formData.nome}
                                    onChange={(e) => handleChange('nome', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Nome oficial no documento"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Nome Fantasia</label>
                                <input 
                                    value={formData.nome_fantasia}
                                    onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Como a empresa é conhecida"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">{formData.tipo_pessoa === 'JURIDICA' ? 'CNPJ' : 'CPF'}</label>
                                <input 
                                    value={formData.documento}
                                    onChange={(e) => handleChange('documento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-mono font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Apenas números"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Inscrição Estadual</label>
                                <input 
                                    value={formData.inscricao_estadual}
                                    onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="IE (Comércio)"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Inscrição Municipal</label>
                                <input 
                                    value={formData.inscricao_municipal}
                                    onChange={(e) => handleChange('inscricao_municipal', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="IM (Serviços)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ENDEREÇO (LOGÍSTICA) */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <MapPin size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Endereço e Logística</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">CEP</label>
                                <div className="relative">
                                    <input 
                                        value={formData.cep}
                                        onChange={(e) => handleChange('cep', e.target.value)}
                                        onBlur={handleCepBlur}
                                        className="w-full bg-neutral-50 border border-neutral-200 pl-4 pr-10 py-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-mono font-bold text-neutral-900 placeholder:font-normal"
                                        placeholder="00000-000"
                                    />
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} />
                                </div>
                            </div>
                            
                            <div className="md:col-span-4">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Logradouro</label>
                                <input 
                                    value={formData.logradouro}
                                    onChange={(e) => handleChange('logradouro', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-neutral-900 placeholder:font-normal uppercase"
                                    placeholder="Rua, Avenida, etc."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Número</label>
                                <input 
                                    value={formData.numero}
                                    onChange={(e) => handleChange('numero', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Complemento</label>
                                <input 
                                    value={formData.complemento}
                                    onChange={(e) => handleChange('complemento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Sala, Bloco..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Bairro</label>
                                <input 
                                    value={formData.bairro}
                                    onChange={(e) => handleChange('bairro', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-neutral-900 placeholder:font-normal uppercase"
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Cidade</label>
                                <input 
                                    value={formData.cidade}
                                    onChange={(e) => handleChange('cidade', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-neutral-900 placeholder:font-normal uppercase"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">UF</label>
                                <input 
                                    value={formData.uf}
                                    onChange={(e) => handleChange('uf', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-neutral-900 placeholder:font-normal uppercase"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Contact & Finance */}
                <div className="space-y-8">
                    
                    {/* SECTION 3: CONTATO */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <Phone size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Dados de Contato</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Vendedor / Contato</label>
                                <input 
                                    value={formData.contato}
                                    onChange={(e) => handleChange('contato', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Com quem falar"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Telefone Fixo</label>
                                <input 
                                    value={formData.telefone}
                                    onChange={(e) => handleChange('telefone', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">WhatsApp / Celular</label>
                                <input 
                                    value={formData.whatsapp}
                                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">E-mail (NFE/Boletos)</label>
                                <input 
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="financeiro@empresa.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: FINANCEIRO */}
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <DollarSign size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Financeiro</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Dados Bancários / PIX</label>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input 
                                        value={formData.banco}
                                        onChange={(e) => handleChange('banco', e.target.value)}
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl outline-none font-bold text-xs" 
                                        placeholder="Banco"
                                    />
                                    <input 
                                        value={formData.agencia}
                                        onChange={(e) => handleChange('agencia', e.target.value)}
                                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl outline-none font-bold text-xs" 
                                        placeholder="Agência"
                                    />
                                    <input 
                                        value={formData.conta}
                                        onChange={(e) => handleChange('conta', e.target.value)}
                                        className="col-span-2 w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl outline-none font-bold text-xs" 
                                        placeholder="Conta Corrente"
                                    />
                                </div>
                                <input 
                                    value={formData.chave_pix}
                                    onChange={(e) => handleChange('chave_pix', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none font-mono font-bold text-neutral-900 placeholder:font-normal text-sm"
                                    placeholder="Chave PIX"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Condição de Pagamento</label>
                                <input 
                                    value={formData.condicoes_pagamento}
                                    onChange={(e) => handleChange('condicoes_pagamento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Ex: 28 dias, 30/60..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Categoria de Produto</label>
                                <input 
                                    value={formData.categoria_produto}
                                    onChange={(e) => handleChange('categoria_produto', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none font-bold text-neutral-900 placeholder:font-normal"
                                    placeholder="Ex: Peças Motor, Pneus..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FULL WIDTH: OBS */}
                <div className="xl:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                        <div className="p-3 bg-neutral-100 text-neutral-600 rounded-xl">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-lg font-black text-neutral-900">Observações Gerais</h3>
                    </div>
                    <textarea 
                        value={formData.obs}
                        onChange={(e) => handleChange('obs', e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-medium text-neutral-800 transition-all min-h-[120px] resize-none"
                        placeholder="Informações adicionais importantes..."
                    />
                </div>
            </div>
        </form>
    );
};
