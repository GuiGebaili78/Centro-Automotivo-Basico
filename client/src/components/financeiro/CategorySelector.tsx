import { useState, useEffect, useMemo, useId } from "react";
import { ArrowDownCircle } from "lucide-react";
import { Select } from "../ui/Select";

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
  const parentSelectId = useId();
  const childSelectId = useId();

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
      const selectedCat = categories.find((c) => Number(c.id_categoria) === Number(value));
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
      } else {
        setSelectedParentId("");
        setSelectedChildId("");
      }
    } else {
      setSelectedParentId("");
      setSelectedChildId("");
    }
  }, [value, categories]);

  // 5. Get children of selected parent
  const children = useMemo(() => {
    if (!selectedParentId) return [];
    return filteredCats.filter(
      (c) => c.parentId && Number(c.parentId) === Number(selectedParentId)
    );
  }, [filteredCats, selectedParentId]);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedParentId("");
      setSelectedChildId("");
      onChange(0, "");
      return;
    }
    const pId = Number(val);
    setSelectedParentId(pId);
    setSelectedChildId(""); // Reset child

    // Select the parent category itself immediately. If they want to select a child,
    // they can choose it from the Subcategoria dropdown, which will update the selection.
    const cat = categories.find((c) => Number(c.id_categoria) === pId);
    if (cat) {
      onChange(cat.id_categoria, cat.nome);
    } else {
      onChange(0, "");
    }
  };

  const handleChildChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedChildId("");
      // When child is unselected, fall back to the parent category
      const parentCat = categories.find(
        (c) => Number(c.id_categoria) === Number(selectedParentId)
      );
      if (parentCat) {
        onChange(parentCat.id_categoria, parentCat.nome);
      } else {
        onChange(0, "");
      }
      return;
    }
    const cId = Number(val);
    setSelectedChildId(cId);
    const cat = categories.find((c) => Number(c.id_categoria) === cId);
    if (cat) onChange(cat.id_categoria, cat.nome);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Parent Selector */}
      <Select
        id={parentSelectId}
        label="Categoria"
        value={selectedParentId}
        onChange={handleParentChange}
        required={required}
        icon={ArrowDownCircle}
      >
        <option value="">Selecione a Categoria...</option>
        {parents.map((p) => (
          <option key={p.id_categoria} value={p.id_categoria}>
            {p.nome}
          </option>
        ))}
      </Select>

      {/* Child Selector (Only if parent selected and has children) */}
      {selectedParentId && children.length > 0 && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <Select
            id={childSelectId}
            label="Subcategoria"
            value={selectedChildId}
            onChange={handleChildChange}
            required={required}
            className="text-primary-700 font-bold"
            icon={ArrowDownCircle}
          >
            <option value="">Selecione a Subcategoria...</option>
            {children.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
};
