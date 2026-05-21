import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class FuncionarioRepository {
  async create(data: Prisma.FuncionarioCreateInput) {
    if (data.cnpj_mei) {
      const existing = await prisma.funcionario.findFirst({
        where: { cnpj_mei: data.cnpj_mei }
      });
      if (existing) {
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }

    let idPessoaFisica: number | undefined;
    if (data.pessoa_fisica?.connect?.id_pessoa_fisica) {
      idPessoaFisica = data.pessoa_fisica.connect.id_pessoa_fisica;
    } else if ((data as any).id_pessoa_fisica) {
      idPessoaFisica = (data as any).id_pessoa_fisica;
    }

    if (idPessoaFisica) {
      const currentPf = await prisma.pessoaFisica.findUnique({
        where: { id_pessoa_fisica: idPessoaFisica }
      });
      if (currentPf && currentPf.cpf) {
        const duplicateCpf = await prisma.pessoaFisica.findFirst({
          where: {
            cpf: currentPf.cpf,
            id_pessoa_fisica: { not: currentPf.id_pessoa_fisica }
          }
        });
        if (duplicateCpf) {
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }

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
    if (data.cnpj_mei) {
      const cnpjValue = typeof data.cnpj_mei === "string" ? data.cnpj_mei : (data.cnpj_mei as any).set;
      if (cnpjValue) {
        const existing = await prisma.funcionario.findFirst({
          where: {
            cnpj_mei: cnpjValue,
            id_funcionario: { not: id }
          }
        });
        if (existing) {
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }
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
