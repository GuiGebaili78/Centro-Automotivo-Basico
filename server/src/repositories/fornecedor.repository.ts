import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class FornecedorRepository {
  async create(data: any) {
    console.log(
      "📥 FornecedorRepository.create - Received data:",
      JSON.stringify(data, null, 2)
    );

    // If 'nome' is provided and we don't have explicit foreign keys
    if (data.nome && !data.id_pessoa_fisica && !data.id_pessoa_juridica) {
      return await prisma.$transaction(async (tx) => {
        // 1. Create Base Pessoa
        const pessoa = await tx.pessoa.create({
          data: {
            nome: data.nome,
            is_fornecedor: true,
            obs: data.obs || null,
          },
        });

        let idPessoaFisica = null;
        let idPessoaJuridica = null;
        let tipoPessoaId = 1; // Default to Fisica

        if (data.tipo_pessoa === 2 || data.tipo === "JURIDICA") {
          tipoPessoaId = 2;
          const pj = await tx.pessoaJuridica.create({
            data: {
              id_pessoa: pessoa.id_pessoa,
              razao_social: data.razao_social || data.nome,
              nome_fantasia: data.nome_fantasia || null,
              cnpj: data.cnpj || null,
              inscricao_estadual: data.inscricao_estadual || null,
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

        // 2. Create Fornecedor
        const fornecedor = await tx.fornecedor.create({
          data: {
            id_pessoa_fisica: idPessoaFisica,
            id_pessoa_juridica: idPessoaJuridica,
            tipo_pessoa: tipoPessoaId,
            contato: data.contato || null,
            telefone: data.telefone_1 || data.telefone || null,
            whatsapp: data.telefone_2 || data.whatsapp || null,
            email: data.email || null,
            logradouro: data.logradouro || null,
            numero: data.nr_logradouro || data.numero || null,
            complemento: data.compl_logradouro || data.complemento || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            uf: data.estado || data.uf || null,
            cep: data.cep || null,
            banco: data.banco || null,
            agencia: data.agencia || null,
            conta: data.conta || null,
            chave_pix: data.chave_pix || null,
            condicoes_pagamento: data.condicoes_pagamento || null,
            categoria_produto: data.categoria_produto || null,
          },
        });

        console.log("✅ Fornecedor transaction complete:", fornecedor.id_fornecedor);
        return fornecedor;
      });
    }

    // Existing logic if IDs are provided
    const { id_pessoa_fisica, id_pessoa_juridica, ...fornecedorData } = data;

    const payload = {
      ...fornecedorData,
      id_pessoa_fisica: id_pessoa_fisica || null,
      id_pessoa_juridica: id_pessoa_juridica || null,
    };

    console.log(
      "📤 FornecedorRepository.create - Sending to Prisma:",
      JSON.stringify(payload, null, 2)
    );

    try {
      const result = await prisma.fornecedor.create({
        data: payload,
      });
      console.log("✅ FornecedorRepository.create - Success:", result.id_fornecedor);
      return result;
    } catch (error: any) {
      console.error("❌ FornecedorRepository.create - Error:", error);
      throw error;
    }
  }

  async findAll() {
    return await prisma.fornecedor.findMany({
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
      },
    });
  }

  async findById(id: number) {
    return await prisma.fornecedor.findUnique({
      where: { id_fornecedor: id },
      include: {
        pessoa_fisica: { include: { pessoa: true } },
        pessoa_juridica: { include: { pessoa: true } },
      },
    });
  }

  async update(id: number, data: any) {
    return await prisma.$transaction(async (tx) => {
      // 1. Update Fornecedor base data
      const {
        nome, razao_social, nome_fantasia, cpf, cnpj, inscricao_estadual,
        tipo_pessoa, ...fornecedorData
      } = data;

      const fornecedor = await tx.fornecedor.update({
        where: { id_fornecedor: id },
        data: fornecedorData,
        include: {
          pessoa_fisica: true,
          pessoa_juridica: true
        }
      });

      // 2. Update PessoaFisica or PessoaJuridica if provided
      if (fornecedor.pessoa_fisica) {
        if (cpf !== undefined) {
          await tx.pessoaFisica.update({
            where: { id_pessoa_fisica: fornecedor.pessoa_fisica.id_pessoa_fisica },
            data: { cpf }
          });
        }
        if (nome !== undefined) {
          await tx.pessoa.update({
            where: { id_pessoa: fornecedor.pessoa_fisica.id_pessoa },
            data: { nome }
          });
        }
      } else if (fornecedor.pessoa_juridica) {
        if (cnpj !== undefined || razao_social !== undefined || nome_fantasia !== undefined || inscricao_estadual !== undefined) {
          await tx.pessoaJuridica.update({
            where: { id_pessoa_juridica: fornecedor.pessoa_juridica.id_pessoa_juridica },
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
            where: { id_pessoa: fornecedor.pessoa_juridica.id_pessoa },
            data: { nome: razao_social || nome }
          });
        }
      }

      return fornecedor;
    });
  }

  async delete(id: number) {
    return await prisma.fornecedor.delete({
      where: { id_fornecedor: id },
    });
  }
}
