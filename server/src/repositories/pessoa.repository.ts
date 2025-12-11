import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PessoaRepository {
  async create(data: Prisma.PessoaCreateInput) {
    return await prisma.pessoa.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pessoa.findMany();
  }

  async findById(id: number) {
    return await prisma.pessoa.findUnique({
      where: { id_pessoa: id },
    });
  }

  async update(id: number, data: Prisma.PessoaUpdateInput) {
    return await prisma.pessoa.update({
      where: { id_pessoa: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pessoa.delete({
      where: { id_pessoa: id },
    });
  }
}
