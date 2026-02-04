import { useState, useEffect, useRef } from "react";
import { Search, User, Car, Plus, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { Button } from "../ui/Button";

interface SearchResult {
  type: "cliente_veiculo";
  display: string;
  subtext: string;
  id_cliente: number;
  id_veiculo?: number;
  placa?: string;
}

interface UnifiedSearchProps {
  onSelect: (result: SearchResult) => void;
  onNewRecord: () => void;
}

export const UnifiedSearch = ({
  onSelect,
  onNewRecord,
}: UnifiedSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce logic or direct effect?
  // User asked for "letra por letra", so maybe fast debounce or direct.
  // Given local data might be used in Dashboard, but here let's assume we might need API or local filtering.
  // The plan said "frontend filter initially".

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    try {
      // Fetching all relevant data to filter locally or using a search endpoint if available.
      // For performance, ideally this matches the "fetchData" in dashboard, checking if we can reuse or just fetch search.
      // Let's emulate a search endpoint behavior by filtering 'clients' and 'vehicles' endpoints if optimized,
      // or using a specific endpoint if one existed.
      // User context: "procurar dinamicamente por clientes e veículos".

      // Let's assume we fetch all for now as per plan, or use a smart search.
      // Since we don't have a dedicated /search endpoint in the summary, let's call existing ones in parallel?
      // Or maybe the dashboard already has them?
      // To be self-contained, let's fetch here or better, receive data as props?
      // Receiving data as props might be better if Dashboard already loads them.
      // But Dashboard loads 'OS', 'Contas', etc. It doesn't seem to load ALL clients/vehicles.
      // So we should fetch here.

      const response = await api.get(`/cliente`); // Assuming this returns list.
      // Note: If list is huge, this is bad. But maintaining context constraint: "search letter by letter".

      // OPTIMIZATION: In a real app we'd search server-side.
      // I'll simulate server-side search by fetching and filtering here for MVP as per plan.

      const allClients = response.data;

      const normalizedQuery = val.toLowerCase();

      const matches: SearchResult[] = [];

      allClients.forEach((c: any) => {
        const clientName = (
          c.pessoa_fisica?.pessoa?.nome ||
          c.pessoa_juridica?.nome_fantasia ||
          ""
        ).toLowerCase();
        const phones = [c.telefone_1, c.telefone_2]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        // Check Vehicles
        if (c.veiculos && c.veiculos.length > 0) {
          c.veiculos.forEach((v: any) => {
            const plate = (v.placa || "").toLowerCase();
            const model = (v.modelo || "").toLowerCase();

            if (
              clientName.includes(normalizedQuery) ||
              plate.includes(normalizedQuery) ||
              model.includes(normalizedQuery) ||
              phones.includes(normalizedQuery)
            ) {
              matches.push({
                type: "cliente_veiculo",
                display: `${c.pessoa_fisica?.pessoa?.nome || c.pessoa_juridica?.nome_fantasia} - ${v.modelo}`,
                subtext: `${v.placa} • ${v.cor || ""} • ${v.marca || ""}`,
                id_cliente: c.id_cliente,
                id_veiculo: v.id_veiculo,
                placa: v.placa,
              });
            }
          });
        } else {
          // Client without vehicle
          if (
            clientName.includes(normalizedQuery) ||
            phones.includes(normalizedQuery)
          ) {
            matches.push({
              type: "cliente_veiculo",
              display:
                c.pessoa_fisica?.pessoa?.nome ||
                c.pessoa_juridica?.nome_fantasia,
              subtext: "Sem veículo cadastrado",
              id_cliente: c.id_cliente,
            });
          }
        }
      });

      setResults(matches.slice(0, 10)); // Limit 10
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full z-50">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-primary-500 transition-colors">
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Search size={20} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-4 py-3 border-2 border-neutral-200 rounded-xl leading-5 bg-white placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium text-neutral-700 disabled:opacity-50"
          placeholder="Buscar por Placa, Cliente ou Veículo..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[10px] font-bold text-neutral-400">
            ESC
          </kbd>
        </div>
      </div>

      {isOpen && (
        <div className="absolute mt-1 w-full bg-white rounded-xl shadow-2xl border border-neutral-100 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in zoom-in duration-200">
          {results.length > 0 ? (
            <ul>
              {results.map((result, idx) => (
                <li
                  key={`${result.id_cliente}-${result.id_veiculo || "nv"}`}
                  className={`px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-neutral-50 last:border-0 transition-colors ${idx === 0 ? "bg-primary-50/30" : ""}`} // Highlight first item
                  onClick={() => {
                    onSelect(result);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-neutral-100 rounded-lg text-neutral-500">
                      {result.placa ? <Car size={18} /> : <User size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-800 text-sm">
                        {result.display}
                        {result.placa && (
                          <span className="ml-2 px-1.5 py-0.5 bg-neutral-800 text-white rounded text-[10px] tracking-widest font-mono">
                            {result.placa}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                        {result.subtext}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center">
              <p className="text-neutral-500 text-sm mb-3">
                Nenhum resultado encontrado.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                className="w-full justify-center"
                onClick={() => {
                  onNewRecord();
                  setIsOpen(false);
                }}
              >
                Cadastrar Novo Cliente/Veículo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
