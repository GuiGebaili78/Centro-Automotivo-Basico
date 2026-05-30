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
 * Recursively extracts primitive values (string | number | boolean)
 * from any object, explicitly checking relations like 'equipamento',
 * 'veiculo', and 'cliente' to guarantee they are fully indexed for search.
 */
function extractText(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(extractText).join(" ");
  if (typeof val === "object") {
    // Treat Date objects specifically
    if (val instanceof Date) {
      return val.toLocaleDateString("pt-BR");
    }

    const obj = val as Record<string, unknown>;

    // Handle Decimal constructor safely
    if (obj.constructor && obj.constructor.name === "Decimal") {
      return String(val);
    }

    let explicitParts: string[] = [];

    // Explicitly grab piece avulsa (equipamento) fields
    if ("equipamento" in obj && obj.equipamento) {
      const eq = obj.equipamento as any;
      if (eq.nome_peca) explicitParts.push(eq.nome_peca);
      if (eq.fabricante) explicitParts.push(eq.fabricante);
      if (eq.numeracao) explicitParts.push(eq.numeracao);
      if (eq.observacoes) explicitParts.push(eq.observacoes);
    }

    // Explicitly grab vehicle fields
    if ("veiculo" in obj && obj.veiculo) {
      const v = obj.veiculo as any;
      if (v.placa) explicitParts.push(v.placa);
      if (v.marca) explicitParts.push(v.marca);
      if (v.modelo) explicitParts.push(v.modelo);
      if (v.cor) explicitParts.push(v.cor);
      if (v.ano_modelo) explicitParts.push(String(v.ano_modelo));
    }

    // Explicitly grab client fields
    if ("cliente" in obj && obj.cliente) {
      const c = obj.cliente as any;
      const pfName = c.pessoa_fisica?.pessoa?.nome;
      const pjFantasia = c.pessoa_juridica?.nome_fantasia;
      const pjRazao = c.pessoa_juridica?.razao_social;
      if (pfName) explicitParts.push(pfName);
      if (pjFantasia) explicitParts.push(pjFantasia);
      if (pjRazao) explicitParts.push(pjRazao);
      if (c.telefone_1) explicitParts.push(c.telefone_1);
      if (c.telefone_2) explicitParts.push(c.telefone_2);
    }

    // Recursively handle any other properties, skipping relations we handled explicitly
    const otherParts = Object.entries(obj).map(([key, value]) => {
      if (
        key === "created_at" ||
        key === "updated_at" ||
        key === "deleted_at" ||
        key === "cliente" ||
        key === "veiculo" ||
        key === "equipamento"
      ) {
        return "";
      }
      return extractText(value);
    });

    return [...explicitParts, ...otherParts].filter(Boolean).join(" ");
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

      // ── 4b. Categoria ──────────────────────────────────────────────────────
      if (filters.categoriaId && filters.categoriaId !== "") {
        const catId = Number(filters.categoriaId);
        const matchProp = i.id_categoria === catId;
        const matchParent = i.categoria_financeira?.parentId === catId;
        if (!matchProp && !matchParent) return false;
      }

      // ── 4c. Subcategoria ───────────────────────────────────────────────────
      if (filters.subcategoriaId && filters.subcategoriaId !== "") {
        const subcatId = Number(filters.subcategoriaId);
        if (i.id_categoria !== subcatId) return false;
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

