import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class ClienteRepository {
  async create(data: any) {
    console.log('📥 ClienteRepository.create - Received data:', JSON.stringify(data, null, 2));
    
    // Extract the FK field and value
    const { id_pessoa_fisica, id_pessoa_juridica, ...clienteData } = data;
    
    const payload = {
      ...clienteData,
      id_pessoa_fisica: id_pessoa_fisica || null,
      id_pessoa_juridica: id_pessoa_juridica || null,
    };
    
    console.log('📤 ClienteRepository.create - Sending to Prisma:', JSON.stringify(payload, null, 2));
    
    try {
      const result = await prisma.cliente.create({
        data: payload,
      });
      console.log('✅ ClienteRepository.create - Success:', result.id_cliente);
      return result;
    } catch (error) {
      console.error('❌ ClienteRepository.create - Error:', error);
      throw error;
    }
  }

  async findAll() {
    return await prisma.cliente.findMany({
        include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
            tipo: true,
            veiculos: true
        }
    });
  }

  async findById(id: number) {
    return await prisma.cliente.findUnique({
      where: { id_cliente: id },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
        tipo: true,
        veiculos: true
      }
    });
  }

  async update(id: number, data: Prisma.ClienteUpdateInput) {
    return await prisma.cliente.update({
      where: { id_cliente: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.cliente.delete({
      where: { id_cliente: id },
    });
  }

  // Case-insensitive search by name (searches in Pessoa.nome)
  // Case-insensitive & accent-insensitive search by name
  async searchByName(searchTerm: string) {
    const searchPattern = `%${searchTerm}%`;

    const ids = await prisma.$queryRaw<{id_cliente: number}[]>`
      SELECT c.id_cliente
      FROM "cliente" c
      LEFT JOIN "pessoa_fisica" pf ON c.id_pessoa_fisica = pf.id_pessoa_fisica
      LEFT JOIN "pessoa" p1 ON pf.id_pessoa = p1.id_pessoa
      LEFT JOIN "pessoa_juridica" pj ON c.id_pessoa_juridica = pj.id_pessoa_juridica
      LEFT JOIN "pessoa" p2 ON pj.id_pessoa = p2.id_pessoa
      WHERE unaccent(p1.nome) ILIKE unaccent(${searchPattern})
         OR unaccent(p2.nome) ILIKE unaccent(${searchPattern})
         OR (pj.nome_fantasia IS NOT NULL AND unaccent(pj.nome_fantasia) ILIKE unaccent(${searchPattern}))
      LIMIT 20
    `;

    const idList = ids.map(item => item.id_cliente);

    if (idList.length === 0) {
        return [];
    }

    return await prisma.cliente.findMany({
      where: {
        id_cliente: { in: idList }
      },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
        tipo: true,
        veiculos: true
      }
    });
  }
}
