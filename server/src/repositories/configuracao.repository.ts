import { prisma } from "../prisma.js";

export const ConfiguracaoRepository = {
  get: async () => {
    return await prisma.configuracao.findFirst();
  },

  upsert: async (data: any) => {
    // Busca o registro existente para decidir entre update e create.
    // A tabela usa UUID como PK, então não podemos usar `where: { id: 1 }`.
    // Usamos findFirst + condicional update/create como um "upsert lógico",
    // já que a tabela sempre terá no máximo 1 registro (singleton).
    const existing = await prisma.configuracao.findFirst();

    if (existing) {
      return await prisma.configuracao.update({
        where: { id: existing.id },
        data,
      });
    } else {
      // Primeira inserção — garantir campo obrigatório nomeFantasia (NOT NULL)
      if (!data.nomeFantasia) {
        data.nomeFantasia = "Oficina";
      }
      return await prisma.configuracao.create({
        data,
      });
    }
  },
};
