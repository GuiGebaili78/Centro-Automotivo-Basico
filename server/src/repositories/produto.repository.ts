import { prisma } from "../prisma.js";
import { Prisma, Produto } from "@prisma/client";

export class ProdutoRepository {
  /**
   * Busca global de peças pesquisando simultaneamente nos campos:
   * nome, modelo, fabricante e aplicacao_equivalencia.
   */
  async buscarGlobal(query: string): Promise<Produto[]> {
    return prisma.produto.findMany({
      where: {
        OR: [
          { nome: { contains: query, mode: 'insensitive' } },
          { modelo: { contains: query, mode: 'insensitive' } },
          { fabricante: { contains: query, mode: 'insensitive' } },
          { aplicacao_equivalencia: { contains: query, mode: 'insensitive' } },
        ],
        ativo: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async buscarPorId(id_produto: number): Promise<Produto | null> {
    return prisma.produto.findFirst({
      where: { id_produto, ativo: true },
    });
  }
}
