import { CondicaoPeca, Prisma } from "@prisma/client";

export interface LoteEntrada {
  id_movimentacao: number;
  quantidade: number;
  custo_unitario_historico: Prisma.Decimal | number;
  preco_venda_historico: Prisma.Decimal | number;
  data_movimentacao: Date;
  condicao: CondicaoPeca;
  // Campos auxiliares calculados
  margem_lucro?: number;
  saldo_disponivel_lote?: number;
}

export class PrecificacaoService {
  /**
   * Recebe a lista de lotes disponíveis (entradas) e o total já consumido/reservado da peça.
   * Aplica a regra FIFO (First-In, First-Out) para pular os lotes mais antigos que já
   * tiveram seu saldo zerado/esgotado, sugerindo o lote mais antigo com saldo ativo.
   */
  selecionarLoteFIFO(lotes: LoteEntrada[], consumidoTotal: number): LoteEntrada | null {
    if (!lotes || lotes.length === 0) return null;

    let consumidoRestante = consumidoTotal;

    for (const lote of lotes) {
      const custo = Number(lote.custo_unitario_historico);
      const venda = Number(lote.preco_venda_historico);
      const lucro = venda - custo;
      lote.margem_lucro = custo > 0 ? (lucro / custo) * 100 : 0;

      if (consumidoRestante >= lote.quantidade) {
        // Lote totalmente consumido, saldo zero. Pula para o próximo (FIFO)
        consumidoRestante -= lote.quantidade;
        lote.saldo_disponivel_lote = 0;
        continue;
      }

      // Este lote possui saldo disponível!
      lote.saldo_disponivel_lote = lote.quantidade - consumidoRestante;
      return lote;
    }

    // Se todos os lotes foram esgotados (ex: estoque zerado ou negativo),
    // retorna o lote mais recente como fallback de precificação para a OS
    const ultimoLote = lotes[lotes.length - 1];
    if (ultimoLote) {
      ultimoLote.saldo_disponivel_lote = 0;
      return ultimoLote;
    }
    return null;
  }
}
