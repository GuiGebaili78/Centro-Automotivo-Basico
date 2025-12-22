import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class ItensOsRepository {
  async create(data: Prisma.ItensOsCreateInput) {
    return await prisma.itensOs.create({
      data,
    });
  }

  async findAll() {
    return await prisma.itensOs.findMany({
        include: { ordem_de_servico: true, pecas_estoque: true, pagamentos_peca: true }
    });
  }

  async findById(id: number) {
    return await prisma.itensOs.findUnique({
      where: { id_iten: id },
        include: { ordem_de_servico: true, pecas_estoque: true, pagamentos_peca: true }
    });
  }

  async findByOsId(idOs: number) {
    return await prisma.itensOs.findMany({
      where: { id_os: idOs },
      include: { pecas_estoque: true, pagamentos_peca: true }
    });
  }

  async update(id: number, data: Prisma.ItensOsUpdateInput) {
    return await prisma.itensOs.update({
      where: { id_iten: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.itensOs.delete({
      where: { id_iten: id },
    });
  }

  async search(query: string) {
    // Busca descrições únicas na tabela de itens já usados
    return await prisma.itensOs.findMany({
      where: {
        descricao: { contains: query, mode: 'insensitive' }
      },
      distinct: ['descricao'],
      take: 10
    });
  }
}
