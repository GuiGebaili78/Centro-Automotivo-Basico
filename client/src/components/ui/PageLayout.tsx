import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
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
      {(title || subtitle || actions) && (
        <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 print:hidden">
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Título fixo */}
            <div className="shrink-0">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <div className="text-sm text-slate-500 mt-1 font-medium">
                  {subtitle}
                </div>
              )}
            </div>

            {/* Espaço para botões de ação — ocupa todo o restante do header */}
            {actions && <div className="flex flex-1 items-center gap-3">{actions}</div>}
          </div>
        </header>
      )}

      {/* Container que limita a largura e centraliza */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Área do Conteúdo */}
        <main className="animate-in fade-in duration-500">{children}</main>
      </div>
    </div>
  );
};
