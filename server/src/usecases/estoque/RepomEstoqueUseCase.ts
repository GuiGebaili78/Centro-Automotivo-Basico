import { prisma } from "../../prisma.js";
import { TipoMovimentacao } from "@prisma/client";
import { AppError } from "../../errors/AppError.js";

export interface ItemRepomEstoque {
  produto_id: number;
  quantidade: number;
  custo_unitario: number;
  preco_venda: number;
}

export interface RepomEstoqueInput {
  itens: ItemRepomEstoque[];
  id_usuario?: number;
  nome_usuario_snapshot?: string;
  origem?: string;
  obs?: string;
  id_fornecedor?: number;
  // Exclusividade de vínculo: ou tem nota fiscal ou tem data de pagamento previsto (sem nota)
  nota_fiscal_id?: number; 
  data_pagamento_previsto?: Date;
}

export class RepomEstoqueUseCase {
  async executar(input: RepomEstoqueInput) {
    if (!input.itens || input.itens.length === 0) {
      throw new AppError("O lote de entrada deve conter pelo menos um item.", 400);
    }

    // Validação de Exclusividade Mútua no Vínculo ("OU Exclusivo")
    if (input.nota_fiscal_id && input.data_pagamento_previsto) {
      throw new AppError("Inconsistência contábil: Não é permitido informar nota_fiscal_id e data_pagamento_previsto simultaneamente para vínculo direto.", 400);
    }

    // Execução Atômica via Prisma $transaction
    return prisma.$transaction(async (tx: any) => {
      // 1. Otimização de Performance (Evitar N+1 Queries): Leitura prévia em lote
      const produtoIds = input.itens.map(item => item.produto_id);
      const produtosExistentes = await tx.produto.findMany({
        where: { id_produto: { in: produtoIds } },
      });

      // 2. Construir Mapa em memória para busca instantânea O(1)
      const mapaProdutos = new Map<number, any>(produtosExistentes.map((p: any) => [p.id_produto, p]));

      let valorTotalLote = 0;
      const movimentacoesCriadas = [];
      const produtosAtualizados = [];

      // 3. Iterar sobre o lote efetuando as mutações e lendo saldos da memória
      for (const item of input.itens) {
        if (item.quantidade <= 0) {
          throw new AppError(`A quantidade para o produto ID ${item.produto_id} deve ser maior que zero.`, 400);
        }

        // Leitura instantânea do Map em memória (sem ir ao banco)
        const produto: any = mapaProdutos.get(item.produto_id);

        if (!produto) {
          throw new AppError(`Produto com ID ${item.produto_id} não encontrado no catálogo.`, 404);
        }

        const saldoAnterior = produto.saldo_atual;
        const saldoAtual = saldoAnterior + item.quantidade;

        // Atualizar o Produto no catálogo (Custo de Reposição)
        const produtoAtualizado = await tx.produto.update({
          where: { id_produto: item.produto_id },
          data: {
            saldo_atual: saldoAtual,
            preco_custo_atual: item.custo_unitario,
            preco_venda_atual: item.preco_venda,
            data_ultima_compra: new Date(),
          },
        });
        produtosAtualizados.push(produtoAtualizado);

        // Inserir a MovimentacaoEstoque
        const movimentacao = await tx.movimentacaoEstoque.create({
          data: {
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            tipo: TipoMovimentacao.ENTRADA,
            custo_unitario_historico: item.custo_unitario,
            preco_venda_historico: item.preco_venda,
            data_movimentacao: new Date(),
            nota_fiscal_id: input.nota_fiscal_id || null,
            data_pagamento_previsto: input.data_pagamento_previsto ? new Date(input.data_pagamento_previsto) : null,
            id_usuario: input.id_usuario || null,
            nome_usuario_snapshot: input.nome_usuario_snapshot || null,
            saldo_anterior: saldoAnterior,
            saldo_atual: saldoAtual,
            origem: input.origem || "Reposição de Estoque (Lote)",
            obs: input.obs || null,
          },
        });
        movimentacoesCriadas.push(movimentacao);

        // Somar ao valor total do lote
        valorTotalLote += item.quantidade * item.custo_unitario;
      }

      // 4. Criar UMA única entrada consolidada no ContasPagar garantindo a Exclusividade do Vínculo Contábil
      if (input.nota_fiscal_id) {
        // Se há Nota Fiscal, o passivo consolidado é gerado a partir dela
        await tx.contasPagar.create({
          data: {
            descricao: `Compra ref. Nota Fiscal #${input.nota_fiscal_id} (Lote com ${input.itens.length} itens)`,
            valor: valorTotalLote,
            dt_vencimento: input.data_pagamento_previsto ? new Date(input.data_pagamento_previsto) : new Date(),
            status: "PENDENTE",
            categoria: "COMPRA_PEÇAS",
            obs: input.obs || "Lote consolidado gerado automaticamente via entrada de estoque com NF",
            id_fornecedor: input.id_fornecedor || null,
            id_nota_fiscal: input.nota_fiscal_id,
            id_movimentacao: null, // Garantia de exclusividade
          },
        });
      } else if (input.data_pagamento_previsto) {
        // Se NÃO há Nota Fiscal (fim de semana), o passivo consolidado vincula direto à primeira movimentação do lote
        await tx.contasPagar.create({
          data: {
            descricao: `Compra sem NF (Lote consolidado - Movimentação principal #${movimentacoesCriadas[0].id_movimentacao})`,
            valor: valorTotalLote,
            dt_vencimento: new Date(input.data_pagamento_previsto),
            status: "PENDENTE",
            categoria: "COMPRA_PEÇAS",
            obs: input.obs || `Lote consolidado com ${input.itens.length} itens gerado automaticamente via entrada sem NF (Fim de semana)`,
            id_fornecedor: input.id_fornecedor || null,
            id_nota_fiscal: null, // Garantia de exclusividade
            id_movimentacao: movimentacoesCriadas[0].id_movimentacao,
          },
        });
      }

      return {
        produtos: produtosAtualizados,
        movimentacoes: movimentacoesCriadas,
        valorTotalLote,
      };
    });
  }
}
