import { useState, useMemo } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronDown, Settings } from "lucide-react";
import type { ICategoriaEstoque } from "../../services/categoriaEstoque.service";
import { Button } from "../ui/Button";

interface CategoriaComboboxProps {
  categorias: ICategoriaEstoque[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  onManageClick: () => void;
  disabled?: boolean;
}

export const CategoriaCombobox = ({
  categorias,
  selectedId,
  onChange,
  onManageClick,
  disabled = false,
}: CategoriaComboboxProps) => {
  const [query, setQuery] = useState("");

  const filteredCategorias = useMemo(() => {
    return query === ""
      ? categorias
      : categorias.filter((cat) =>
          cat.nome.toLowerCase().includes(query.toLowerCase())
        );
  }, [query, categorias]);

  const selectedCat = useMemo(() => {
    return categorias.find((c) => c.id_categoria === selectedId) || null;
  }, [selectedId, categorias]);

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
          Categoria / Tipo
        </label>
        <div className="relative">
          <Combobox value={selectedCat} onChange={(cat) => onChange(cat ? cat.id_categoria : null)} disabled={disabled}>
            <div className={`relative w-full cursor-default rounded-lg text-left shadow-sm border border-neutral-200 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-colors sm:text-sm ${disabled ? "bg-neutral-100 opacity-70" : "bg-white"}`}>
              <Combobox.Input
                className="w-full border-none py-2.5 pl-3 pr-10 text-sm leading-5 text-gray-900 bg-transparent focus:ring-0 outline-none placeholder:text-neutral-400"
                displayValue={(cat: ICategoriaEstoque | null) => cat?.nome || ""}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar ou selecionar..."
                autoComplete="off"
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown
                  className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-hidden="true"
                />
              </Combobox.Button>
            </div>
            
            <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredCategorias.length === 0 && query !== "" ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 italic">
                  Nenhuma categoria encontrada.
                </div>
              ) : (
                <>
                  <Combobox.Option
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                        active ? "bg-primary-50 text-primary-900" : "text-gray-900"
                      }`
                    }
                    value={null}
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? "font-bold" : "font-normal"} text-neutral-500`}>
                          Nenhuma
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                  {filteredCategorias.map((cat) => (
                    <Combobox.Option
                      key={cat.id_categoria}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                          active ? "bg-primary-50 text-primary-900" : "text-gray-900"
                        }`
                      }
                      value={cat}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate ${selected ? "font-bold" : "font-medium"}`}>
                            {cat.nome}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))}
                </>
              )}
            </Combobox.Options>
          </Combobox>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onManageClick}
        disabled={disabled}
        className="px-3 shrink-0 h-[42px] border-neutral-200 text-neutral-600 hover:bg-neutral-50"
        title="Gerenciar Categorias"
      >
        <Settings size={18} />
      </Button>
    </div>
  );
};
