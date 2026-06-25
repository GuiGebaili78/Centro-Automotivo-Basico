import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class VeiculoRepository {
  async create(data: Prisma.VeiculoCreateInput) {
    if (data.placa) {
      const existing = await prisma.veiculo.findFirst({
        where: { placa: data.placa }
      });
      if (existing) {
        if (!existing.ativo) throw new Error("Placa já cadastrada, porém o veículo encontra-se inativo.");
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }
    return await prisma.veiculo.create({
      data,
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
          },
        },
      },
    });
  }

  async findAll() {
    return await prisma.veiculo.findMany({
      where: { ativo: true },
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return await prisma.veiculo.findUnique({
      where: { id_veiculo: id },
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
          },
        },
        ordens_de_servico: true,
      },
    });
  }

  // Search by plate (case-insensitive, normalized without hyphens)
  async findByPlaca(placa: string) {
    // Normalize: remove hyphens and convert to uppercase
    const normalizedPlaca = placa.replace(/-/g, "").toUpperCase();

    return await prisma.veiculo.findFirst({
      where: { placa: normalizedPlaca, ativo: true },
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
          },
        },
      },
    });
  }

  // search by partial plate or model (accent-insensitive)
  async search(query: string) {
    // Check if query is numeric (potentially ID search) but we treat as string for now

    return await prisma.veiculo.findMany({
      where: {
        ativo: true,
        OR: [
          { placa: { contains: query, mode: "insensitive" } },
          { modelo: { contains: query, mode: "insensitive" } },
          { marca: { contains: query, mode: "insensitive" } },
          {
            cliente: {
              OR: [
                {
                  pessoa_fisica: {
                    pessoa: { nome: { contains: query, mode: "insensitive" } },
                  },
                },
                {
                  pessoa_juridica: {
                    razao_social: { contains: query, mode: "insensitive" },
                  },
                },
                {
                  pessoa_juridica: {
                    nome_fantasia: { contains: query, mode: "insensitive" },
                  },
                },
              ],
            },
          },
        ],
      },
      take: 20,
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } },
          },
        },
      },
    });
  }

  async getDistinct(field: 'marca' | 'modelo' | 'cor', search: string) {
    return await prisma.veiculo.findMany({
      where: { [field]: { contains: search, mode: "insensitive" }, ativo: true },
      distinct: [field],
      select: { [field]: true },
      take: 10,
    });
  }

  async buscarMarcas(termo: string) {
    return await prisma.veiculo.findMany({
      where: { marca: { contains: termo, mode: 'insensitive' }, ativo: true },
      distinct: ['marca'],
      select: { marca: true }
    });
  }

  async buscarModelos(termo: string) {
    return await prisma.veiculo.findMany({
      where: { modelo: { contains: termo, mode: 'insensitive' }, ativo: true },
      distinct: ['modelo'],
      select: { modelo: true }
    });
  }

  async buscarCores(termo: string) {
    return await prisma.veiculo.findMany({
      where: { cor: { contains: termo, mode: 'insensitive' }, ativo: true },
      distinct: ['cor'],
      select: { cor: true }
    });
  }

  async update(id: number, data: Prisma.VeiculoUpdateInput) {
    if (data.placa) {
      const placaValue = typeof data.placa === "string" ? data.placa : (data.placa as any).set;
      if (placaValue) {
        const existing = await prisma.veiculo.findFirst({
          where: {
            placa: placaValue,
            id_veiculo: { not: id }
          }
        });
        if (existing) {
          if (!existing.ativo) throw new Error("Placa já cadastrada, porém o veículo encontra-se inativo.");
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }

    // REGRA DE NEGÓCIO: A alteração do id_cliente neste veículo NÃO se propaga para as 
    // Ordens de Serviço antigas (OrdemDeServico). O Prisma naturalmente isola essa 
    // chave estrangeira (a OS possui seu próprio id_cliente). O histórico fica blindado.
    return await prisma.veiculo.update({
      where: { id_veiculo: id },
      data,
    });
  }

  async delete(id: number) {
    const activeOs = await prisma.ordemDeServico.findFirst({
      where: {
        id_veiculo: id,
        deleted_at: null,
        status: { notIn: ["FINALIZADA", "CANCELADA"] },
      },
    });

    if (activeOs) {
      throw new Error("Não é possível excluir o veículo pois há uma Ordem de Serviço ativa vinculada (OS: " + activeOs.id_os + ").");
    }

    return await prisma.veiculo.update({
      where: { id_veiculo: id },
      data: { ativo: false },
    });
  }
}
