import React from "react";
import { type LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "success"
    | "dark"
    | "outline";
  size?: "sm" | "md" | "lg" | "blocks";
  icon?: LucideIcon;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  icon: Icon,
  isLoading = false,
  children,
  className = "",
  ...props
}: ButtonProps) => {
  // Ajuste de centralização: 'items-center' + 'justify-center' + 'leading-none'
  const baseStyles =
    "inline-flex items-center justify-center font-bold uppercase tracking-tight rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 leading-none";

  const variants = {
    primary:
      "bg-primary-600 text-white hover:bg-primary-800 shadow-lg shadow-primary-600/20",
    secondary:
      "bg-secondary-500 text-white hover:bg-secondary-600 shadow-lg shadow-secondary-500/20",
    danger:
      "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20",
    outline:
      "border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20",
    dark: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20",
  };

  const sizes = {
    sm: "h-8 px-3 text-[10px] gap-1.5", // Altura fixa 'h-8' ajuda na centralização
    md: "h-11 px-5 text-[12px] gap-2", // Altura fixa 'h-11'
    lg: "h-14 px-8 text-[14px] gap-2.5", // Altura fixa 'h-14'
    blocks: "w-full h-14 text-[14px] gap-2.5",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="mt-0.5">Processando...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {Icon && (
            <Icon
              size={size === "sm" ? 14 : size === "lg" ? 20 : 18}
              className="shrink-0"
            />
          )}
          {/* Adicionei um pequeno ajuste fino de margem se necessário, mas o leading-none deve resolver */}
          <span className="flex items-center justify-center pt-[1px]">
            {children}
          </span>
        </div>
      )}
    </button>
  );
};
