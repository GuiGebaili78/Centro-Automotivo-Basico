import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class FuncionarioRepository {
  async create(data: Prisma.FuncionarioCreateInput) {
    return await prisma.funcionario.create({
      data,
    });
  }

  async findAll() {
    return await prisma.funcionario.findMany({
        include: { pessoa_fisica: { include: { pessoa: true } } }
    });
  }

  async findById(id: number) {
    return await prisma.funcionario.findUnique({
      where: { id_funcionario: id },
      include: { pessoa_fisica: { include: { pessoa: true } } }
    });
  }

  async update(id: number, data: Prisma.FuncionarioUpdateInput) {
    return await prisma.funcionario.update({
      where: { id_funcionario: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.funcionario.delete({
      where: { id_funcionario: id },
    });
  }
}
