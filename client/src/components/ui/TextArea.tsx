import React, { forwardRef } from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[0.75rem] font-bold text-slate-500 uppercase tracking-widest">
            {label}
          </label>
        )}
        <textarea
          {...props}
          ref={ref}
          className={`
            w-full bg-white border rounded-xl py-2.5 px-4 text-[0.875rem] transition-all outline-none
            ${error ? "border-red-500 focus:ring-red-100" : "border-slate-200 focus:ring-primary-100 focus:border-primary-600"}
            ${className}
          `}
        />
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>
    );
  },
);

TextArea.displayName = "TextArea";
