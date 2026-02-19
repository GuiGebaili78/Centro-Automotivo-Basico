export const OsStatus = {
  AGENDAMENTO: "AGENDAMENTO",
  ORCAMENTO: "ORCAMENTO",
  ABERTA: "ABERTA",
  FINANCEIRO: "FINANCEIRO",
  FINALIZADA: "FINALIZADA",
  CANCELADA: "CANCELADA",
} as const;

export type OsStatus = (typeof OsStatus)[keyof typeof OsStatus];
