import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PecasEstoqueRepository {
  async create(data: Prisma.PecasEstoqueCreateInput) {
    return await prisma.pecasEstoque.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pecasEstoque.findMany();
  }

  async findById(id: number) {
    return await prisma.pecasEstoque.findUnique({
      where: { id_pecas_estoque: id },
    });
  }

  async update(id: number, data: Prisma.PecasEstoqueUpdateInput) {
    return await prisma.pecasEstoque.update({
      where: { id_pecas_estoque: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pecasEstoque.delete({
      where: { id_pecas_estoque: id },
    });
  }
}
