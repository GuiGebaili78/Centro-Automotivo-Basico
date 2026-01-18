export const formatCurrency = (
  value: number | string | undefined | null,
): string => {
  if (value === undefined || value === null || value === "") return "R$ 0,00";
  const numberValue = Number(value);
  if (isNaN(numberValue)) return "R$ 0,00";

  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};
