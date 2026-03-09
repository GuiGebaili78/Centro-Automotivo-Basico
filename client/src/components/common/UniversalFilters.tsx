import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Calendar } from "lucide-react";

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
 * Returns "YYYY-MM-DD" using the LOCAL timezone — avoids the UTC day-shift
 * bug where `toISOString()` might return the previous day in UTC-3 (Brazil).
 */
const localDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type PeriodKey = "TODAY" | "7D" | "30D" | "MONTH";

const getRangeForPeriod = (period: PeriodKey): { startDate: string; endDate: string } => {
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

const inputCls =
  "w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 " +
  "focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-neutral-400";

const disabledCls =
  "w-full h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm " +
  "text-neutral-400 opacity-50 cursor-not-allowed outline-none";

// ─── Component ────────────────────────────────────────────────────────────────

export const UniversalFilters = ({
  onFilterChange,
  config = {},
}: UniversalFiltersProps) => {
  const {
    enableFornecedor = true,
    enableOperadora = true,
    enableOsId = true,
    enableStatus = true,
    statusOptions = DEFAULT_STATUS_OPTIONS,
  } = config;

  // Safe access — if prop is missing the select just shows "Todos"
  const fornecedores = config.fornecedores ?? [];
  const operadoras = config.operadoras ?? [];

  const [filters, setFilters] = useState<UniversalFiltersState>(INITIAL_STATE);

  // Track which date fields were typed manually (to colour them blue)
  const [manualDate, setManualDate] = useState({ start: false, end: false });

  // Debounce ref for search field
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last emitted state reference — we emit all non-search changes immediately
  const filtersRef = useRef<UniversalFiltersState>(INITIAL_STATE);

  // Sync ref whenever state changes
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  /** Emit immediately (used for all fields except search). */
  const emitNow = useCallback(
    (next: UniversalFiltersState) => onFilterChange(next),
    [onFilterChange]
  );

  /** Update filters. `debounced` = true only for the search field. */
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
    [emitNow, onFilterChange]
  );

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Period button handler
  const handlePeriod = (period: PeriodKey) => {
    const range = getRangeForPeriod(period);
    setManualDate({ start: false, end: false });
    update({ activePeriod: period, ...range });
  };

  // Manual date input
  const handleDate = (field: "startDate" | "endDate", value: string) => {
    setManualDate((prev) => ({
      ...prev,
      [field === "startDate" ? "start" : "end"]: value !== "",
    }));
    update({ [field]: value, activePeriod: "CUSTOM" });
  };

  // Clear all
  const handleClear = () => {
    setManualDate({ start: false, end: false });
    setFilters(INITIAL_STATE);
    onFilterChange(INITIAL_STATE);
  };

  // Period button style
  const periodBtnCls = (key: string) => {
    const active = filters.activePeriod === key;
    return (
      "h-9 px-3 rounded-lg border text-xs font-bold transition-colors " +
      (active
        ? "bg-primary-50 text-primary-600 border-primary-200"
        : "bg-white text-neutral-500 border-neutral-200 hover:border-primary-200 hover:text-primary-500")
    );
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">

      {/* ── Row 1: text/select filters ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

        {/* Busca Geral */}
        <div className="sm:col-span-1">
          <label className={labelCls}>Busca Geral</label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              className={`${inputCls} pl-8`}
              placeholder="Pesquisar em tudo..."
              value={filters.search}
              onChange={(e) => update({ search: e.target.value }, true /* debounced */)}
            />
          </div>
        </div>

        {/* Nº da OS */}
        <div>
          <label className={labelCls}>Nº da OS</label>
          <input
            type="number"
            min={0}
            className={enableOsId ? inputCls : disabledCls}
            placeholder="Ex: 1250"
            disabled={!enableOsId}
            value={filters.osId}
            onChange={(e) => update({ osId: e.target.value })}
          />
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>Status</label>
          <select
            className={enableStatus ? inputCls : disabledCls}
            disabled={!enableStatus}
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Operadora */}
        <div>
          <label className={labelCls}>Operadora</label>
          <select
            className={enableOperadora ? inputCls : disabledCls}
            disabled={!enableOperadora}
            value={filters.operadora}
            onChange={(e) => update({ operadora: e.target.value })}
          >
            <option value="">Todas</option>
            {operadoras.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.nome}</option>
            ))}
          </select>
        </div>

        {/* Fornecedor */}
        <div>
          <label className={labelCls}>Fornecedor</label>
          <select
            className={enableFornecedor ? inputCls : disabledCls}
            disabled={!enableFornecedor}
            value={filters.fornecedor}
            onChange={(e) => update({ fornecedor: e.target.value })}
          >
            <option value="">Todos</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={String(f.id)}>{f.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Row 2: date range ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Period shortcuts */}
        <div>
          <label className={labelCls}>Período</label>
          <div className="flex gap-1">
            {(
              [
                { key: "TODAY", label: "Hoje" },
                { key: "7D",    label: "7 Dias" },
                { key: "30D",   label: "30 Dias" },
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

        {/* De */}
        <div className="flex-1 min-w-[130px]">
          <label className={`${labelCls} flex items-center gap-1`}>
            <Calendar size={10} />De
          </label>
          <input
            type="date"
            className={
              `${inputCls} ` +
              (manualDate.start ? "text-primary-600 font-semibold" : "text-neutral-600")
            }
            value={filters.startDate}
            onChange={(e) => handleDate("startDate", e.target.value)}
          />
        </div>

        {/* Até */}
        <div className="flex-1 min-w-[130px]">
          <label className={`${labelCls} flex items-center gap-1`}>
            <Calendar size={10} />Até
          </label>
          <input
            type="date"
            className={
              `${inputCls} ` +
              (manualDate.end ? "text-primary-600 font-semibold" : "text-neutral-600")
            }
            value={filters.endDate}
            onChange={(e) => handleDate("endDate", e.target.value)}
          />
        </div>

        {/* Clear */}
        <div>
          <button
            type="button"
            onClick={handleClear}
            className="h-10 px-4 flex items-center gap-1.5 text-sm text-neutral-400 hover:text-red-500 border border-neutral-200 hover:border-red-300 rounded-lg transition-colors bg-white"
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
