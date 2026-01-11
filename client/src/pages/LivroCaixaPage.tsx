import { useState } from 'react';
import { 
    LayoutDashboard, 
    CreditCard, 
    Landmark, 
    ArrowRightLeft
} from 'lucide-react';
import { MovimentacoesTab } from '../components/financeiro/MovimentacoesTab';
import { ContasTab } from '../components/financeiro/ContasTab';
import { OperadorasTab } from '../components/financeiro/OperadorasTab';
import { RecebiveisTab } from '../components/financeiro/RecebiveisTab';

export const LivroCaixaPage = () => {
    const [activeTab, setActiveTab] = useState<'MOVIMENTACOES' | 'CONTAS' | 'OPERADORAS' | 'RECEBIVEIS'>('MOVIMENTACOES');

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight mb-2">Gestão Financeira</h1>
                <p className="text-neutral-500 text-lg">Controle consolidado de caixa, bancos e recebíveis.</p>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2 mb-8 bg-neutral-100 p-1.5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('MOVIMENTACOES')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'MOVIMENTACOES' 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50'
                    }`}
                >
                    <ArrowRightLeft size={18} />
                    Movimentações
                </button>
                <button 
                    onClick={() => setActiveTab('CONTAS')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'CONTAS' 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50'
                    }`}
                >
                    <Landmark size={18} />
                    Contas Bancárias
                </button>
                <button 
                    onClick={() => setActiveTab('OPERADORAS')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'OPERADORAS' 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50'
                    }`}
                >
                    <CreditCard size={18} />
                    Operadoras
                </button>
                <button 
                    onClick={() => setActiveTab('RECEBIVEIS')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'RECEBIVEIS' 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50'
                    }`}
                >
                    <LayoutDashboard size={18} />
                    Recebíveis
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="bg-neutral-50 rounded-3xl min-h-[500px]">
                {activeTab === 'MOVIMENTACOES' && <MovimentacoesTab />}
                {activeTab === 'CONTAS' && <ContasTab />}
                {activeTab === 'OPERADORAS' && <OperadorasTab />}
                {activeTab === 'RECEBIVEIS' && <RecebiveisTab />}
            </div>
        </div>
    );
};
