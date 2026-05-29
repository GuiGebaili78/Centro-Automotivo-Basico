import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Calendar } from "lucide-react";
import { Input, Select } from "../ui";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UniversalFiltersState {
  search: string;
  osId: string;
  status: string;
  operadora: string;
  fornecedor: string;
  /** Strictly YYYY-MM-DD — no time. Hook injects T00:00:00 / T23:59:59 when comparing. */
  startDate: string;
  /** Strictly YYYY-MM-DD — no time. Hook injects T00:00:00 / T23:59:59 when comparing. */
  endDate: string;
  activePeriod: "TODAY" | "7D" | "30D" | "MONTH" | "CUSTOM" | "ALL";
}

export interface UniversalFiltersConfig {
  enableFornecedor?: boolean;
  enableOperadora?: boolean;
  enableOsId?: boolean;
  enableStatus?: boolean;
  fornecedores?: { id: number | string; nome: string }[];
  operadoras?: { id: number | string; nome: string }[];
  statusOptions?: { value: string; label: string }[];
}

interface UniversalFiltersProps {
  onFilterChange: (filters: UniversalFiltersState) => void;
  config?: UniversalFiltersConfig;
  initialState?: Partial<UniversalFiltersState>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATUS_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "PAID", label: "Pagos" },
];

const INITIAL_STATE: UniversalFiltersState = {
  search: "",
  osId: "",
  status: "ALL",
  operadora: "",
  fornecedor: "",
  startDate: "",
  endDate: "",
  activePeriod: "ALL",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns "YYYY-MM-DD" using the LOCAL timezone
 */
const localDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type PeriodKey = "TODAY" | "7D" | "30D" | "MONTH";

const getRangeForPeriod = (
  period: PeriodKey,
): { startDate: string; endDate: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = localDateStr(today);

  if (period === "TODAY") return { startDate: end, endDate: end };

  if (period === "7D") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: localDateStr(start), endDate: end };
  }

  if (period === "30D") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { startDate: localDateStr(start), endDate: end };
  }

  // MONTH — first day of current month
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: localDateStr(start), endDate: end };
};

// ─── Shared CSS tokens ────────────────────────────────────────────────────────

const labelCls =
  "block text-[10px] font-bold uppercase text-neutral-500 tracking-widest mb-1";



// ─── Component ────────────────────────────────────────────────────────────────

export const UniversalFilters = ({
  onFilterChange,
  config = {},
  initialState = {},
}: UniversalFiltersProps) => {
  const {
    enableFornecedor = true,
    enableOperadora = true,
    enableOsId = true,
    enableStatus = true,
    statusOptions = DEFAULT_STATUS_OPTIONS,
  } = config;

  const fornecedores = config.fornecedores ?? [];
  const operadoras = config.operadoras ?? [];

  const defaultState = { ...INITIAL_STATE, ...initialState };
  const [filters, setFilters] = useState<UniversalFiltersState>(defaultState);
  const [manualDate, setManualDate] = useState({ start: false, end: false });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef<UniversalFiltersState>(defaultState);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const emitNow = useCallback(
    (next: UniversalFiltersState) => onFilterChange(next),
    [onFilterChange],
  );

  const update = useCallback(
    (patch: Partial<UniversalFiltersState>, debounced = false) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        if (!debounced) {
          emitNow(next);
        }
        return next;
      });

      if (debounced) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          setFilters((prev) => {
            onFilterChange(prev);
            return prev;
          });
        }, 300);
      }
    },
    [emitNow, onFilterChange],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handlePeriod = (period: PeriodKey) => {
    const range = getRangeForPeriod(period);
    setManualDate({ start: false, end: false });
    update({ activePeriod: period, ...range });
  };

  const handleDate = (field: "startDate" | "endDate", value: string) => {
    setManualDate((prev) => ({
      ...prev,
      [field === "startDate" ? "start" : "end"]: value !== "",
    }));
    update({ [field]: value, activePeriod: "CUSTOM" });
  };

  const handleClear = () => {
    setManualDate({ start: false, end: false });
    setFilters(defaultState);
    onFilterChange(defaultState);
  };

  const periodBtnCls = (key: string) => {
    const active = filters.activePeriod === key;
    return (
      "h-10 px-3 rounded-lg border text-xs font-bold transition-colors " +
      (active
        ? "bg-primary-50 text-primary-600 border-primary-200"
        : "bg-white text-neutral-500 border-neutral-200 hover:border-primary-200 hover:text-primary-500")
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-white p-4 border border-neutral-200 rounded-xl shadow-sm">
      {/* ── LINHA 1: Busca e Selects Principais ────────────────────────────── */}
      <div className="w-full flex flex-col lg:flex-row items-end gap-4">
        {/* Busca Geral */}
        <div className="flex-1 w-full min-w-[250px]">
          <Input
            label="Busca Geral"
            icon={Search}
            placeholder="Pesquisar por cliente, placa, peça ou ID..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value }, true)}
            className={filters.search ? "bg-blue-50 border-blue-300 text-blue-800" : ""}
          />
        </div>

        {/* Nº da OS */}
        <div className="w-full lg:w-32 shrink-0">
          <Input
            label="Nº da OS"
            type="number"
            min={0}
            placeholder={enableOsId ? "Ex: 1250" : "-"}
            value={filters.osId}
            onChange={(e) => enableOsId && update({ osId: e.target.value })}
            disabled={!enableOsId}
            className={!enableOsId ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : (filters.osId ? "bg-blue-50 border-blue-300 text-blue-800" : "")}
          />
        </div>

        {/* Status */}
        <div className="w-full lg:w-60 shrink-0">
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => enableStatus && update({ status: e.target.value })}
            disabled={!enableStatus}
            className={!enableStatus ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : (filters.status !== "ALL" ? "bg-blue-50 border-blue-300 text-blue-800" : "")}
          >
            {enableStatus ? (
              statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            ) : (
              <option value="">Não aplicável</option>
            )}
          </Select>
        </div>

        {/* Operadora (Visível sempre, mas desabilitada se !enableOperadora) */}
        <div className="w-full lg:w-72 shrink-0">
          <Select
            label="Operadora"
            value={filters.operadora}
            onChange={(e) =>
              enableOperadora && update({ operadora: e.target.value })
            }
            disabled={!enableOperadora}
            className={!enableOperadora ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : ""}
          >
            {!enableOperadora ? (
              <option value="">Desabilitado</option>
            ) : (
              <>
                <option value="">Todas</option>
                {operadoras.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.nome}
                  </option>
                ))}
              </>
            )}
          </Select>
        </div>
      </div>

      {/* ── LINHA 2: Fornecedor, Datas e Botão Limpar ──────────────────────── */}
      <div className="w-full flex flex-col lg:flex-row items-end gap-6">
        {/* Fornecedor (Visível sempre, mas desabilitada se !enableFornecedor) */}
        <div className="w-full lg:w-72 shrink-0">
          <Select
            label="Fornecedor"
            value={filters.fornecedor}
            onChange={(e) =>
              enableFornecedor && update({ fornecedor: e.target.value })
            }
            disabled={!enableFornecedor}
            className={!enableFornecedor ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : ""}
          >
            {!enableFornecedor ? (
              <option value="">Desabilitado</option>
            ) : (
              <>
                <option value="">Todos</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.nome}
                  </option>
                ))}
              </>
            )}
          </Select>
        </div>

        {/* Atalhos de Período colados no fornecedor */}
        <div className="flex flex-col shrink-0">
          <label className={labelCls}>Período</label>
          <div className="flex items-center gap-1 h-10">
            {(
              [
                { key: "TODAY", label: "Hoje" },
                { key: "7D", label: "7 Dias" },
                { key: "30D", label: "30 Dias" },
                { key: "MONTH", label: "Mês Atual" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={periodBtnCls(key)}
                onClick={() => handlePeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Inicial */}
        <div className="w-full lg:w-36 shrink-0">
          <Input
            label="De"
            type="date"
            icon={Calendar}
            className={filters.activePeriod === "CUSTOM" && filters.startDate ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold" : "text-neutral-600"}
            value={filters.activePeriod === "CUSTOM" ? filters.startDate : ""}
            onChange={(e) => handleDate("startDate", e.target.value)}
          />
        </div>

        {/* Data Final */}
        <div className="w-full lg:w-36 shrink-0">
          <Input
            label="Até"
            type="date"
            icon={Calendar}
            className={filters.activePeriod === "CUSTOM" && filters.endDate ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold" : "text-neutral-600"}
            value={filters.activePeriod === "CUSTOM" ? filters.endDate : ""}
            onChange={(e) => handleDate("endDate", e.target.value)}
          />
        </div>

        {/* Botão Limpar (ml-auto empurra ele sozinho lá para a direita) */}
        <div className="shrink-0 leading-7 flex justify-end mt-4 lg:mt-0">
          <button
            type="button"
            onClick={handleClear}
            className="h-10 px-4 flex items-center gap-1.5 text-sm text-neutral-400 hover:text-red-500 border border-neutral-200 hover:border-red-300 rounded-lg transition-colors bg-white whitespace-nowrap"
          >
            <X size={14} />
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalFilters;
