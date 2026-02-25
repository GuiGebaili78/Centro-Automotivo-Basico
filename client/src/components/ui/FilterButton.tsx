import React from "react";
import { Button } from "./Button";

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * FilterButton component for consistent UI across the application.
 * Follows the design pattern from Dashboard Activity Monitor.
 */
export const FilterButton = ({
  active,
  onClick,
  children,
  className = "",
}: FilterButtonProps) => {
  if (active) {
    return (
      <Button
        variant="primary"
        size="sm"
        className={`text-[10px] h-7 px-3 shadow-sm ${className}`}
        onClick={onClick}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`text-[10px] h-7 px-3 text-neutral-500 hover:text-neutral-700 ${className}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};
