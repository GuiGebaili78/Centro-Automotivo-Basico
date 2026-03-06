import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-gray-600">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Icon size={18} />
            </div>
          )}
          <input
            {...props}
            ref={ref}
            className={`
              w-full bg-white border rounded-xl py-2.5 text-base text-gray-900 transition-all outline-none placeholder:text-gray-400
              ${Icon ? "pl-10 pr-4" : "px-4"}
              ${error ? "border-red-500 focus:ring-red-100" : "border-slate-200 focus:ring-primary-100 focus:border-primary-600"}
              ${className}
            `}
          />
        </div>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
