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

  // search by partial plate or model (accent-insensitive)
  async search(query: string) {
    // Check if query is numeric (potentially ID search) but we treat as string for now
    
    return await prisma.veiculo.findMany({
      where: {
        OR: [
          { placa: { contains: query, mode: 'insensitive' } },
          { modelo: { contains: query, mode: 'insensitive' } },
          { marca: { contains: query, mode: 'insensitive' } },
          {
            cliente: {
               OR: [
                   { pessoa_fisica: { pessoa: { nome: { contains: query, mode: 'insensitive' } } } },
                   { pessoa_juridica: { razao_social: { contains: query, mode: 'insensitive' } } },
                   { pessoa_juridica: { nome_fantasia: { contains: query, mode: 'insensitive' } } }
               ]
            }
          }
        ]
      },
      take: 20,
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
