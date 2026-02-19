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
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 print:hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {/* Espaço para botões de ação (ex: "+ Novo Cadastro") */}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </header>

      {/* Container que limita a largura e centraliza */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Área do Conteúdo */}
        <main className="animate-in fade-in duration-500">{children}</main>
      </div>
    </div>
  );
};
