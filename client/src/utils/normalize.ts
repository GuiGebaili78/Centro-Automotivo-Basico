// Utility functions for data normalization and search

/**
 * Normaliza uma placa de veículo removendo hífens e convertendo para maiúsculas
 * Exemplos: "GIN-1175" -> "GIN1175", "gin1175" -> "GIN1175"
 */
export const normalizePlate = (plate: string): string => {
  return plate.replace(/-/g, "").toUpperCase().trim();
};

/**
 * Normaliza um nome para busca case-insensitive
 * Remove espaços extras e converte para maiúsculas
 * Exemplos: "Tania" -> "TANIA", "  joão silva  " -> "JOÃO SILVA"
 */
export const normalizeName = (name: string): string => {
  return name.trim().toUpperCase();
};

/**
 * Formata um nome seguindo o padrão Title Case (primeira letra maiúscula)
 * Exemplo: "JOÃO SILVA" -> "João Silva", "tania" -> "Tania"
 */
export const formatNameTitleCase = (name: string): string => {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Formata uma placa no padrão brasileiro (XXX-0000 ou XXX0X00)
 * Exemplo: "GIN1175" -> "GIN-1175"
 */
export const formatPlate = (plate: string): string => {
  const normalized = normalizePlate(plate);
  if (normalized.length === 7) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }
  return normalized;
};

/**
 * Compara duas strings de forma case-insensitive
 */
export const caseInsensitiveMatch = (str1: string, str2: string): boolean => {
  return str1.toUpperCase() === str2.toUpperCase();
};

/**
 * Verifica se uma string contém outra (case-insensitive)
 */
export const caseInsensitiveIncludes = (
  haystack: string,
  needle: string,
): boolean => {
  return haystack.toUpperCase().includes(needle.toUpperCase());
};
/**
 * Formata um número de telefone para o padrão (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
 */
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
};
