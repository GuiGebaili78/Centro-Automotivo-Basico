import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PagamentoPecaRepository {
  async create(data: Prisma.PagamentoPecaCreateInput) {
    return await prisma.pagamentoPeca.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pagamentoPeca.findMany({
        include: { 
          fornecedor: true,
          item_os: {
            include: {
              ordem_de_servico: {
                include: {
                  veiculo: true,
                  cliente: {
                    include: {
                      pessoa_fisica: { include: { pessoa: true } },
                      pessoa_juridica: { include: { pessoa: true } }
                    }
                  }
                }
              }
            }
          } 
        }
    });
  }

  async findById(id: number) {
    return await prisma.pagamentoPeca.findUnique({
      where: { id_pagamento_peca: id },
        include: { item_os: true, fornecedor: true }
    });
  }

  async findByItemId(itemId: number) {
      return await prisma.pagamentoPeca.findMany({
          where: { id_item_os: itemId },
          include: { fornecedor: true }
      });
  }

  async update(id: number, data: Prisma.PagamentoPecaUpdateInput) {
    return await prisma.pagamentoPeca.update({
      where: { id_pagamento_peca: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pagamentoPeca.update({
      where: { id_pagamento_peca: id },
      data: { deleted_at: new Date() }
    });
  }
}
