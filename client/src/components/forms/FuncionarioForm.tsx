import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';
import { Briefcase, DollarSign, Calendar, FileText, Info, User, CheckCircle } from 'lucide-react';

interface FuncionarioFormProps {
    onSuccess: (newItem: any) => void;
    onCancel: () => void;
}

export const FuncionarioForm = ({ onSuccess, onCancel }: FuncionarioFormProps) => {
    const [loading, setLoading] = useState(false);
    
    // User Identity (Pessoa)
    const [nome, setNome] = useState('');
    const [genero, setGenero] = useState('');
    
    // Physical Person (Pessoa Fisica)
    const [cpf, setCpf] = useState('');
    
    // Contract Details (Funcionario)
    const [ativo, setAtivo] = useState('S');
    const [cargo, setCargo] = useState('');
    const [salario, setSalario] = useState('');
    const [comissao, setComissao] = useState('');
    const [dtAdmissao, setDtAdmissao] = useState(new Date().toISOString().split('T')[0]);
    // Other
    const [obs, setObs] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Criar Pessoa Base
            const pessoaResponse = await api.post('/pessoa', {
                nome,
                genero: genero || null,
            });
            const idPessoa = pessoaResponse.data.id_pessoa;

            // 2. Criar Pessoa Física
            const pfResponse = await api.post('/pessoa-fisica', {
                id_pessoa: idPessoa,
                cpf: cpf.replace(/\D/g, '') || null
            });
            const idPessoaFisica = pfResponse.data.id_pessoa_fisica;

            // 3. Criar Funcionário
            const payload = {
                id_pessoa_fisica: idPessoaFisica,
                ativo,
                cargo,
                salario: salario ? Number(salario) : null,
                comissao: comissao ? Number(comissao) : null,
                dt_admissao: new Date(dtAdmissao).toISOString(),
                obs: obs || null
            };

            const response = await api.post('/funcionario', payload);
            alert('Funcionário cadastrado com sucesso!');
            onSuccess(response.data);
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || 'Erro ao cadastrar funcionário.';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 text-neutral-900 bg-white p-2">
             <div className="bg-primary-50 p-4 rounded-2xl flex items-start gap-4 border border-primary-100 mb-2">
                <div className="bg-primary-500 p-2 rounded-xl text-white shadow-lg shadow-primary-500/30">
                    <Info size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-primary-900 uppercase tracking-tight">Cadastro Unificado</h4>
                    <p className="text-xs text-primary-700 font-medium tracking-tight">Este formulário cria automaticamente os registros de Pessoa, Pessoa Física e Funcionário.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* DADOS PESSOAIS */}
                    <div className="col-span-2">
                        <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User size={16} /> Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Nome Completo *</label>
                                <input 
                                    value={nome} 
                                    onChange={e => setNome(e.target.value)} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all" 
                                    required 
                                    placeholder="Nome completo do funcionário"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">CPF</label>
                                <input 
                                    value={cpf} 
                                    onChange={e => setCpf(e.target.value)} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all" 
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Gênero</label>
                                <select 
                                    value={genero} 
                                    onChange={e => setGenero(e.target.value)} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* DADOS CONTRATUAIS */}
                    <div className="col-span-2 border-t border-neutral-100 pt-6">
                        <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Briefcase size={16} /> Dados do Contrato
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Cargo *</label>
                                <input 
                                    value={cargo} 
                                    onChange={e => setCargo(e.target.value)} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all" 
                                    required 
                                    placeholder="Ex: Mecânico, Vendedor"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Status</label>
                                <select 
                                    value={ativo} 
                                    onChange={e => setAtivo(e.target.value)} 
                                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-black text-primary-600 transition-all"
                                >
                                    <option value="S">ATIVO</option>
                                    <option value="N">INATIVO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Salário (R$)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={salario} 
                                        onChange={e => setSalario(e.target.value)} 
                                        className="w-full bg-neutral-50 border border-neutral-200 pl-10 pr-3 py-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all" 
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Comissão (%)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-xs">%</span>
                                    <input 
                                        type="number" 
                                        value={comissao} 
                                        onChange={e => setComissao(e.target.value)} 
                                        className="w-full bg-neutral-50 border border-neutral-200 pl-10 pr-3 py-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all" 
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1">Data de Admissão *</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input 
                                        type="date" 
                                        value={dtAdmissao} 
                                        onChange={e => setDtAdmissao(e.target.value)} 
                                        className="w-full bg-neutral-50 border border-neutral-200 pl-10 pr-3 py-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-neutral-800 transition-all" 
                                        required 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-span-2 border-t border-neutral-100 pt-6">
                        <label className="text-[10px] font-black text-neutral-500 uppercase mb-1 ml-1 flex items-center gap-1">
                            <FileText size={14} /> Observações Internas
                        </label>
                        <textarea 
                            value={obs} 
                            onChange={e => setObs(e.target.value)} 
                            className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-medium text-neutral-800 transition-all min-h-[100px] resize-none" 
                            placeholder="Informações adicionais sobre o colaborador..." 
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-neutral-100">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="flex-1 py-4 text-neutral-500 font-black text-xs uppercase hover:bg-neutral-100 rounded-2xl transition-all tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-2 px-12 py-4 bg-neutral-900 text-white font-black text-xs uppercase rounded-2xl hover:bg-primary-600 disabled:opacity-50 transition-all tracking-widest shadow-xl shadow-neutral-900/10 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? 'Processando...' : (
                            <>
                                Finalizar Cadastro <CheckCircle size={18} />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
