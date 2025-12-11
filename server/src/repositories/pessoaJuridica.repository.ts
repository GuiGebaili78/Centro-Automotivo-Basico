import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PessoaJuridicaRepository {
  async create(data: Prisma.PessoaJuridicaCreateInput) {
    return await prisma.pessoaJuridica.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pessoaJuridica.findMany({
        include: { pessoa: true }
    });
  }

  async findById(id: number) {
    return await prisma.pessoaJuridica.findUnique({
      where: { id_pessoa_juridica: id },
      include: { pessoa: true }
    });
  }

  async update(id: number, data: Prisma.PessoaJuridicaUpdateInput) {
    return await prisma.pessoaJuridica.update({
      where: { id_pessoa_juridica: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pessoaJuridica.delete({
      where: { id_pessoa_juridica: id },
    });
  }
}
