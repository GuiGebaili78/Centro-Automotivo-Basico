import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class FornecedorRepository {
  async create(data: Prisma.FornecedorCreateInput) {
    return await prisma.fornecedor.create({
      data,
    });
  }

  async findAll() {
    return await prisma.fornecedor.findMany();
  }

  async findById(id: number) {
    return await prisma.fornecedor.findUnique({
      where: { id_fornecedor: id },
    });
  }

  async update(id: number, data: Prisma.FornecedorUpdateInput) {
    return await prisma.fornecedor.update({
      where: { id_fornecedor: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.fornecedor.delete({
      where: { id_fornecedor: id },
    });
  }
}
