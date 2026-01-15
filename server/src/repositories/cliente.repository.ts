import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class ClienteRepository {
  async create(data: any) {
    console.log(
      "📥 ClienteRepository.create - Received data:",
      JSON.stringify(data, null, 2)
    );

    // TRANSACTIONAL CREATION FOR SIMPLIFIED PAYLOAD
    // If 'nome' is provided and we don't have explicit foreign keys, assume we need to create the person structure.
    if (data.nome && !data.id_pessoa_fisica && !data.id_pessoa_juridica) {
      return await prisma.$transaction(async (tx) => {
        // 1. Create Base Pessoa
        const pessoa = await tx.pessoa.create({
          data: {
            nome: data.nome,
          },
        });

        let idPessoaFisica = null;
        let idPessoaJuridica = null;
        let tipoPessoaId = 1; // Default to Fisica

        if (data.tipo === "JURIDICA") {
          tipoPessoaId = 2;
          const pj = await tx.pessoaJuridica.create({
            data: {
              id_pessoa: pessoa.id_pessoa,
              razao_social: data.nome, // Using name as Razao Social for simplicity
              cnpj: data.cnpj || null,
            },
          });
          idPessoaJuridica = pj.id_pessoa_juridica;
        } else {
          // Default to FISICA
          const pf = await tx.pessoaFisica.create({
            data: {
              id_pessoa: pessoa.id_pessoa,
              cpf: data.cpf || null,
            },
          });
          idPessoaFisica = pf.id_pessoa_fisica;
        }

        // 2. Create Cliente
        const cliente = await tx.cliente.create({
          data: {
            id_pessoa_fisica: idPessoaFisica,
            id_pessoa_juridica: idPessoaJuridica,
            tipo_pessoa: tipoPessoaId,
            telefone_1: data.telefone_1,
            telefone_2: data.telefone_2 || null,
            email: data.email || null,
            logradouro: data.logradouro || null,
            nr_logradouro: data.nr_logradouro || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            estado: data.estado || null,
            cep: data.cep || null,
            // Map 'cep' if you add it to schema, currently schema doesn't seem to have explicit 'cep' column in Cliente?
            // Checked schema: Cliente has logradouro, nr, compl, bairro, cidade, estado. NO CEP.
            // Ignoring CEP for now as it's not in schema.
          },
        });

        console.log("✅ Cliente transaction complete:", cliente.id_cliente);
        return cliente;
      });
    }

    // EXISTING LOGIC (If IDs are provided)
    const { id_pessoa_fisica, id_pessoa_juridica, ...clienteData } = data;

    const payload = {
      ...clienteData,
      id_pessoa_fisica: id_pessoa_fisica || null,
      id_pessoa_juridica: id_pessoa_juridica || null,
    };

    console.log(
      "📤 ClienteRepository.create - Sending to Prisma:",
      JSON.stringify(payload, null, 2)
    );

    try {
      const result = await prisma.cliente.create({
        data: payload,
      });
      console.log("✅ ClienteRepository.create - Success:", result.id_cliente);
      return result;
    } catch (error: any) {
      console.error("❌ ClienteRepository.create - Error:", error);
      throw error;
    }
  }

  async findAll() {
    return await prisma.cliente.findMany({
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
        tipo: true,
        veiculos: true,
      },
    });
  }

  async findById(id: number) {
    return await prisma.cliente.findUnique({
      where: { id_cliente: id },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
        tipo: true,
        veiculos: true,
        ordens_de_servico: true,
      },
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

  // Case-insensitive & accent-insensitive search by name
  async searchByName(searchTerm: string) {
    const searchPattern = `%${searchTerm}%`;

    const ids = await prisma.$queryRaw<{ id_cliente: number }[]>`
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

    const idList = ids.map((item) => item.id_cliente);

    if (idList.length === 0) {
      return [];
    }

    return await prisma.cliente.findMany({
      where: {
        id_cliente: { in: idList },
      },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
        tipo: true,
        veiculos: true,
      },
    });
  }
}
