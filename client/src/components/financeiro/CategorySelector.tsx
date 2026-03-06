import { useState, useEffect, useMemo } from "react";
import { ArrowDownCircle } from "lucide-react";

interface Category {
  id_categoria: number;
  nome: string;
  tipo: string;
  parentId: number | null;
}

interface CategorySelectorProps {
  categories: Category[]; // Flat list from API
  value?: number; // Selected id_categoria
  onChange: (id: number, nome: string) => void;
  type?: "RECEITA" | "DESPESA" | "AMBOS"; // Filter by type
  required?: boolean;
  className?: string;
}

export const CategorySelector = ({
  categories,
  value,
  onChange,
  type = "AMBOS",
  required = false,
  className = "",
}: CategorySelectorProps) => {
  // 1. Filter by Type (if needed)
  // Note: Parent categories might generally be of the type, or mixed?
  // Our seed has 'Receita' (Type: RECEITA), 'Despesa' (Type: DESPESA).
  const filteredCats = useMemo(() => {
    if (type === "AMBOS") return categories;
    return categories.filter((c) => c.tipo === type || c.tipo === "AMBOS");
  }, [categories, type]);

  // 2. Build Hierarchy
  const parents = useMemo(
    () => filteredCats.filter((c) => !c.parentId),
    [filteredCats],
  );

  // 3. State for selection
  const [selectedParentId, setSelectedParentId] = useState<number | "">("");
  const [selectedChildId, setSelectedChildId] = useState<number | "">("");

  // 4. derivate current selection from props `value`
  useEffect(() => {
    if (value) {
      const selectedCat = categories.find((c) => c.id_categoria === value);
      if (selectedCat) {
        if (selectedCat.parentId) {
          // It's a child
          setSelectedParentId(selectedCat.parentId);
          setSelectedChildId(selectedCat.id_categoria);
        } else {
          // It's a parent
          setSelectedParentId(selectedCat.id_categoria);
          setSelectedChildId("");
        }
      }
    } else {
      setSelectedParentId("");
      setSelectedChildId("");
    }
  }, [value, categories]);

  // 5. Get children of selected parent
  const children = useMemo(() => {
    if (!selectedParentId) return [];
    return filteredCats.filter((c) => c.parentId === Number(selectedParentId));
  }, [filteredCats, selectedParentId]);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = Number(e.target.value);
    setSelectedParentId(pId);
    setSelectedChildId(""); // Reset child

    // Check if this parent has children in the FULL list
    const hasChildren = categories.some((c) => c.parentId === pId);

    if (!hasChildren) {
      // If no children, select the parent itself
      const cat = categories.find((c) => c.id_categoria === pId);
      if (cat) onChange(cat.id_categoria, cat.nome);
    } else {
      // If it has children, we MUST clear the current selection until a child is picked
      // This prevents the parent ID from being sent as the "final" category
      // Pass 0 or check how parent handles "invalid"
      onChange(0, ""); // Clear selection
    }
  };

  const handleChildChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = Number(e.target.value);
    setSelectedChildId(cId);
    const cat = categories.find((c) => c.id_categoria === cId);
    if (cat) onChange(cat.id_categoria, cat.nome);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Parent Selector */}
      <div>
        <label>Categoria</label>
        <div className="relative">
          <select
            value={selectedParentId}
            onChange={handleParentChange}
            required={required}
            className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer"
          >
            <option value="">Selecione a Categoria...</option>
            {parents.map((p) => (
              <option key={p.id_categoria} value={p.id_categoria}>
                {p.nome}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
            <ArrowDownCircle size={14} />
          </div>
        </div>
      </div>

      {/* Child Selector (Only if parent selected and has children) */}
      {selectedParentId && children.length > 0 && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <label className="block text-sm font-medium text-neutral-700 ml-1 mb-1.5">
            Subcategoria
          </label>
          <div className="relative">
            <select
              value={selectedChildId}
              onChange={handleChildChange}
              required={required}
              className="w-full bg-white border border-neutral-200 px-3 py-2.5 rounded-lg font-bold text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all appearance-none cursor-pointer text-primary-700"
            >
              <option value="">Selecione a Subcategoria...</option>
              {children.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nome}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
              <ArrowDownCircle size={14} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
