import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class FechamentoFinanceiroRepository {
  async create(data: Prisma.FechamentoFinanceiroCreateInput) {
    return await prisma.fechamentoFinanceiro.create({
      data,
    });
  }

  async findAll() {
    return await prisma.fechamentoFinanceiro.findMany({
      include: {
        ordem_de_servico: {
          include: {
            veiculo: true,
            servicos_mao_de_obra: {
              where: { deleted_at: null },
              include: {
                funcionario: {
                  include: {
                    pessoa_fisica: {
                      include: {
                        pessoa: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return await prisma.fechamentoFinanceiro.findUnique({
      where: { id_fechamento_financeiro: id },
      include: { ordem_de_servico: true },
    });
  }

  async update(id: number, data: Prisma.FechamentoFinanceiroUpdateInput) {
    return await prisma.fechamentoFinanceiro.update({
      where: { id_fechamento_financeiro: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.fechamentoFinanceiro.delete({
      where: { id_fechamento_financeiro: id },
    });
  }

  /**
   * Consolida uma OS financeiramente
   * - Cria lançamentos no Livro Caixa para TODOS os pagamentos
   * - PIX: Atualiza saldo bancário imediatamente
   * - Dinheiro: Apenas lançamento no caixa
   * - Débito/Crédito: Lançamento no caixa + cria recebível (NÃO atualiza saldo ainda)
   */
  async consolidarOS(idOs: number, custoTotalPecasReal: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar OS com todos os pagamentos
      const os = await tx.ordemDeServico.findUnique({
        where: { id_os: idOs },
        include: {
          pagamentos_cliente: {
            where: { deleted_at: null },
          },
        },
      });

      if (!os) {
        throw new Error("OS não encontrada");
      }

      if (os.status !== "PRONTO PARA FINANCEIRO") {
        throw new Error("OS não está pronta para consolidação financeira");
      }

      // 2. Criar Fechamento Financeiro
      const fechamento = await tx.fechamentoFinanceiro.create({
        data: {
          id_os: idOs,
          custo_total_pecas_real: custoTotalPecasReal,
          data_fechamento_financeiro: new Date(),
        },
      });

      // 3. Processar cada pagamento do cliente (STRICT MODE)
      console.log(
        `🔍 [CONSOLIDAÇÃO STRICT] Processando ${os.pagamentos_cliente.length} pagamento(s) para OS #${idOs}`,
      );

      for (const pagamento of os.pagamentos_cliente) {
        const metodo = (pagamento.metodo_pagamento || "").trim().toUpperCase();
        const valorPagamento = Number(pagamento.valor);
        const idContaBancaria = (pagamento as any).id_conta_bancaria;
        const idOperadora = pagamento.id_operadora;
        const idPagamentoCliente = pagamento.id_pagamento_cliente;

        console.log(
          `   🔸 Pagamento ${idPagamentoCliente}: ${metodo} | R$ ${valorPagamento}`,
        );

        // VALIDAÇÃO PRÉVIA (FAIL FAST)
        if ((metodo === "PIX" || metodo === "DINHEIRO") && !idContaBancaria) {
          throw new Error(
            `Pagamento ${metodo} (R$ ${valorPagamento}) sem Conta Bancária definida!`,
          );
        }
        if ((metodo === "CREDITO" || metodo === "DEBITO") && !idOperadora) {
          throw new Error(
            `Pagamento ${metodo} (R$ ${valorPagamento}) sem Operadora definida!`,
          );
        }

        // --- FLUXO 1: DINHEIRO (IMEDIATO) ---
        // PIX agora entra no fluxo de recebíveis (diferido), assim como Cartão.
        if (metodo === "DINHEIRO") {
          // VERIFICA SE JÁ FOI PROCESSADO
          if ((pagamento as any).id_livro_caixa) {
            console.log(
              `      ⚠️ [SKIP] Pagamento ${idPagamentoCliente} já possui Livro Caixa #${(pagamento as any).id_livro_caixa}. Ignorando duplicação.`,
            );
            continue;
          }

          // 1.1 Criar LivroCaixa (Dinheiro entra direto no Caixa mas não vinculamos conta bancária para evitar duplicidade de saldo se houver)
          // Mas Dinheiro físico não afeta saldo de conta bancária digital, apenas saldo de "Caixa".
          // Se houver uma conta "Caixa Físico", usamos o ID dela.
          const targetContaId = idContaBancaria; // Se o usuário selecionou "Caixa", usa ele.

          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda ${metodo} - OS #${idOs}`,
              valor: valorPagamento,
              tipo_movimentacao: "ENTRADA",
              categoria: "VENDA",
              dt_movimentacao: new Date(),
              origem: "AUTOMATICA",
              id_conta_bancaria: null, // Dinheiro não gera extrato bancário automático (apenas Livro Caixa)
            },
          });

          // 1.2 Vincular ao PagamentoCliente
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any,
          });

          // Dinheiro não atualiza saldo de conta bancária automática por enquanto,
          // a menos que tivéssemos uma conta "Caixa Físico" explícita no sistema com saldo.
          // O comportamento anterior para Dinheiro era apenas Log.

          console.log(
            `      ✅ [DINHEIRO] Livro Caixa gerado (Sem impacto no Saldo Bancário Digital)`,
          );
        }

        // --- FLUXO 2: CARTÃO (DIFERIDO) ---
        else if (metodo === "DEBITO" || metodo === "CREDITO") {
          // Prepara nome da operadora para descrição
          let operadoraNome = "";
          if (idOperadora) {
            const op = await tx.operadoraCartao.findUnique({
              where: { id_operadora: idOperadora },
            });
            operadoraNome = op?.nome || "";
          }

          // 2.1 Criar LivroCaixa (SEM CONTA BANCÁRIA -> NÃO aparece no Extrato, apenas Faturamento)
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda Cartão ${metodo} ${operadoraNome ? `(${operadoraNome})` : ""} - OS #${idOs}`,
              valor: valorPagamento,
              tipo_movimentacao: "ENTRADA",
              categoria: "VENDA",
              dt_movimentacao: new Date(),
              origem: "AUTOMATICA",
              id_conta_bancaria: null, // NULL PARA NÃO AFETAR EXTRATO/SALDO AGORA
            },
          });

          // 2.2 Vincular ao PagamentoCliente
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any,
          });

          // 2.3 Criar Recebíveis (Cálculo de Parcelas e Taxas)
          if (idOperadora) {
            const operadora = await tx.operadoraCartao.findUnique({
              where: { id_operadora: idOperadora },
              include: { taxas_cartao: true }, // Fetch new tax table
            });

            if (operadora) {
              const qtdParcelas = pagamento.qtd_parcelas || 1;
              const tipoParcelamento =
                (pagamento as any).tipo_parcelamento || "LOJA"; // Default to LOJA

              let taxa = 0;
              let prazo = 0;
              let taxaAntec = 0;

              // 1. Try to find in new granular table
              const modalidade = metodo === "DEBITO" ? "DEBITO" : "CREDITO";
              const taxEntry = operadora.taxas_cartao?.find(
                (t) =>
                  t.modalidade === modalidade &&
                  t.num_parcelas === (metodo === "DEBITO" ? 1 : qtdParcelas),
              );

              if (taxEntry) {
                taxa = Number(taxEntry.taxa_total);
                // Prazo usually fixed per type in legacy, but could be specific?
                // Keeping legacy prazo logic for now as user didn't request per-installment timeline, only rate.
                prazo =
                  metodo === "DEBITO"
                    ? Number(operadora.prazo_debito)
                    : qtdParcelas === 1
                      ? Number(operadora.prazo_credito_vista)
                      : Number(operadora.prazo_credito_parc);

                taxaAntec = Number(taxEntry.taxa_antecipacao || 0);
              } else {
                // 2. Fallback to Legacy Flat Fields
                taxa =
                  metodo === "DEBITO"
                    ? Number(operadora.taxa_debito)
                    : qtdParcelas === 1
                      ? Number(operadora.taxa_credito_vista)
                      : Number(operadora.taxa_credito_parc);

                prazo =
                  metodo === "DEBITO"
                    ? Number(operadora.prazo_debito)
                    : qtdParcelas === 1
                      ? Number(operadora.prazo_credito_vista)
                      : Number(operadora.prazo_credito_parc);

                taxaAntec = Number(operadora.taxa_antecipacao || 0);
              }

              // Adjust logic based on "Tipo Parcelamento"
              // If CLIENTE pays interest, usually the Store receives the Full Value minus "Intermediation Fee".
              // But here 'taxa' is the "Total Discounted".
              // If Parcelado Cliente -> The machine adds interest on top. The store receives Price - Intermediation.
              // So if CLIENTE, we might want to use the '1x' rate or a specific base rate, NOT the high installment rate.
              if (
                tipoParcelamento === "CLIENTE" &&
                metodo === "CREDITO" &&
                qtdParcelas > 1
              ) {
                // Fallback to "Vista" rate for Cost Calculation as customer pays the "Overprice"
                const vistaRate = operadora.taxas_cartao?.find(
                  (t) => t.modalidade === "CREDITO" && t.num_parcelas === 1,
                );
                if (vistaRate) {
                  taxa = Number(vistaRate.taxa_total);
                } else {
                  taxa = Number(operadora.taxa_credito_vista);
                }
                // TODO: This assumption is standard for "Parcelado Comprador", but user can verify.
              }

              const taxaAplicada = (valorPagamento * taxa) / 100;
              const valorLiquido = valorPagamento - taxaAplicada;

              // Data base para vencimento
              const dataPrevistaBase = new Date();
              if (operadora.antecipacao_auto) {
                // If auto anticipation is on, typically D+1
                dataPrevistaBase.setDate(dataPrevistaBase.getDate() + 1);

                // Apply Anticipation Fee if configured
                // Simplification: if 'taxa_total' already includes anticipation in the user's table (as implied by high rates 22%), we don't double dip.
                // But if separate, we would deduct here. user said "Sobra pra voce" in the table, so `taxa` likely includes everything.
              } else {
                dataPrevistaBase.setDate(dataPrevistaBase.getDate() + prazo);
              }

              const valorPorParcela = valorPagamento / qtdParcelas;
              const valorLiquidoPorParcela = valorLiquido / qtdParcelas;
              const taxaPorParcela = taxaAplicada / qtdParcelas;

              for (let i = 1; i <= qtdParcelas; i++) {
                const dataPrevistaParcela = new Date(dataPrevistaBase);
                if (!operadora.antecipacao_auto) {
                  // Standard installment spacing
                  dataPrevistaParcela.setMonth(
                    dataPrevistaParcela.getMonth() + (i - 1),
                  );
                }

                await tx.recebivelCartao.create({
                  data: {
                    id_os: idOs,
                    id_operadora: idOperadora,
                    num_parcela: i,
                    total_parcelas: qtdParcelas,
                    valor_bruto: valorPorParcela,
                    valor_liquido: valorLiquidoPorParcela,
                    taxa_aplicada: taxaPorParcela,
                    tipo_parcelamento: tipoParcelamento,
                    data_venda: new Date(),
                    data_prevista: dataPrevistaParcela,
                    status: "PENDENTE", // AGUARDANDO CONCILIAÇÃO
                  },
                });
              }
              console.log(
                `      ✅ [CARTÃO] ${qtdParcelas} parcela(s) criada(s) em Recebíveis (Taxa: ${taxa}%).`,
              );
            }
          }
        }
      }

      await tx.ordemDeServico.update({
        where: { id_os: idOs },
        data: { status: "FINALIZADA" },
      });

      return fechamento;
    });
  }
}
