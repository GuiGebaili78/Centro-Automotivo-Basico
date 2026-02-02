import React from "react";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export const Card = ({
  children,
  title,
  description,
  className = "",
}: CardProps) => {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden ${className}`}
    >
      {/* Cabeçalho do Card (opcional) */}
      {(title || description) && (
        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
          {title && (
            <h2 className="text-[1.125rem] font-bold text-slate-800 leading-none">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Conteúdo do Card */}
      <div className="p-6">{children}</div>
    </div>
  );
};
