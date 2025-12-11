import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class VeiculoRepository {
  async create(data: Prisma.VeiculoCreateInput) {
    return await prisma.veiculo.create({
      data,
    });
  }

  async findAll() {
    return await prisma.veiculo.findMany({
        include: { cliente: true }
    });
  }

  async findById(id: number) {
    return await prisma.veiculo.findUnique({
      where: { id_veiculo: id },
      include: { cliente: true }
    });
  }

  async update(id: number, data: Prisma.VeiculoUpdateInput) {
    return await prisma.veiculo.update({
      where: { id_veiculo: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.veiculo.delete({
      where: { id_veiculo: id },
    });
  }
}
