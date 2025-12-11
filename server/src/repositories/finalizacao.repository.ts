import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class FinalizacaoRepository {
  async create(data: Prisma.FinalizacaoCreateInput) {
    return await prisma.finalizacao.create({
      data,
    });
  }

  async findAll() {
    return await prisma.finalizacao.findMany({
        include: { ordem_de_servico: true }
    });
  }

  async findById(id: number) {
    return await prisma.finalizacao.findUnique({
      where: { id_finalizacao: id },
        include: { ordem_de_servico: true }
    });
  }

  async update(id: number, data: Prisma.FinalizacaoUpdateInput) {
    return await prisma.finalizacao.update({
      where: { id_finalizacao: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.finalizacao.delete({
      where: { id_finalizacao: id },
    });
  }
}
