import { useState, useEffect, useRef, useId } from "react";
import type { FC, ChangeEvent, InputHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { normalizeStr } from "../../utils/normalize";

interface AutocompleteInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  uppercase?: boolean;
}

export const AutocompleteInput: FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  fetchSuggestions,
  uppercase = true,
  className,
  id,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Create a unique ID for the input if one isn't provided
  const generatedId = useId();
  const inputId = id || generatedId;

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
      const exactMatch = results.find(r => normalizeStr(r) === normalizeStr(query));
      if (exactMatch) {
        handleSelect(exactMatch);
        return;
      }
      setSuggestions(results);
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      <label htmlFor={inputId} className="text-sm font-medium text-gray-600 block mb-1">
        {label}
      </label>
      <div className="relative">
        <Input
          id={inputId}
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
          className={`w-full !p-2.5 !bg-neutral-25 ${className || ''}`}
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
        <div className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 ring-4 ring-black/5 p-0">
          {suggestions.map((s, idx) => (
            <Button
              key={`${s}-${idx}`}
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              className={`!w-full !text-left !p-3 !text-sm !font-bold !border-b !border-neutral-50 !flex !justify-between !items-center !group/item !transition-colors !search-result-item !rounded-none !normal-case !tracking-normal !shadow-none !h-auto !justify-start !active:scale-100 ${
                idx === highlightIndex
                  ? "!bg-blue-50 !ring-1 !ring-inset !ring-blue-100 !z-10 !text-blue-700"
                  : "hover:!bg-neutral-50 !text-neutral-700 hover:!text-blue-600"
              }`}
            >
              <span>{s}</span>
            </Button>
          ))}
          <div className="p-2 text-xs text-center text-neutral-400 bg-neutral-50 border-t border-neutral-100 uppercase font-black tracking-widest">
            Use as setas para navegar e Enter para selecionar
          </div>
        </div>
      )}
    </div>
  );
};
