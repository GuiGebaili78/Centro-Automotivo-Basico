import React from "react";

// Definindo os tipos de status que fazem sentido para sua oficina
export type BadgeVariant =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "warning"
  | "neutral"
  | "secondary";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge = ({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) => {
  // Aqui usamos o que você aprendeu: cores sólidas para o texto e opacidade (/10 ou /20) para o fundo
  const variants = {
    // Laranja (Primary)
    primary: "bg-primary-500/10 text-primary-700 border-primary-500/20",

    // Cyan (Accent)
    accent: "bg-accent-500/10 text-accent-700 border-accent-500/20",

    // Verde (Sucesso)
    success: "bg-green-500/10 text-green-700 border-green-500/20",

    // Vermelho (Erro/Atenção)
    danger: "bg-red-500/10 text-red-700 border-red-500/20",

    // Amarelo/Dourado (Aviso)
    warning: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",

    // Cinza (Neutro)
    neutral: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20",

    // Laranja (Secondary)
    secondary: "bg-secondary-500/10 text-secondary-700 border-secondary-500/20",
  };

  return (
    <span
      className={`
      inline-flex items-center px-2.5 py-0.5 
      rounded-full text-[10px] font-bold uppercase tracking-wider 
      border ${variants[variant]} ${className}
    `}
    >
      {children}
    </span>
  );
};
