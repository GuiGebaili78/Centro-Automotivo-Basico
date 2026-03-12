import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class EquipamentoClienteRepository {
  async create(data: Prisma.EquipamentoClienteUncheckedCreateInput) {
    return await prisma.equipamentoCliente.create({
      data,
    });
  }

  async findAll() {
    return await prisma.equipamentoCliente.findMany({
      include: { cliente: true }
    });
  }

  async findByClienteId(clienteId: number) {
    return await prisma.equipamentoCliente.findMany({
      where: { id_cliente: clienteId }
    });
  }

  async findById(id: number) {
    return await prisma.equipamentoCliente.findUnique({
      where: { id_equipamento: id },
      include: { cliente: true }
    });
  }

  async update(id: number, data: Prisma.EquipamentoClienteUncheckedUpdateInput) {
    return await prisma.equipamentoCliente.update({
      where: { id_equipamento: id },
      data,
    });
  }

  async delete(id: number) {
    // Check if there are OS linked
    const linkedOs = await prisma.ordemDeServico.findFirst({
      where: { id_equipamento: id, deleted_at: null }
    });

    if (linkedOs) {
      throw new Error(`Não é possível excluir o equipamento pois ele está vinculado à OS ${linkedOs.id_os}.`);
    }

    return await prisma.equipamentoCliente.delete({
      where: { id_equipamento: id },
    });
  }
}
