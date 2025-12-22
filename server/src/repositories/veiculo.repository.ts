import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class VeiculoRepository {
  async create(data: Prisma.VeiculoCreateInput) {
    return await prisma.veiculo.create({
      data,
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } }
          }
        }
      }
    });
  }

  async findAll() {
    return await prisma.veiculo.findMany({
        include: { 
            cliente: {
                include: {
                    pessoa_fisica: { include: { pessoa: true } },
                    pessoa_juridica: { include: { pessoa: true } }
                }
            } 
        }
    });
  }

  async findById(id: number) {
    return await prisma.veiculo.findUnique({
      where: { id_veiculo: id },
      include: { 
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } }
          }
        } 
      }
    });
  }

  // Search by plate (case-insensitive, normalized without hyphens)
  async findByPlaca(placa: string) {
    // Normalize: remove hyphens and convert to uppercase
    const normalizedPlaca = placa.replace(/-/g, '').toUpperCase();
    
    return await prisma.veiculo.findUnique({
      where: { placa: normalizedPlaca },
      include: { 
        cliente: {
            include: {
                pessoa_fisica: { include: { pessoa: true } },
                pessoa_juridica: { include: { pessoa: true } }
            }
        } 
      }
    });
  }

  // search by partial plate or model
  async search(query: string) {
    return await prisma.veiculo.findMany({
      where: {
        OR: [
          { placa: { contains: query, mode: 'insensitive' } },
          { modelo: { contains: query, mode: 'insensitive' } },
          { marca: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { 
        cliente: {
            include: {
                pessoa_fisica: { include: { pessoa: true } },
                pessoa_juridica: { include: { pessoa: true } }
            }
        } 
      },
      take: 10
    });
  }

  async update(id: number, data: Prisma.VeiculoUpdateInput) {
    return await prisma.veiculo.update({
      where: { id_veiculo: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.veiculo.delete({
      where: { id_veiculo: id },
    });
  }
}
