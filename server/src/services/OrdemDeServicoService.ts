import { OrdemDeServicoRepository } from "../repositories/ordemDeServico.repository.js";
import { OsStateMachine, OsStatus } from "../domain/os-state-machine.js";

export class OrdemDeServicoService {
  private repository: OrdemDeServicoRepository;

  constructor() {
    this.repository = new OrdemDeServicoRepository();
  }

  async create(data: any) {
    // Verificando se é payload Unificado (com client, vehicle, os)
    if (data.client && data.vehicle && data.os) {
      OsStateMachine.validateInitialStatus(data.os.status);
      return this.repository.createUnified(data);
    }

    // Payload Padrão (direto com IDs)
    OsStateMachine.validateInitialStatus(data.status);
    return this.repository.create(data);
  }

  async update(id: number, data: any) {
    const currentOs = await this.repository.findById(id);
    if (!currentOs) {
      throw new Error("Ordem de Serviço não encontrada");
    }

    // Validação de Transição e Imutabilidade
    // Se data.status estiver presente, valida a transição.
    // Se não, valida apenas a regra de imutabilidade (não pode editar se FINALIZADA).
    const nextStatus = data.status ? (data.status as OsStatus) : undefined;

    OsStateMachine.validateTransition(currentOs.status as OsStatus, nextStatus);

    // 3. Lógica de Estoque (Moved from Controller)
    const oldStatus = currentOs.status as OsStatus;

    if (nextStatus && nextStatus !== oldStatus) {
      const closedStatuses = [OsStatus.FINANCEIRO, OsStatus.FINALIZADA];
      const isClosing = closedStatuses.includes(nextStatus);
      const wasClosed = closedStatuses.includes(oldStatus);

      // Se movendo para status de fechamento (e não estava fechado) -> DEDUZIR
      if (isClosing && !wasClosed) {
        await this.repository.adjustStockForOS(id, "DEDUCT");
      }
      // Se voltando para aberto (e estava fechado) -> DEVOLVER
      else if (!isClosing && wasClosed) {
        await this.repository.adjustStockForOS(id, "RETURN");
      }
    }

    // Delega para o repositório
    return this.repository.update(id, data);
  }

  async findAll(filters: any) {
    return this.repository.findAll();
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async findByVehicleId(vehicleId: number) {
    return this.repository.findByVehicleId(vehicleId);
  }

  async delete(id: number) {
    const currentOs = await this.repository.findById(id);
    if (currentOs && currentOs.status === OsStatus.FINALIZADA) {
      throw new Error("Não é possível excluir uma OS Finalizada.");
    }
    return this.repository.delete(id);
  }
}
