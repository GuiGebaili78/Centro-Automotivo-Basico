import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  uppercase?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  fetchSuggestions,
  uppercase = true,
  className,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (uppercase) val = val.toUpperCase();
    onChange(val);
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(val);
    }, 300);
  };

  const handleSelect = (selectedVal: string) => {
    let val = selectedVal;
    if (uppercase) val = val.toUpperCase();
    onChange(val);
    setSuggestions([]);
    setHighlightIndex(-1);
  };

  return (
    <div className="relative group/search w-full">
      <label className="text-sm font-medium text-gray-600 block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIndex((prev) =>
                Math.min(prev + 1, suggestions.length - 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIndex((prev) => Math.max(prev - 1, -1));
            } else if (e.key === "Enter") {
              if (highlightIndex >= 0 && suggestions[highlightIndex]) {
                e.preventDefault();
                handleSelect(suggestions[highlightIndex]);
              }
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!document.activeElement?.className.includes("search-result-item")) {
                setSuggestions([]);
              }
            }, 200);
          }}
          className={`w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-25 text-base text-gray-900 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all placeholder:text-gray-400 ${className || ''}`}
          {...props}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-primary-500" />
          </div>
        )}
      </div>

      {/* SEARCH RESULTS DROPDOWN */}
      {suggestions.length > 0 && (
        <ul role="listbox" className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 ring-4 ring-black/5 list-none p-0">
          {suggestions.map((s, idx) => (
            <li
              key={`${s}-${idx}`}
              role="option"
              aria-selected={idx === highlightIndex}
              className="list-none"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className={`w-full text-left p-3 text-sm font-bold border-b border-neutral-50 flex justify-between items-center group/item transition-colors search-result-item ${
                  idx === highlightIndex
                    ? "bg-blue-50 ring-1 ring-inset ring-blue-100 z-10 text-blue-700"
                    : "hover:bg-neutral-50 text-neutral-700 hover:text-blue-600"
                }`}
              >
                <span>{s}</span>
              </button>
            </li>
          ))}
          <li className="p-2 text-xs text-center text-neutral-400 bg-neutral-50 border-t border-neutral-100 uppercase font-black tracking-widest list-none">
            Use as setas para navegar e Enter para selecionar
          </li>
        </ul>
      )}
    </div>
  );
};
