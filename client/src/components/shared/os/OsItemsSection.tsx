import { Package } from "lucide-react";
import { OsItemForm } from "./OsItemForm";
import { OsItemsTable } from "./OsItemsTable";

interface OsItemsSectionProps {
  items: any[];
  isLocked: boolean;
  onAdd: (item: any) => Promise<boolean>;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;
  checkAvailability: (stockId: string | number) => Promise<any>;
}

export const OsItemsSection = ({
  items,
  isLocked,
  onAdd,
  onEdit,
  onDelete,
  onSearch,
  searchResults,
  setSearchResults,
  checkAvailability,
}: OsItemsSectionProps) => {
  return (
    <div className="space-y-4 pt-4 border-t border-dashed border-neutral-200">
      <h3 className="text-sm font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-3 pb-2 border-b border-neutral-100">
        <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
          <Package size={16} />
        </div>
        Peças e Produtos
      </h3>

      {!isLocked && (
        <OsItemForm
          onAdd={onAdd}
          onSearch={onSearch}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          checkAvailability={checkAvailability}
        />
      )}

      <OsItemsTable
        items={items}
        isLocked={isLocked}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};
