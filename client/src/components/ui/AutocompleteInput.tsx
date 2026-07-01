import React, { forwardRef, useId, useState, useEffect, useRef } from "react";
import { Input } from "./Input";

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  labelClassName?: string;
  // Modo 1: campo de estoque (busca no backend de estoque por campo)
  suggestionField?: 'fabricante' | 'modelo' | 'localizacao' | 'aplicacao';
  // Modo 2: sugestões customizadas (fn externa, ex: veículos, financeiro)
  fetchSuggestions?: (q: string) => Promise<string[]>;
  // onChange padrão do input (recebe ChangeEvent) – compatível com inputs controlados
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ label, error, icon, className = "", labelClassName = "", id, suggestionField, fetchSuggestions, value, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const listId = `${inputId}-list`;
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const doFetch = (q: string) => {
      if (fetchSuggestions) {
        fetchSuggestions(q).then(setSuggestions).catch(console.error);
      } else if (suggestionField) {
        import("../../services/estoque.service")
          .then(({ EstoqueService }) => EstoqueService.getSuggestions(suggestionField, q))
          .then(setSuggestions)
          .catch(console.error);
      }
    };

    // Fetch initial on mount
    useEffect(() => {
      doFetch("");
      return () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suggestionField]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) onChange(e);

      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      const val = e.target.value;
      debounceTimeout.current = setTimeout(() => {
        doFetch(val);
      }, 300);
    };

    return (
      <>
        <Input
          id={inputId}
          ref={ref}
          label={label}
          error={error}
          icon={icon}
          className={className}
          labelClassName={labelClassName}
          value={value}
          onChange={handleChange}
          list={listId}
          autoComplete="off"
          {...props}
        />
        <datalist id={listId}>
          {suggestions.map((s, i) => (
            <option key={i} value={s} />
          ))}
        </datalist>
      </>
    );
  },
);

AutocompleteInput.displayName = "AutocompleteInput";
