import { prisma } from "../prisma.js";

export class FornecedorRepository {
  async create(data: any) {
    const {
      nome,
      nome_fantasia,
      documento,
      inscricao_estadual,
      inscricao_municipal,
      tipo_pessoa,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      contato,
      telefone,
      whatsapp,
      email,
      banco,
      agencia,
      conta,
      chave_pix,
      categoria_produto,
      condicoes_pagamento,
      obs,
    } = data;

    return await prisma.fornecedor.create({
      data: {
        nome,
        nome_fantasia: nome_fantasia || null,
        documento: documento || null,
        inscricao_estadual: inscricao_estadual || null,
        inscricao_municipal: inscricao_municipal || null,
        tipo_pessoa: tipo_pessoa || "JURIDICA",
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf: uf || null,
        contato: contato || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        banco: banco || null,
        agencia: agencia || null,
        conta: conta || null,
        chave_pix: chave_pix || null,
        categoria_produto: categoria_produto || null,
        condicoes_pagamento: condicoes_pagamento || null,
        obs: obs || null,
      },
    });
  }

  async findAll() {
    return await prisma.fornecedor.findMany({
      where: { deleted_at: null },
      orderBy: { nome: "asc" },
    });
  }

  async findById(id: number) {
    return await prisma.fornecedor.findUnique({
      where: { id_fornecedor: id },
    });
  }

  async update(id: number, data: any) {
    const {
      nome,
      nome_fantasia,
      documento,
      inscricao_estadual,
      inscricao_municipal,
      tipo_pessoa,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      contato,
      telefone,
      whatsapp,
      email,
      banco,
      agencia,
      conta,
      chave_pix,
      categoria_produto,
      condicoes_pagamento,
      obs,
    } = data;

    return await prisma.fornecedor.update({
      where: { id_fornecedor: id },
      data: {
        nome,
        nome_fantasia: nome_fantasia || null,
        documento: documento || null,
        inscricao_estadual: inscricao_estadual || null,
        inscricao_municipal: inscricao_municipal || null,
        tipo_pessoa: tipo_pessoa || "JURIDICA",
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf: uf || null,
        contato: contato || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        banco: banco || null,
        agencia: agencia || null,
        conta: conta || null,
        chave_pix: chave_pix || null,
        categoria_produto: categoria_produto || null,
        condicoes_pagamento: condicoes_pagamento || null,
        obs: obs || null,
      },
    });
  }

  async delete(id: number) {
    // Soft delete
    return await prisma.fornecedor.update({
      where: { id_fornecedor: id },
      data: { deleted_at: new Date() },
    });
  }
}
