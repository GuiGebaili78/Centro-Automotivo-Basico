import { prisma } from "../prisma.js";

export const ConfiguracaoRepository = {
  get: async () => {
    return await prisma.configuracao.findFirst();
  },

  upsert: async (data: any) => {
    const config = await prisma.configuracao.findFirst();

    if (config) {
      return await prisma.configuracao.update({
        where: { id: config.id },
        data,
      });
    } else {
      return await prisma.configuracao.create({
        data,
      });
    }
  },
};
