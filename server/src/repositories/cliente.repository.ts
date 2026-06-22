import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class ClienteRepository {
  async create(data: any) {
    console.log(
      "📥 ClienteRepository.create - Received data:",
      JSON.stringify(data, null, 2)
    );

    // VALIDATE DUPLICITY BEFORE CREATING
    if (data.tipo_pessoa === 2 || data.tipo === "JURIDICA") {
      if (data.cnpj) {
        const existingCnpj = await prisma.pessoaJuridica.findFirst({
          where: { cnpj: data.cnpj }
        });
        if (existingCnpj) {
          if (!existingCnpj.ativo) throw new Error("CPF/CNPJ já cadastrado, porém encontra-se inativo.");
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
      if (data.inscricao_estadual) {
        const existingIe = await prisma.pessoaJuridica.findFirst({
          where: { inscricao_estadual: data.inscricao_estadual }
        });
        if (existingIe) {
          if (!existingIe.ativo) throw new Error("Inscrição Estadual já cadastrada, porém encontra-se inativa.");
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    } else {
      if (data.cpf) {
        const existingCpf = await prisma.pessoaFisica.findFirst({
          where: { cpf: data.cpf }
        });
        if (existingCpf) {
          if (!existingCpf.ativo) throw new Error("CPF/CNPJ já cadastrado, porém encontra-se inativo.");
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }

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
            compl_logradouro: data.compl_logradouro || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            estado: data.estado || null,
            cep: data.cep || null,
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

  async findAll(skip?: number, take?: number, search?: string) {
    const where: Prisma.ClienteWhereInput = search ? {
      ativo: true,
      OR: [
        // Cliente (Nomes e Razão Social)
        { pessoa_fisica: { pessoa: { nome: { contains: search, mode: 'insensitive' } } } },
        { pessoa_juridica: { razao_social: { contains: search, mode: 'insensitive' } } },
        { pessoa_juridica: { nome_fantasia: { contains: search, mode: 'insensitive' } } },
        
        // Documentos
        { pessoa_fisica: { cpf: { contains: search } } },
        { pessoa_juridica: { cnpj: { contains: search } } },
        
        // Telefones
        { telefone_1: { contains: search } },
        { telefone_2: { contains: search } },
        { telefone_3: { contains: search } },
        
        // Ativos: Veículos
        { 
          veiculos: { 
            some: { 
              OR: [ 
                { placa: { contains: search, mode: 'insensitive' } }, 
                { modelo: { contains: search, mode: 'insensitive' } }
              ] 
            } 
          } 
        },
        
        // Ativos: Peças Avulsas
        { 
          equipamentos: { 
            some: { 
              OR: [ 
                { nome_peca: { contains: search, mode: 'insensitive' } }, 
                { fabricante: { contains: search, mode: 'insensitive' } }, 
                { numeracao: { contains: search, mode: 'insensitive' } }
              ] 
            } 
          } 
        }
      ]
    } : { ativo: true };

    const [total, data] = await prisma.$transaction([
      prisma.cliente.count({ where }),
      prisma.cliente.findMany({
        where,
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
        include: {
          pessoa_fisica: { include: { pessoa: true } },
          pessoa_juridica: { include: { pessoa: true } },
          tipo: true,
          veiculos: true,
          equipamentos: true,
        },
        orderBy: { id_cliente: 'desc' },
      })
    ]);

    return { data, total };
  }

  async findAtivos(id: number) {
    return await prisma.cliente.findUnique({
      where: { id_cliente: id },
      select: {
        veiculos: true,
        equipamentos: true,
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
        veiculos: true,
        equipamentos: true,
        ordens_de_servico: true,
      },
    });
  }

  async update(id: number, data: any) {
    // 1. Get current client to find associated person IDs
    const currentCliente = await prisma.cliente.findUnique({
      where: { id_cliente: id },
      include: {
        pessoa_fisica: true,
        pessoa_juridica: true
      }
    });
    if (!currentCliente) {
      throw new Error("Cliente não encontrado.");
    }

    // 2. Validate CPF / CNPJ / IE duplicity
    if (data.cpf) {
      const pfWhere: any = { cpf: data.cpf };
      if (currentCliente.id_pessoa_fisica) {
        pfWhere.id_pessoa_fisica = { not: currentCliente.id_pessoa_fisica };
      }
      const existing = await prisma.pessoaFisica.findFirst({
        where: pfWhere
      });
      if (existing) {
        if (!existing.ativo) throw new Error("CPF/CNPJ já cadastrado, porém encontra-se inativo.");
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }
    if (data.cnpj) {
      const pjWhere: any = { cnpj: data.cnpj };
      if (currentCliente.id_pessoa_juridica) {
        pjWhere.id_pessoa_juridica = { not: currentCliente.id_pessoa_juridica };
      }
      const existing = await prisma.pessoaJuridica.findFirst({
        where: pjWhere
      });
      if (existing) {
        if (!existing.ativo) throw new Error("CPF/CNPJ já cadastrado, porém encontra-se inativo.");
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }
    if (data.inscricao_estadual) {
      const pjWhere: any = { inscricao_estadual: data.inscricao_estadual };
      if (currentCliente.id_pessoa_juridica) {
        pjWhere.id_pessoa_juridica = { not: currentCliente.id_pessoa_juridica };
      }
      const existing = await prisma.pessoaJuridica.findFirst({
        where: pjWhere
      });
      if (existing) {
        if (!existing.ativo) throw new Error("Inscrição Estadual já cadastrada, porém encontra-se inativa.");
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Extract nested data
      const {
        nome, razao_social, nome_fantasia, cpf, cnpj, inscricao_estadual,
        id_pessoa_fisica, id_pessoa_juridica, tipo_pessoa, tipo, ...clienteData
      } = data;

      // 2. Update Cliente base data
      const cliente = await tx.cliente.update({
        where: { id_cliente: id },
        data: clienteData as Prisma.ClienteUpdateInput,
        include: {
          pessoa_fisica: true,
          pessoa_juridica: true
        }
      });

      // 3. Update PessoaFisica or PessoaJuridica if provided
      if (cliente.pessoa_fisica) {
        if (cpf !== undefined) {
          await tx.pessoaFisica.update({
            where: { id_pessoa_fisica: cliente.pessoa_fisica.id_pessoa_fisica },
            data: { cpf }
          });
        }
        if (nome !== undefined) {
          await tx.pessoa.update({
            where: { id_pessoa: cliente.pessoa_fisica.id_pessoa },
            data: { nome }
          });
        }
      } else if (cliente.pessoa_juridica) {
        if (cnpj !== undefined || razao_social !== undefined || nome_fantasia !== undefined || inscricao_estadual !== undefined) {
          await tx.pessoaJuridica.update({
            where: { id_pessoa_juridica: cliente.pessoa_juridica.id_pessoa_juridica },
            data: {
              cnpj: cnpj !== undefined ? cnpj : undefined,
              razao_social: razao_social !== undefined ? razao_social : undefined,
              nome_fantasia: nome_fantasia !== undefined ? nome_fantasia : undefined,
              inscricao_estadual: inscricao_estadual !== undefined ? inscricao_estadual : undefined,
            }
          });
        }
        if (nome !== undefined || razao_social !== undefined) {
          await tx.pessoa.update({
            where: { id_pessoa: cliente.pessoa_juridica.id_pessoa },
            data: { nome: razao_social || nome }
          });
        }
      }

      return cliente;
    });
  }

  async delete(id: number) {
    const activeOs = await prisma.ordemDeServico.findFirst({
      where: {
        id_cliente: id,
        deleted_at: null,
        status: { notIn: ["FINALIZADA", "CANCELADA"] },
      },
    });

    if (activeOs) {
      throw new Error("Não é possível excluir o cliente pois há uma Ordem de Serviço ativa vinculada (OS: " + activeOs.id_os + ").");
    }

    return await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.update({
        where: { id_cliente: id },
        data: { ativo: false },
      });

      await tx.veiculo.updateMany({
        where: { id_cliente: id },
        data: { ativo: false },
      });

      await tx.equipamentoCliente.updateMany({
        where: { id_cliente: id },
        data: { ativo: false },
      });

      return cliente;
    });
  }


}
