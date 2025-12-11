import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class OrdemDeServicoRepository {
  async create(data: Prisma.OrdemDeServicoCreateInput) {
    return await prisma.ordemDeServico.create({
      data,
    });
  }

  async findAll() {
    return await prisma.ordemDeServico.findMany({
        include: {
            cliente: true,
            veiculo: true,
            funcionario: true,
            itens_os: true,
            finalizacao: true
        }
    });
  }

  async findById(id: number) {
    return await prisma.ordemDeServico.findUnique({
      where: { id_os: id },
      include: {
        cliente: true,
        veiculo: true,
        funcionario: true,
        itens_os: true,
        finalizacao: true
      }
    });
  }

  async update(id: number, data: Prisma.OrdemDeServicoUpdateInput) {
    return await prisma.ordemDeServico.update({
      where: { id_os: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.ordemDeServico.delete({
      where: { id_os: id },
    });
  }
}
