import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../services/api';
import { 
    User, Briefcase, MapPin, DollarSign, FileText, BadgeCheck, 
    ArrowLeft, Search, Building2, Smartphone, ShieldCheck, CreditCard
} from 'lucide-react';
import type { IFuncionario } from '../../types/backend';

interface FuncionarioFormProps {
    initialData?: IFuncionario | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export const FuncionarioForm = ({ initialData, onSuccess, onCancel }: FuncionarioFormProps) => {
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        // Pessoa / PF (Base)
        nome: '',
        genero: '',
        dt_nascimento: '',
        cpf: '',
        rg: '',
        
        // Identificação Profissional (MEI) - Funcionario Table
        razao_social: '',
        nome_fantasia: '',
        cnpj_mei: '',
        inscricao_municipal: '',
        
        // Endereço (Funcionario Table)
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        
        // Contato Pessoal
        telefone_pessoal: '',
        email_pessoal: '',
        
        // Operacional
        cargo: '',
        ativo: 'S',
        dt_admissao: new Date().toISOString().split('T')[0],
        especialidade: '',
        tipo_pagamento: '', // HORA / FIXO
        valor_pagamento: '',
        
        // Comissões
        comissao: '', // MO %
        comissao_pecas: '', // Peças %
        
        // Financeiro
        banco: '',
        agencia: '',
        conta: '',
        chave_pix: '',
        periodicidade_pagamento: '',
        dia_vencimento: '',
        
        // Doc Links
        url_ccmei: '',
        url_cnh: '',
        equipamentos_epis: '',
        
        obs: ''
    });

    useEffect(() => {
        if (initialData) {
            const pf = initialData.pessoa_fisica;
            const p = pf?.pessoa;
            
            setFormData({
                nome: p?.nome || '',
                genero: p?.genero || '',
                dt_nascimento: p?.dt_nascimento ? new Date(p.dt_nascimento).toISOString().split('T')[0] : '',
                cpf: pf?.cpf || '',
                rg: initialData.rg || '',
                
                razao_social: initialData.razao_social || '',
                nome_fantasia: initialData.nome_fantasia || '',
                cnpj_mei: initialData.cnpj_mei || '',
                inscricao_municipal: initialData.inscricao_municipal || '',
                
                cep: initialData.cep || '',
                logradouro: initialData.logradouro || '',
                numero: initialData.numero || '',
                complemento: initialData.complemento || '',
                bairro: initialData.bairro || '',
                cidade: initialData.cidade || '',
                uf: initialData.uf || '',
                
                telefone_pessoal: initialData.telefone_pessoal || '',
                email_pessoal: initialData.email_pessoal || '',
                
                cargo: initialData.cargo || '',
                ativo: initialData.ativo || 'S',
                dt_admissao: initialData.dt_admissao ? new Date(initialData.dt_admissao).toISOString().split('T')[0] : '',
                especialidade: initialData.especialidade || '',
                tipo_pagamento: initialData.tipo_pagamento || '',
                valor_pagamento: initialData.valor_pagamento ? String(initialData.valor_pagamento) : '',
                
                comissao: initialData.comissao ? String(initialData.comissao) : '',
                comissao_pecas: initialData.comissao_pecas ? String(initialData.comissao_pecas) : '',
                
                banco: initialData.banco || '',
                agencia: initialData.agencia || '',
                conta: initialData.conta || '',
                chave_pix: initialData.chave_pix || '',
                periodicidade_pagamento: initialData.periodicidade_pagamento || '',
                dia_vencimento: initialData.dia_vencimento ? String(initialData.dia_vencimento) : '',
                
                url_ccmei: initialData.url_ccmei || '',
                url_cnh: initialData.url_cnh || '',
                equipamentos_epis: initialData.equipamentos_epis || '',
                
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
                console.error("Erro CEP", error);
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Payload helper
            const getFuncionarioPayload = (pId?: number, pfId?: number) => ({
                // Relations if new
                ...(pfId ? { id_pessoa_fisica: pfId } : {}),
                
                // Fields
                ativo: formData.ativo,
                cargo: formData.cargo,
                salario: null, // Legacy field, avoiding usage in favor of valor_pagamento if logic changed, or mapping
                // Assuming 'salario' is base, let's map valor_pagamento to it if needed or use new fields
                // Map valor_pagamento to stored custom field
                valor_pagamento: formData.valor_pagamento ? Number(formData.valor_pagamento) : null,
                tipo_pagamento: formData.tipo_pagamento || null,
                
                comissao: formData.comissao ? Number(formData.comissao) : null,
                comissao_pecas: formData.comissao_pecas ? Number(formData.comissao_pecas) : null,
                
                dt_admissao: new Date(formData.dt_admissao).toISOString(),
                obs: formData.obs || null,
                
                // MEI
                razao_social: formData.razao_social || null,
                nome_fantasia: formData.nome_fantasia || null,
                cnpj_mei: formData.cnpj_mei || null,
                inscricao_municipal: formData.inscricao_municipal || null,
                
                // Personal / Address
                rg: formData.rg || null,
                cep: formData.cep || null,
                logradouro: formData.logradouro || null,
                numero: formData.numero || null,
                complemento: formData.complemento || null,
                bairro: formData.bairro || null,
                cidade: formData.cidade || null,
                uf: formData.uf || null,
                telefone_pessoal: formData.telefone_pessoal || null,
                email_pessoal: formData.email_pessoal || null,
                
                especialidade: formData.especialidade || null,
                
                // Finance
                banco: formData.banco || null,
                agencia: formData.agencia || null,
                conta: formData.conta || null,
                chave_pix: formData.chave_pix || null,
                periodicidade_pagamento: formData.periodicidade_pagamento || null,
                dia_vencimento: formData.dia_vencimento ? Number(formData.dia_vencimento) : null,
                
                // Docs
                url_ccmei: formData.url_ccmei || null,
                url_cnh: formData.url_cnh || null,
                equipamentos_epis: formData.equipamentos_epis || null
            });

            if (initialData) {
                // UPDATE
                // 1. Update Funcionario
                await api.put(`/funcionario/${initialData.id_funcionario}`, getFuncionarioPayload());
                
                // 2. Try Update Pessoa (Name) - Optional optimization
                // Accessing deep relation id
                const pId = initialData.pessoa_fisica?.pessoa?.id_pessoa;
                if (pId) {
                    await api.put(`/pessoa/${pId}`, {
                        nome: formData.nome,
                        genero: formData.genero || null,
                        dt_nascimento: formData.dt_nascimento ? new Date(formData.dt_nascimento).toISOString() : null
                    }).catch(err => console.warn("Erro ao atualizar Pessoa Base", err));
                }
            } else {
                // CREATE FLOW
                // 1. Create Pessoa
                const pessoaRes = await api.post('/pessoa', {
                    nome: formData.nome,
                    genero: formData.genero || null,
                    dt_nascimento: formData.dt_nascimento ? new Date(formData.dt_nascimento).toISOString() : null
                });
                const idPessoa = pessoaRes.data.id_pessoa;
                
                // 2. Create PF
                const pfRes = await api.post('/pessoa-fisica', {
                    id_pessoa: idPessoa,
                    cpf: formData.cpf.replace(/\D/g, '') || null
                });
                const idPf = pfRes.data.id_pessoa_fisica;
                
                // 3. Create Funcionario
                await api.post('/funcionario', getFuncionarioPayload(idPessoa, idPf));
            }
            
            onSuccess();
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || 'Erro ao salvar colaborador.';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Header */}
             <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-100 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onCancel} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-neutral-900 tracking-tight">
                            {initialData ? 'Editar Colaborador' : 'Novo Colaborador'}
                        </h2>
                        <p className="text-sm text-neutral-500 font-medium">{initialData ? 'Atualizando dados do MEI/Funcionário.' : 'Cadastro completo do MEI.'}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} className="hidden sm:block px-6 py-3 text-neutral-500 font-bold text-xs uppercase hover:bg-neutral-50 rounded-xl transition-all">
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-8 py-3 bg-neutral-900 text-white font-black text-xs uppercase rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-all shadow-xl shadow-neutral-900/10 flex items-center gap-2 active:scale-95"
                    >
                        {loading ? 'Salvando...' : <><BadgeCheck size={18} /> Salvar Cadastro</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* COL 1 & 2 */}
                <div className="space-y-8 xl:col-span-2">
                    {/* ID PESSOAL */}
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                                <User size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Dados Pessoais</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Nome Completo *</label>
                                <input 
                                    value={formData.nome}
                                    onChange={(e) => handleChange('nome', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">CPF *</label>
                                <input 
                                    value={formData.cpf}
                                    onChange={(e) => handleChange('cpf', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-mono font-bold text-neutral-900"
                                    placeholder="000.000.000-00"
                                    required={!initialData} 
                                    disabled={!!initialData} // Usually immutable unless specialized flow
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">RG</label>
                                <input 
                                    value={formData.rg}
                                    onChange={(e) => handleChange('rg', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-mono font-bold text-neutral-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Data de Nascimento</label>
                                <input 
                                    type="date"
                                    value={formData.dt_nascimento}
                                    onChange={(e) => handleChange('dt_nascimento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Gênero</label>
                                <select 
                                    value={formData.genero}
                                    onChange={(e) => handleChange('genero', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-900"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ID PROFISSIONAL (MEI) */}
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-neutral-900 text-white rounded-xl">
                                <Briefcase size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Identificação Profissional (MEI)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Razão Social</label>
                                <input 
                                    value={formData.razao_social}
                                    onChange={(e) => handleChange('razao_social', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Nome Fantasia</label>
                                <input 
                                    value={formData.nome_fantasia}
                                    onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">CNPJ MEI</label>
                                <input 
                                    value={formData.cnpj_mei}
                                    onChange={(e) => handleChange('cnpj_mei', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-mono font-bold text-neutral-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Inscrição Municipal</label>
                                <input 
                                    value={formData.inscricao_municipal}
                                    onChange={(e) => handleChange('inscricao_municipal', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                        </div>
                    </div>
                
                    {/* ADDRESS */}
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <MapPin size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Endereço Residencial</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">CEP</label>
                                <div className="relative">
                                    <input 
                                        value={formData.cep}
                                        onChange={(e) => handleChange('cep', e.target.value)}
                                        onBlur={handleCepBlur}
                                        className="w-full bg-neutral-50 border border-neutral-200 pl-4 pr-10 py-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-mono font-bold text-neutral-900"
                                        placeholder="00000-000"
                                    />
                                    <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                </div>
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Logradouro</label>
                                <input 
                                    value={formData.logradouro}
                                    onChange={(e) => handleChange('logradouro', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Número</label>
                                <input 
                                    value={formData.numero}
                                    onChange={(e) => handleChange('numero', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Complemento</label>
                                <input 
                                    value={formData.complemento}
                                    onChange={(e) => handleChange('complemento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Bairro</label>
                                <input 
                                    value={formData.bairro}
                                    onChange={(e) => handleChange('bairro', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Cidade</label>
                                <input 
                                    value={formData.cidade}
                                    onChange={(e) => handleChange('cidade', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">UF</label>
                                <input 
                                    value={formData.uf}
                                    onChange={(e) => handleChange('uf', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* COL 3: OPERACIONAL & FINANCEIRO & LINKS */}
                <div className="space-y-8">
                
                    {/* CONTATO + OPERACIONAL */}
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <Smartphone size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Contato & Cargo</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Cargo / Função *</label>
                                <input 
                                    value={formData.cargo}
                                    onChange={(e) => handleChange('cargo', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-neutral-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Telefone / WhatsApp</label>
                                <input 
                                    value={formData.telefone_pessoal}
                                    onChange={(e) => handleChange('telefone_pessoal', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">E-mail</label>
                                <input 
                                    value={formData.email_pessoal}
                                    onChange={(e) => handleChange('email_pessoal', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Especialidade</label>
                                <input 
                                    value={formData.especialidade}
                                    onChange={(e) => handleChange('especialidade', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-neutral-900"
                                    placeholder="Ex: Injeção, Suspensão"
                                />
                            </div>
                        </div>
                    </div>
                
                    {/* FINANCEIRO */}
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <DollarSign size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Financeiro</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Tipo Pagamento</label>
                                <select 
                                    value={formData.tipo_pagamento}
                                    onChange={(e) => handleChange('tipo_pagamento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-neutral-900 text-xs"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="HORA">Valor Hora</option>
                                    <option value="FIXO_MENSAL">Mensal Fixo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Valor (R$)</label>
                                <input 
                                    value={formData.valor_pagamento}
                                    onChange={(e) => handleChange('valor_pagamento', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Comissão M.O (%)</label>
                                <input 
                                    value={formData.comissao}
                                    onChange={(e) => handleChange('comissao', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Comissão Peça (%)</label>
                                <input 
                                    value={formData.comissao_pecas}
                                    onChange={(e) => handleChange('comissao_pecas', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Chave PIX</label>
                                <input 
                                    value={formData.chave_pix}
                                    onChange={(e) => handleChange('chave_pix', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-neutral-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input 
                                    value={formData.banco} onChange={(e) => handleChange('banco', e.target.value)}
                                    className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl outline-none font-bold text-xs" placeholder="Banco"
                                />
                                <input 
                                    value={formData.conta} onChange={(e) => handleChange('conta', e.target.value)}
                                    className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl outline-none font-bold text-xs" placeholder="Conta"
                                />
                            </div>
                        </div>
                    </div>
                
                    {/* DOCUMENTOS */}
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-50">
                            <div className="p-3 bg-neutral-100 text-neutral-600 rounded-xl">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-lg font-black text-neutral-900">Documentação</h3>
                        </div>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">CCMEI (PDF URL)</label>
                                <input 
                                    value={formData.url_ccmei}
                                    onChange={(e) => handleChange('url_ccmei', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-bold text-neutral-900 placeholder:font-normal text-xs"
                                    placeholder="Link do Drive/Arquivo"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">CNH (PDF URL)</label>
                                <input 
                                    value={formData.url_cnh}
                                    onChange={(e) => handleChange('url_cnh', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-bold text-neutral-900 placeholder:font-normal text-xs"
                                    placeholder="Link do Drive/Arquivo"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-neutral-400 uppercase mb-2">Equipamentos / EPIs</label>
                                <textarea 
                                    value={formData.equipamentos_epis}
                                    onChange={(e) => handleChange('equipamentos_epis', e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl focus:ring-4 focus:ring-neutral-500/10 focus:border-neutral-500 outline-none font-medium text-neutral-800 text-xs min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};
