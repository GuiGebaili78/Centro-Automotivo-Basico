import React from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterRadioProps {
  options: FilterOption[];
  value: string;
  onChange: (value: any) => void;
  className?: string;
}

export const FilterRadio: React.FC<FilterRadioProps> = ({
  options,
  value,
  onChange,
  className = "",
}) => {
  return (
    <div className={`flex bg-neutral-100 p-1 rounded-xl shrink-0 ${className}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
              ${
                isActive
                  ? "bg-primary-200 text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
