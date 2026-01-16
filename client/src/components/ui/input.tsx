import React, { forwardRef } from "react";
import { type LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  variant?: "default" | "filled" | "error";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, icon: Icon, error, variant = "default", className = "", ...props },
    ref
  ) => {
    // Estilos base do container e do input
    const containerStyles = "flex flex-col gap-1.5 w-full";

    const baseInputStyles =
      "w-full transition-all outline-none rounded-lg border text-sm disabled:opacity-50 disabled:bg-neutral-100";

    const variants = {
      default:
        "border-neutral-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-neutral-900 bg-white",
      filled:
        "border-transparent bg-neutral-200 focus:bg-white focus:border-primary-500 text-neutral-900",
      error:
        "border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-900 bg-red-50",
    };

    // Ajuste de padding se houver ícone
    const paddingStyles = Icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5";

    return (
      <div className={containerStyles}>
        {label && (
          <label className="text-sm font-semibold text-neutral-700 ml-1">
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                error ? "text-red-400" : "text-neutral-400"
              }`}
              size={20}
            />
          )}

          <input
            ref={ref}
            className={`${baseInputStyles} ${
              variants[error ? "error" : variant]
            } ${paddingStyles} ${className}`}
            {...props}
          />
        </div>

        {error && (
          <span className="text-xs font-medium text-red-500 ml-1">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
