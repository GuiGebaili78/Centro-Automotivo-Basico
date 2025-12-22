import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-9xl font-black text-slate-200">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 mt-4">Página não encontrada</h2>
      <p className="text-slate-500 mt-2 max-w-md">
        Ops! A rota que você tentou acessar não existe ou foi movida.
      </p>
      <Link 
        to="/" 
        className="mt-8 flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        <Home size={20} />
        Voltar para o Início
      </Link>
    </div>
  );
}