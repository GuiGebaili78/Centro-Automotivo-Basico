import React from "react";
import { type LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "primary" | "danger" | "accent" | "neutral";
  className?: string;
}

export const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "neutral",
  className = "",
}: ActionButtonProps) => {
  const variants = {
    primary: "text-primary-600 hover:bg-primary-50 hover:text-primary-700",
    accent: "text-blue-600 hover:bg-blue-50 hover:text-blue-700",
    danger: "text-red-500 hover:bg-red-50 hover:text-red-600",
    neutral: "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600",
  };

  return (
    <div
      className={`group/action relative inline-flex items-center justify-center ${className}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={`p-2 rounded-lg transition-all duration-200 ${variants[variant]}`}
      >
        <Icon size={18} />
      </button>

      {/* TOOLTIP: Otimizado */}
      <div className="absolute bottom-full mb-2 hidden group-hover/action:flex flex-col items-center pointer-events-none z-100 animate-in fade-in zoom-in-95 duration-200">
        <span className="px-2 py-1 text-[10px] font-bold text-white bg-neutral-800 rounded shadow-md whitespace-nowrap uppercase tracking-wider">
          {label}
        </span>
        {/* Triângulo invertido */}
        <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-neutral-800" />
      </div>
    </div>
  );
};
