import { prisma } from "../prisma.js";
import { Prisma, MovimentacaoEstoque } from "@prisma/client";

export class MovimentacaoEstoqueRepository {
  /**
   * Na tela de pagamentos, a busca deve localizar a movimentação
   * pelo número da Nota Fiscal associada.
   */
  async buscarPorNumeroNotaFiscal(numeroNf: string) {
    return prisma.movimentacaoEstoque.findMany({
      where: {
        nota_fiscal: {
          numero: numeroNf,
        },
      },
      include: {
        produto: true,
        nota_fiscal: true,
        contas_pagar: true,
      },
      orderBy: { data_movimentacao: 'desc' },
    });
  }

  async buscarPorId(id_movimentacao: number) {
    return prisma.movimentacaoEstoque.findFirst({
      where: { id_movimentacao },
      include: {
        produto: true,
        nota_fiscal: true,
        contas_pagar: true,
      },
    });
  }
}
