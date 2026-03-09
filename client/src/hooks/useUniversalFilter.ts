import { useMemo } from "react";
import type { UniversalFiltersState } from "../components/common/UniversalFilters";

// ─── FilterOptions ────────────────────────────────────────────────────────────

export interface FilterOptions<T> {
  /** Field holding the item date. Falls back to a list of common candidates. */
  dateField?: keyof T;
  /** Field holding the status. Falls back to 'status' then 'pago_ao_fornecedor'. */
  statusField?: keyof T;
  /** Value that represents the "paid" state. Default: 'PAGO' or `true`. */
  paidValue?: unknown;
  /** Value that represents the "pending" state. Default: 'PENDENTE' or `false`. */
  pendingValue?: unknown;
  /** Field for card operator id. Default: 'id_operadora'. */
  operadoraField?: keyof T;
  /** Field for supplier id. Default: 'id_fornecedor'. */
  fornecedorField?: keyof T;
  /** Field for OS id. Default: 'id_os'. */
  osIdField?: keyof T;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Recursively extracts only primitive values (string | number | boolean)
 * from an object, concatenated with a space. Avoids JSON keys and metadata.
 */
function extractText(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(extractText).join(" ");
  if (typeof val === "object") {
    return Object.values(val as Record<string, unknown>)
      .map(extractText)
      .join(" ");
  }
  return "";
}

/**
 * Strips accents and lowercases a string for accent-insensitive comparison.
 * e.g. "Óleo" → "oleo"
 */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Date field candidates tried in order when no `dateField` option is given. */
const DATE_FIELD_CANDIDATES = [
  "data_compra",
  "data_pagamento",
  "data_pagamento_fornecedor",
  "data_prevista",
  "data_venda",
  "dt_movimentacao",
  "dt_abertura",
  "dt_entrega",
  "dt_pagamento",
  "created_at",
  "updated_at",
];

/**
 * Builds a Date Safari-safely from a "YYYY-MM-DD" string + explicit time parts.
 * Uses `new Date(y, m, d, h, min, s)` instead of string concatenation,
 * which avoids inconsistent ISO parsing on Safari/iOS.
 * Returns `null` if the string is invalid.
 */
function parseLocalDate(
  dateStr: string,
  hours: number,
  minutes: number,
  seconds: number
): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // months are 0-indexed
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d, hours, minutes, seconds, 0);
}

/**
 * Resolves the date value from an item for a given field.
 * Returns `null` if the field is absent, null, or results in an invalid Date.
 */
function resolveItemDate<T extends object>(
  item: T,
  field: keyof T
): Date | null {
  const raw = (item as any)[field];
  if (raw === null || raw === undefined) return null;
  const d = raw instanceof Date ? raw : new Date(raw as string);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Finds the first available date field in an item from the candidate list.
 */
function detectDateField<T extends object>(
  item: T
): keyof T | null {
  for (const candidate of DATE_FIELD_CANDIDATES) {
    if (candidate in item) return candidate as keyof T;
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUniversalFilter<T extends object>(
  data: T[],
  filters: UniversalFiltersState,
  options: FilterOptions<T> = {}
): T[] {
  return useMemo(() => {
    if (!data || data.length === 0) return [];

    const {
      statusField,
      paidValue,
      pendingValue,
      operadoraField,
      fornecedorField,
      osIdField,
      dateField,
    } = options;

    // Build start/end Date objects once (Safari-safe, open-ended)
    const startDate = filters.startDate
      ? parseLocalDate(filters.startDate, 0, 0, 0)
      : null;
    const endDate = filters.endDate
      ? parseLocalDate(filters.endDate, 23, 59, 59)
      : null;

    // Normalize search term once
    const searchTerm = normalize(filters.search.trim());

    return data.filter((item) => {
      const i = item as any;

      // ── 1. Status ──────────────────────────────────────────────────────────
      if (filters.status !== "ALL") {
        const field = statusField
          ? String(statusField)
          : "status" in i
          ? "status"
          : "pago_ao_fornecedor" in i
          ? "pago_ao_fornecedor"
          : null;

        if (field) {
          const val = i[field];
          const isPaid =
            paidValue !== undefined ? val === paidValue : val === "PAGO" || val === true;
          const isPending =
            pendingValue !== undefined
              ? val === pendingValue
              : val === "PENDENTE" || val === false;

          if (filters.status === "PAID" && !isPaid) return false;
          if (filters.status === "PENDING" && !isPending) return false;
        }
      }

      // ── 2. Operadora ───────────────────────────────────────────────────────
      if (filters.operadora !== "") {
        const field = operadoraField ? String(operadoraField) : "id_operadora";
        if (String(i[field]) !== filters.operadora) return false;
      }

      // ── 3. Fornecedor ──────────────────────────────────────────────────────
      if (filters.fornecedor !== "") {
        const field = fornecedorField ? String(fornecedorField) : "id_fornecedor";
        if (String(i[field]) !== filters.fornecedor) return false;
      }

      // ── 4. ID da OS ────────────────────────────────────────────────────────
      if (filters.osId !== "") {
        const field = osIdField ? String(osIdField) : "id_os";
        if (String(i[field]) !== filters.osId) return false;
      }

      // ── 5. Date range (open-ended + null-safe) ─────────────────────────────
      if (startDate || endDate) {
        const resolvedField = dateField ?? detectDateField(item);

        if (resolvedField) {
          const itemDate = resolveItemDate(item, resolvedField);

          if (itemDate === null) return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
        }
      }

      // ── 6. General search (accent-insensitive, recursive primitives) ────────
      if (searchTerm !== "") {
        const itemText = normalize(extractText(item));
        if (!itemText.includes(searchTerm)) return false;
      }

      return true;
    });
  }, [data, filters, options]);
}

