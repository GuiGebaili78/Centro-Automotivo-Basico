import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class TipoRepository {
  async create(data: Prisma.TipoCreateInput) {
    return await prisma.tipo.create({
      data,
    });
  }

  async findAll() {
    return await prisma.tipo.findMany();
  }

  async findById(id: number) {
    return await prisma.tipo.findUnique({
      where: { id_tipo: id },
    });
  }

  async update(id: number, data: Prisma.TipoUpdateInput) {
    return await prisma.tipo.update({
      where: { id_tipo: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.tipo.delete({
      where: { id_tipo: id },
    });
  }
}
