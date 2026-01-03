import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PagamentoClienteRepository {
  async create(data: Prisma.PagamentoClienteCreateInput) {
    return await prisma.pagamentoCliente.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pagamentoCliente.findMany({
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
    });
  }

  async findById(id: number) {
    return await prisma.pagamentoCliente.findUnique({
      where: { id_pagamento_cliente: id },
      include: { ordem_de_servico: true }
    });
  }

  async update(id: number, data: Prisma.PagamentoClienteUpdateInput) {
    return await prisma.pagamentoCliente.update({
      where: { id_pagamento_cliente: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pagamentoCliente.update({
      where: { id_pagamento_cliente: id },
      data: { deleted_at: new Date() }
    });
  }
}
