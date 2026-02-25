import React from "react";

interface FilterRadioProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const FilterRadio: React.FC<FilterRadioProps> = ({
  active,
  onClick,
  children,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all
        ${
          active
            ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm"
            : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
};
