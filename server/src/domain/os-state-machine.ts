export enum OsStatus {
  AGENDAMENTO = "AGENDAMENTO",
  ORCAMENTO = "ORCAMENTO",
  ABERTA = "ABERTA",
  FINANCEIRO = "FINANCEIRO",
  FINALIZADA = "FINALIZADA",
  CANCELADA = "CANCELADA",
}

const ALLOWED_INITIAL_STATUSES = [
  OsStatus.AGENDAMENTO,
  OsStatus.ORCAMENTO,
  OsStatus.ABERTA,
];

const ALLOWED_TRANSITIONS: Record<OsStatus, OsStatus[]> = {
  [OsStatus.AGENDAMENTO]: [OsStatus.ABERTA, OsStatus.CANCELADA],
  [OsStatus.ORCAMENTO]: [OsStatus.ABERTA, OsStatus.CANCELADA],
  [OsStatus.ABERTA]: [OsStatus.FINANCEIRO, OsStatus.CANCELADA],
  [OsStatus.FINANCEIRO]: [
    OsStatus.FINALIZADA,
    OsStatus.ABERTA,
    OsStatus.CANCELADA,
  ],
  [OsStatus.FINALIZADA]: [],
  [OsStatus.CANCELADA]: [],
};

export class OsStateMachine {
  static validateInitialStatus(status: string): OsStatus {
    const s = status as OsStatus;
    if (!ALLOWED_INITIAL_STATUSES.includes(s)) {
      throw new Error(
        `Status inicial inválido: '${status}'. Permitidos: ${ALLOWED_INITIAL_STATUSES.join(", ")}`,
      );
    }
    return s;
  }

  static validateTransition(
    currentStatus: OsStatus,
    nextStatus: OsStatus | undefined,
  ): void {
    // 1. Se não houver mudança de status, permite (mesmo se FINALIZADA, para permitir atualizar outros campos como defeito/diagnostico)
    if (!nextStatus || currentStatus === nextStatus) {
      return;
    }

    // 2. Bloqueio Total de Imutabilidade para mudanças de status reais
    if (currentStatus === OsStatus.FINALIZADA) {
      throw new Error("A OS está FINALIZADA e o status não pode ser alterado.");
    }

    // 3. Validação da Transição
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new Error(
        `Transição de status inválida: De '${currentStatus}' para '${nextStatus}'`,
      );
    }
  }

  // Helper para o frontend saber se pode editar
  static canEdit(status: OsStatus): boolean {
    return status !== OsStatus.FINALIZADA;
  }
}
