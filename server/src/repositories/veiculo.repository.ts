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
  // search by partial plate or model (accent-insensitive)
  async search(query: string) {
    const searchPattern = `%${query}%`;
    
    // We fetch IDs first using raw query to leverage 'unaccent'
    // Note: Table names MUST match the @@map in prisma schema (lowercase/snake_case)
    const ids = await prisma.$queryRaw<{id_veiculo: number}[]>`
      SELECT v.id_veiculo
      FROM "veiculo" v
      LEFT JOIN "cliente" c ON v.id_cliente = c.id_cliente
      LEFT JOIN "pessoa_fisica" pf ON c.id_pessoa_fisica = pf.id_pessoa_fisica
      LEFT JOIN "pessoa" p1 ON pf.id_pessoa = p1.id_pessoa
      LEFT JOIN "pessoa_juridica" pj ON c.id_pessoa_juridica = pj.id_pessoa_juridica
      LEFT JOIN "pessoa" p2 ON pj.id_pessoa = p2.id_pessoa
      WHERE unaccent(v.placa) ILIKE unaccent(${searchPattern})
         OR unaccent(v.modelo) ILIKE unaccent(${searchPattern})
         OR unaccent(v.marca) ILIKE unaccent(${searchPattern})
         OR unaccent(p1.nome) ILIKE unaccent(${searchPattern})
         OR (pj.nome_fantasia IS NOT NULL AND unaccent(pj.nome_fantasia) ILIKE unaccent(${searchPattern}))
         OR unaccent(p2.nome) ILIKE unaccent(${searchPattern})
      LIMIT 20
    `;

    const idList = ids.map(item => item.id_veiculo);

    if (idList.length === 0) {
        return [];
    }

    // Then fetch full objects using Prisma include
    return await prisma.veiculo.findMany({
      where: {
        id_veiculo: { in: idList }
      },
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
