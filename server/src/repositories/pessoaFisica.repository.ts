import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PessoaFisicaRepository {
  async create(data: Prisma.PessoaFisicaCreateInput) {
    if (data.cpf) {
      const existing = await prisma.pessoaFisica.findFirst({
        where: { cpf: data.cpf }
      });
      if (existing) {
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }
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
    if (data.cpf) {
      const cpfValue = typeof data.cpf === "string" ? data.cpf : (data.cpf as any).set;
      if (cpfValue) {
        const existing = await prisma.pessoaFisica.findFirst({
          where: {
            cpf: cpfValue,
            id_pessoa_fisica: { not: id }
          }
        });
        if (existing) {
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }
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
