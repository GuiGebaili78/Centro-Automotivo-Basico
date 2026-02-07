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

        // --- FLUXO 1: PIX (IMEDIATO NO BANCO) ---
        if (metodo === "PIX") {
          // 1.1 Criar LivroCaixa (Vinculado a Conta)
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda PIX - OS #${idOs}`,
              valor: valorPagamento,
              tipo_movimentacao: "ENTRADA",
              categoria: "VENDA",
              dt_movimentacao: new Date(),
              origem: "AUTOMATICA",
              id_conta_bancaria: idContaBancaria,
            },
          });

          // 1.2 Atualizar Saldo Bancário
          await tx.contaBancaria.update({
            where: { id_conta: idContaBancaria },
            data: { saldo_atual: { increment: valorPagamento } },
          });

          // 1.3 Vincular ao PagamentoCliente
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: livroCaixa.id_livro_caixa } as any,
          });

          console.log(
            `      ✅ [PIX] Consolidado: LC #${livroCaixa.id_livro_caixa} | Saldo Atualizado.`,
          );
        }

        // --- FLUXO 2: DINHEIRO (CAIXA MAS SEM EXTRATO BANCÁRIO DIGITAL) ---
        else if (metodo === "DINHEIRO") {
          // 2.1 Criar LivroCaixa (Dinheiro entra direto no Caixa mas não vinculamos conta bancária para evitar duplicidade de saldo se houver)
          const livroCaixa = await tx.livroCaixa.create({
            data: {
              descricao: `Venda DINHEIRO - OS #${idOs}`,
              valor: valorPagamento,
              tipo_movimentacao: "ENTRADA",
              categoria: "VENDA",
              dt_movimentacao: new Date(),
              origem: "AUTOMATICA",
              id_conta_bancaria: null, // Dinheiro não gera extrato bancário automático (apenas Livro Caixa)
            },
          });

          // 2.2 Vincular ao PagamentoCliente
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any,
          });

          console.log(
            `      ✅ [DINHEIRO] Livro Caixa gerado (Sem impacto no Saldo Bancário Digital)`,
          );
        }

        // --- FLUXO 3: CARTÃO (DIFERIDO) ---
        else if (metodo === "DEBITO" || metodo === "CREDITO") {
          // Prepara nome da operadora para descrição
          let operadoraNome = "";
          if (idOperadora) {
            const op = await tx.operadoraCartao.findUnique({
              where: { id_operadora: idOperadora },
            });
            operadoraNome = op?.nome || "";
          }

          // 3.1 Criar LivroCaixa (SEM CONTA BANCÁRIA -> NÃO aparece no Extrato, apenas Faturamento)
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

          // 3.2 Vincular ao PagamentoCliente
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: idPagamentoCliente },
            data: { id_livro_caixa: (livroCaixa as any).id_livro_caixa } as any,
          });

          // 3.3 Criar Recebíveis (Cálculo de Parcelas e Taxas)
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

              // 1. Try to find in new granular table
              const modalidade = metodo === "DEBITO" ? "DEBITO" : "CREDITO";
              const taxEntry = operadora.taxas_cartao?.find(
                (t) =>
                  t.modalidade === modalidade &&
                  t.num_parcelas === (metodo === "DEBITO" ? 1 : qtdParcelas),
              );

              if (taxEntry) {
                taxa = Number(taxEntry.taxa_total);
                // Prazo usually fixed per type in legacy
                prazo =
                  metodo === "DEBITO"
                    ? Number(operadora.prazo_debito)
                    : qtdParcelas === 1
                      ? Number(operadora.prazo_credito_vista)
                      : Number(operadora.prazo_credito_parc);
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
              }

              // Adjust logic based on "Tipo Parcelamento"
              if (
                tipoParcelamento === "CLIENTE" &&
                metodo === "CREDITO" &&
                qtdParcelas > 1
              ) {
                const vistaRate = operadora.taxas_cartao?.find(
                  (t) => t.modalidade === "CREDITO" && t.num_parcelas === 1,
                );
                if (vistaRate) {
                  taxa = Number(vistaRate.taxa_total);
                } else {
                  taxa = Number(operadora.taxa_credito_vista);
                }
              }

              const taxaAplicada = (valorPagamento * taxa) / 100;
              const valorLiquido = valorPagamento - taxaAplicada;

              // Data base para vencimento
              const dataPrevistaBase = new Date();
              if (operadora.antecipacao_auto) {
                dataPrevistaBase.setDate(dataPrevistaBase.getDate() + 1);
              } else {
                dataPrevistaBase.setDate(dataPrevistaBase.getDate() + prazo);
              }

              const valorPorParcela = valorPagamento / qtdParcelas;
              const valorLiquidoPorParcela = valorLiquido / qtdParcelas;
              const taxaPorParcela = taxaAplicada / qtdParcelas;

              for (let i = 1; i <= qtdParcelas; i++) {
                const dataPrevistaParcela = new Date(dataPrevistaBase);
                if (!operadora.antecipacao_auto) {
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

  /**
   * Reverte uma Consolidação Financeira
   * - Bloqueia se houver comissões pagas ou recebíveis baixados
   * - Desfaz lançamentos de LivroCaixa e Saldos
   * - Remove Recebíveis
   * - Exclui Fechamento
   */
  async reverterConsolidacao(idFechamento: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar dados completos
      const fechamento = await tx.fechamentoFinanceiro.findUnique({
        where: { id_fechamento_financeiro: idFechamento },
        include: {
          ordem_de_servico: {
            include: {
              pagamentos_cliente: { where: { deleted_at: null } },
              servicos_mao_de_obra: { where: { deleted_at: null } },
              recebiveis_cartao: true, // Needed to check status
            },
          },
        },
      });

      if (!fechamento) throw new Error("Fechamento não encontrado.");

      const os = fechamento.ordem_de_servico;

      // 2. BLOCKS DE SEGURANÇA

      // 2.1 Verificar Comissões Pagas
      const comissoesPagas = os.servicos_mao_de_obra.some(
        (s) => s.status_pagamento === "PAGO",
      );
      if (comissoesPagas) {
        throw new Error(
          "Não é possível desconsolidar: Existem comissões já pagas aos funcionários nesta OS.",
        );
      }

      // 2.2 Verificar Recebíveis Baixados
      // We need to fetch RecebiveisCartao separately if not in include or if implicit relation
      const recebiveis = await tx.recebivelCartao.findMany({
        where: { id_os: os.id_os },
      });
      const recebiveisBaixados = recebiveis.some(
        (r) => r.status === "RECEBIDO",
      );
      if (recebiveisBaixados) {
        throw new Error(
          "Não é possível desconsolidar: Existem recebíveis de cartão já confirmados/baixados.",
        );
      }

      console.log(`↺ [REVERSÃO] Iniciando reversão da OS #${os.id_os}`);

      // 3. EXECUTAR REVERSÃO

      // 3.1 Estornar Pagamentos (Livro Caixa e Saldo)
      for (const pag of os.pagamentos_cliente) {
        const p = pag as any;

        if (p.id_livro_caixa) {
          // Buscar info do LivroCaixa pra saber valor exato lançado (segurança)
          const lc = await tx.livroCaixa.findUnique({
            where: { id_livro_caixa: p.id_livro_caixa },
          });

          if (lc) {
            // Se PIX e tem conta, estornar saldo
            if (lc.id_conta_bancaria && p.metodo_pagamento === "PIX") {
              await tx.contaBancaria.update({
                where: { id_conta: lc.id_conta_bancaria },
                data: { saldo_atual: { decrement: Number(lc.valor) } },
              });
              console.log(
                `   - Saldo estornado Conta #${lc.id_conta_bancaria}: -${lc.valor}`,
              );
            }

            // Remover LivroCaixa
            await tx.livroCaixa.delete({
              where: { id_livro_caixa: p.id_livro_caixa },
            });
          }

          // Desvincular do pagamento
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: p.id_pagamento_cliente },
            data: { id_livro_caixa: null } as any,
          });
        }
      }

      // 3.2 Remover Recebíveis de Cartão
      const deletedRecebiveis = await tx.recebivelCartao.deleteMany({
        where: { id_os: os.id_os },
      });
      console.log(`   - Recebíveis removidos: ${deletedRecebiveis.count}`);

      // 3.3 Remover Fechamento Financeiro
      await tx.fechamentoFinanceiro.delete({
        where: { id_fechamento_financeiro: idFechamento },
      });

      // 3.4 Reverter Status da OS
      await tx.ordemDeServico.update({
        where: { id_os: os.id_os },
        data: { status: "PRONTO PARA FINANCEIRO" },
      });

      return { success: true, message: "Consolidação revertida com sucesso." };
    });
  }
}
