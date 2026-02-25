import React, { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon | React.ElementType;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, icon: Icon, className = "", children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[0.75rem] font-bold text-slate-500 uppercase tracking-widest">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Icon size={18} />
            </div>
          )}
          <select
            {...props}
            ref={ref}
            className={`
              w-full bg-white border rounded-xl py-2.5 text-[0.875rem] transition-all outline-none appearance-none
              ${Icon ? "pl-10 pr-10" : "pl-4 pr-10"}
              ${error ? "border-red-500 focus:ring-red-100" : "border-slate-200 focus:ring-primary-100 focus:border-primary-600"}
              ${className}
            `}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown size={18} />
          </div>
        </div>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
