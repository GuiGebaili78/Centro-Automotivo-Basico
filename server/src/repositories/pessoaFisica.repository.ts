import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PessoaFisicaRepository {
  async create(data: Prisma.PessoaFisicaCreateInput) {
    return await prisma.pessoaFisica.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pessoaFisica.findMany({
        include: { pessoa: true }
    });
  }

  async findById(id: number) {
    return await prisma.pessoaFisica.findUnique({
      where: { id_pessoa_fisica: id },
      include: { pessoa: true }
    });
  }

  async update(id: number, data: Prisma.PessoaFisicaUpdateInput) {
    return await prisma.pessoaFisica.update({
      where: { id_pessoa_fisica: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pessoaFisica.delete({
      where: { id_pessoa_fisica: id },
    });
  }
}
