import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const basePrisma = new PrismaClient();

const softDeletableModels = [
  'OrdemDeServico',
  'ItensOs',
  'PagamentoPeca',
  'FechamentoFinanceiro',
  'ServicoMaoDeObra',
  'ContasPagar',
  'LivroCaixa'
];

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (softDeletableModels.includes(model)) {
          args.where = { ...args.where, deleted_at: null };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (softDeletableModels.includes(model)) {
          args.where = { ...args.where, deleted_at: null };
        }
        return query(args);
      },
      async count({ model, args, query }) {
        if (softDeletableModels.includes(model)) {
          args.where = { ...args.where, deleted_at: null };
        }
        return query(args);
      },
      async aggregate({ model, args, query }) {
        if (softDeletableModels.includes(model)) {
          args.where = { ...args.where, deleted_at: null };
        }
        return query(args);
      },
      async delete({ model, args }) {
        if (softDeletableModels.includes(model)) {
          return (basePrisma as any)[model].update({
            ...args,
            data: { deleted_at: new Date() },
          });
        }
        return (basePrisma as any)[model].delete(args);
      },
      async deleteMany({ model, args }) {
        if (softDeletableModels.includes(model)) {
          return (basePrisma as any)[model].updateMany({
            ...args,
            data: { deleted_at: new Date() },
          });
        }
        return (basePrisma as any)[model].deleteMany(args);
      },
      // findUnique is not overridden here because Repositories will use findFirst for non-ID fields.
    },
  },
});
