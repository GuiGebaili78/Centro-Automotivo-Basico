import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode; // Para botões como "Novo Cliente" que ficam no topo
}

export const PageLayout = ({
  children,
  title,
  subtitle,
  actions,
}: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Container que limita a largura e centraliza */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho da Página Padronizado */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>

          {/* Espaço para botões de ação (ex: "+ Novo Cadastro") */}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        {/* Área do Conteúdo */}
        <main className="animate-in fade-in duration-500">{children}</main>
      </div>
    </div>
  );
};
