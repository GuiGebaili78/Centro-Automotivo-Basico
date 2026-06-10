import { prisma } from "../prisma.js";

export class LivroCaixaRepository {
  async getAll() {
    return prisma.livroCaixa.findMany({
      where: { deleted_at: null },
      include: { conta: true },
      orderBy: { dt_movimentacao: "desc" },
      take: 200,
    });
  }

  async create(data: any) {
    const {
      descricao,
      valor,
      tipo_movimentacao,
      categoria,
      id_categoria,
      obs,
      origem,
      id_conta_bancaria,
    } = data;

    return prisma.$transaction(async (tx) => {
      const registro = await tx.livroCaixa.create({
        data: {
          descricao,
          valor,
          tipo_movimentacao,
          categoria,
          id_categoria: id_categoria ? Number(id_categoria) : null,
          obs: obs ?? null,
          origem: origem || "MANUAL",
          id_conta_bancaria: id_conta_bancaria
            ? Number(id_conta_bancaria)
            : null,
        },
      });

      if (id_conta_bancaria) {
        if (tipo_movimentacao === "ENTRADA") {
          await tx.contaBancaria.update({
            where: { id_conta: Number(id_conta_bancaria) },
            data: { saldo_atual: { increment: valor } },
          });
        } else {
          await tx.contaBancaria.update({
            where: { id_conta: Number(id_conta_bancaria) },
            data: { saldo_atual: { decrement: valor } },
          });
        }
      }
      return registro;
    });
  }

  async update(id: number, data: any) {
    const {
      descricao,
      valor,
      tipo_movimentacao,
      categoria,
      id_categoria,
      obs,
    } = data;

    return prisma.livroCaixa.update({
      where: { id_livro_caixa: id },
      data: {
        descricao,
        valor,
        tipo_movimentacao,
        categoria,
        id_categoria: id_categoria ? Number(id_categoria) : null,
        obs: obs ?? null,
      },
    });
  }

  async softDelete(id: number, obs?: string) {
    return prisma.$transaction(async (tx) => {
      const original = await tx.livroCaixa.findUnique({
        where: { id_livro_caixa: id },
      });

      if (!original) {
        throw new Error("Registro do Livro Caixa não encontrado.");
      }

      if (original.deleted_at) {
        throw new Error("Registro do Livro Caixa já estava excluído.");
      }

      // Deleta logicamente
      const updated = await tx.livroCaixa.update({
        where: { id_livro_caixa: id },
        data: {
          deleted_at: new Date(),
          obs: obs ? obs : original.obs,
        },
      });

      // Estorno matemático da conta bancária
      if (original.id_conta_bancaria) {
        // Estornar significa aplicar a operação oposta do que foi feito
        if (original.tipo_movimentacao === "ENTRADA") {
          // Uma ENTRADA original que é apagada deve decrementar o saldo
          await tx.contaBancaria.update({
            where: { id_conta: original.id_conta_bancaria },
            data: { saldo_atual: { decrement: original.valor } },
          });
        } else if (original.tipo_movimentacao === "SAIDA") {
          // Uma SAÍDA original que é apagada deve incrementar o saldo
          await tx.contaBancaria.update({
            where: { id_conta: original.id_conta_bancaria },
            data: { saldo_atual: { increment: original.valor } },
          });
        }
      }

      return updated;
    });
  }
}

export default new LivroCaixaRepository();
