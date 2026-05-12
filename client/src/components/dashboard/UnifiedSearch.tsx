import { useState, useEffect, useRef } from "react";
import { Search, User, Car, Plus, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { Button } from "../ui";

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
          className="block w-full pl-10 pr-16 h-[44px] border-2 border-neutral-200 rounded-xl bg-white placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-semibold text-neutral-800 text-base disabled:opacity-50"
          placeholder="Buscar por cliente, placa ou modelo..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setIsOpen(false); setQuery(""); }
          }}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {query && (
            <button onClick={() => { setQuery(""); setIsOpen(false); }} className="text-neutral-400 hover:text-neutral-600 transition-colors mr-2">
              <span className="text-lg leading-none">×</span>
            </button>
          )}
          <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-400">
            ESC
          </kbd>
        </div>
      </div>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-neutral-200 overflow-hidden max-h-[420px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 z-50">
          {results.length > 0 ? (
            <>
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100">
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                  {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ul>
                {results.map((result, idx) => (
                  <li
                    key={`${result.id_cliente}-${result.id_veiculo || "nv"}-${idx}`}
                    className="px-4 py-3.5 hover:bg-primary-50 cursor-pointer border-b border-neutral-100 last:border-0 transition-colors group"
                    onClick={() => {
                      onSelect(result);
                      setIsOpen(false);
                      setQuery("");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${result.placa ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {result.placa ? <Car size={18} /> : <User size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-900 text-sm truncate group-hover:text-primary-700 transition-colors">
                          {result.display}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5 font-medium truncate">
                          {result.subtext}
                        </p>
                      </div>
                      {result.placa && (
                        <span className="shrink-0 px-2 py-1 bg-neutral-900 text-white rounded-lg text-xs tracking-[0.15em] font-mono font-bold">
                          {result.placa}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : loading ? (
            <div className="p-6 text-center">
              <Loader2 size={24} className="animate-spin text-primary-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-400 font-medium">Buscando...</p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-neutral-600 font-bold text-sm mb-1">Nenhum resultado encontrado</p>
              <p className="text-xs text-neutral-400 mb-4">Tente outro termo ou cadastre um novo cliente.</p>
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
