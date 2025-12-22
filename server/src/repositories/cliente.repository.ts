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
  async searchByName(searchTerm: string) {
    return await prisma.cliente.findMany({
      where: {
        OR: [
          {
            pessoa_fisica: {
              pessoa: {
                nome: {
                  contains: searchTerm,
                  mode: 'insensitive' // Case-insensitive search
                }
              }
            }
          },
          {
            pessoa_juridica: {
              pessoa: {
                nome: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
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
