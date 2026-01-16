import React from "react";
import { type LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success" | "dark";
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
  const baseStyles =
    "font-black uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-primary-900 hover:bg-primary-800 hover:scale-105 transition-all shadow-xl shadow-primary-500/20 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm",
    secondary: "bg-gray-100 text-gray-600 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700",
    ghost:
      "bg-transparent text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200",
    success:
      "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200",
    dark: "bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-200",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-5 py-2.5 text-xs",
    lg: "px-8 py-4 text-sm",
    blocks: "w-full py-4 text-sm",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 18} />}
          {children}
        </>
      )}
    </button>
  );
};
