import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class ClienteRepository {
  async create(data: Prisma.ClienteCreateInput) {
    return await prisma.cliente.create({
      data,
    });
  }

  async findAll() {
    return await prisma.cliente.findMany({
        include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
            tipo: true
        }
    });
  }

  async findById(id: number) {
    return await prisma.cliente.findUnique({
      where: { id_cliente: id },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
        tipo: true
      }
    });
  }

  async update(id: number, data: Prisma.ClienteUpdateInput) {
    return await prisma.cliente.update({
      where: { id_cliente: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.cliente.delete({
      where: { id_cliente: id },
    });
  }
}
