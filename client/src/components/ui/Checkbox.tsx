import React, { forwardRef } from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center">
            <input
              {...props}
              ref={ref}
              type="checkbox"
              className={`
                peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-200 
                bg-white transition-all checked:border-primary-600 checked:bg-primary-600 
                hover:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-100
                ${error ? "border-red-500" : ""}
                ${className}
              `}
            />
            <svg
              className="absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          {label && (
            <span className="text-sm font-bold text-neutral-900 select-none group-hover:text-primary-700 transition-colors">
              {label}
            </span>
          )}
        </label>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
