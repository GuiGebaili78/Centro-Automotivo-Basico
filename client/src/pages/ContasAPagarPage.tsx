import { Wallet } from 'lucide-react';

export const ContasAPagarPage = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Contas a Pagar (Geral)</h1>
                    <p className="text-neutral-500">Gerência de despesas fixas e variáveis da oficina (Luz, Água, Aluguel, etc).</p>
                </div>
            </div>

            <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                    <Wallet size={32} />
                </div>
                <h2 className="text-xl font-black text-neutral-800 mb-2">Em Construção</h2>
                <p className="text-neutral-500 max-w-md mx-auto">
                    A funcionalidade de gerenciamento de Contas a Pagar (Geral) será implementada em breve.
                </p>
                <button className="mt-6 px-6 py-3 bg-neutral-900 text-white font-bold rounded-xl shadow-lg opacity-50 cursor-not-allowed">
                    Nova Conta a Pagar
                </button>
            </div>
        </div>
    );
};
