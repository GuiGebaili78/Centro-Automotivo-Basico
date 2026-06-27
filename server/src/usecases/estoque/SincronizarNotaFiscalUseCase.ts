import { prisma } from "../../prisma.js";
import { AppError } from "../../errors/AppError.js";

export interface SincronizarNotaFiscalInput {
  id_movimentacao: number;
  numero_nf: string;
  serie?: string;
  chave_acesso?: string;
  id_fornecedor?: number;
  data_emissao?: Date;
  valor_total: number;
  arquivo_xml?: string;
  obs?: string;
}

export class SincronizarNotaFiscalUseCase {
  async executar(input: SincronizarNotaFiscalInput) {
    return prisma.$transaction(async (tx: any) => {
      // 1. Localizar a movimentação existente
      const movimentacao = await tx.movimentacaoEstoque.findFirst({
        where: { id_movimentacao: input.id_movimentacao },
      });

      if (!movimentacao) {
        throw new AppError(`Movimentação de Estoque #${input.id_movimentacao} não encontrada.`, 404);
      }

      if (movimentacao.nota_fiscal_id) {
        throw new AppError(`A movimentação #${input.id_movimentacao} já possui uma Nota Fiscal vinculada.`, 400);
      }

      // 2. Criar a nova NotaFiscal
      const notaFiscal = await tx.notaFiscal.create({
        data: {
          numero: input.numero_nf,
          serie: input.serie || null,
          chave_acesso: input.chave_acesso || null,
          id_fornecedor: input.id_fornecedor || null,
          data_emissao: input.data_emissao ? new Date(input.data_emissao) : new Date(),
          data_entrada: new Date(),
          valor_total: input.valor_total,
          arquivo_xml: input.arquivo_xml || null,
          obs: input.obs || `Nota Fiscal emitida tardiamente para movimentação #${input.id_movimentacao}`,
        },
      });

      // 3. Atualizar a MovimentacaoEstoque associando a nova NF
      await tx.movimentacaoEstoque.update({
        where: { id_movimentacao: input.id_movimentacao },
        data: { nota_fiscal_id: notaFiscal.id_nota_fiscal },
      });

      // 4. Transferir o vínculo de ContasPagar (Removendo id_movimentacao e associando id_nota_fiscal)
      const contasPagarExistentes = await tx.contasPagar.findMany({
        where: { id_movimentacao: input.id_movimentacao },
      });

      for (const conta of contasPagarExistentes) {
        await tx.contasPagar.update({
          where: { id_conta_pagar: conta.id_conta_pagar },
          data: {
            id_movimentacao: null, // Remove o vínculo direto da movimentação
            id_nota_fiscal: notaFiscal.id_nota_fiscal, // Transfere para a nova Nota Fiscal
            descricao: `Compra ref. Nota Fiscal #${notaFiscal.numero} (Conciliação Tardia)`,
          },
        });
      }

      return {
        notaFiscal,
        movimentacaoAtualizadaId: input.id_movimentacao,
        contasPagarConciliadas: contasPagarExistentes.length,
      };
    });
  }
}
