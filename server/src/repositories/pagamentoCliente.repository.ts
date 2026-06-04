import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { CalculadoraPagamentoService } from "../services/CalculadoraPagamentoService.js";

interface CreatePagamentoPayload {
  id_os: number;
  metodo_pagamento: string;
  valor: number;
  data_pagamento: string | Date;
  bandeira_cartao?: string | null;
  codigo_transacao?: string | null;
  qtd_parcelas?: number;
  tipo_parcelamento?: string;
  pix_destino?: "BANCO" | "MAQUINA" | null;
  subtipo_credito?: "AVISTA" | "PARCELADO" | null;
  id_operadora?: number | null;
  id_conta_bancaria?: number | null;
}

export class PagamentoClienteRepository {
  async findAll() {
    return await prisma.pagamentoCliente.findMany({
      include: {
        ordem_de_servico: {
          include: {
            veiculo: true,
            cliente: {
              include: {
                pessoa_fisica: { include: { pessoa: true } },
                pessoa_juridica: { include: { pessoa: true } },
              },
            },
          },
        },
        // @ts-ignore
        conta_bancaria: true,
        // @ts-ignore
        operadora: true,
        livro_caixa: true,
      },
    });
  }

  async findById(id: number) {
    return await prisma.pagamentoCliente.findUnique({
      where: { id_pagamento_cliente: id },
      include: { ordem_de_servico: true },
    });
  }

  async update(id: number, data: Prisma.PagamentoClienteUpdateInput) {
    // Extract obs/observacao from data to avoid Prisma error
    const { obs, observacao, ...updateData } = data as any;
    const finalObs = obs || observacao;

    return await prisma.pagamentoCliente.update({
      where: { id_pagamento_cliente: id },
      data: {
        ...updateData,
        obs: finalObs || null,
        // id_livro_caixa is NOT touched here anymore, it's handled by Consolidation
      } as any,
    });
  }

  async delete(id: number) {
    return await prisma.pagamentoCliente.update({
      where: { id_pagamento_cliente: id },
      data: { deleted_at: new Date() } as any,
    });
  }

  /**
   * Cria o PagamentoCliente e gera os Recebíveis (Cartão/PIX/Dinheiro)
   * em uma transação atômica.
   *
   * Regras de negócio:
   * - id_conta_bancaria: sanitizado contra zero (FK violation prevention)
   * - Recebíveis de cartão: calculam taxa via CalculadoraPagamentoService
   * - Snapshot de taxa: `taxa_pct_snapshot` congela o % no momento da criação
   * - Idempotência: rejeita duplicatas por (id_os + valor + metodo + data)
   */
  async createWithRecebiveis(payload: CreatePagamentoPayload) {
    const {
      id_operadora,
      pix_destino,
      subtipo_credito,
      id_conta_bancaria: rawContaBancaria,
      ...data
    } = payload;

    // ── Sanitização infalível contra zero ──
    const id_conta_bancaria =
      rawContaBancaria && Number(rawContaBancaria) > 0
        ? Number(rawContaBancaria)
        : null;

    return await prisma.$transaction(async (tx) => {
      // 0. IDEMPOTENCY CHECK (Prevent Double Click Submission)
      const duplicateCheck = await tx.pagamentoCliente.findFirst({
        where: {
          id_os: Number(data.id_os),
          valor: Number(data.valor),
          metodo_pagamento: data.metodo_pagamento,
          data_pagamento: data.data_pagamento,
        },
      });

      if (duplicateCheck) {
        console.warn(
          `⚠️ [PagamentoCliente] Duplicate submission detected for OS #${data.id_os}. Returning existing.`,
        );
        return duplicateCheck;
      }

      // 1. Create PagamentoCliente
      const pagamento = await tx.pagamentoCliente.create({
        data: {
          ...data,
          id_os: Number(data.id_os),
          valor: Number(data.valor),
          qtd_parcelas: data.qtd_parcelas || 1,
          id_operadora: id_operadora ? Number(id_operadora) : null,
          id_conta_bancaria,
        },
        include: {
          ordem_de_servico: {
            include: {
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: true,
                },
              },
              veiculo: true,
            },
          },
        },
      });

      // 2. Create Receivables
      const needsOperadora =
        id_operadora &&
        (data.metodo_pagamento === "CREDITO" ||
          data.metodo_pagamento === "DEBITO" ||
          (data.metodo_pagamento === "PIX" && pix_destino === "MAQUINA"));

      if (needsOperadora) {
        const operadora = await tx.operadoraCartao.findUnique({
          where: { id_operadora: Number(id_operadora) },
          include: { taxas_operadora: true },
        });
        if (!operadora) throw new Error("Operadora não encontrada");

        const parcelas = data.qtd_parcelas || 1;
        const valorTotal = Number(data.valor);

        // Determine modalidade da taxa
        let modalidade: string;
        if (data.metodo_pagamento === "PIX") {
          modalidade = "PIX";
        } else if (data.metodo_pagamento === "DEBITO") {
          modalidade = "DEBITO";
        } else if (data.metodo_pagamento === "CREDITO") {
          modalidade =
            subtipo_credito === "AVISTA" ? "CREDITO_AVISTA" : "CREDITO";
        } else {
          modalidade = data.metodo_pagamento;
        }

        // Resolve Tax Rates
        let taxaBase = 0;
        let taxaJuros = 0;
        let prazo = 0;
        let taxaBaseClientePct: number | null = null;

        // Try Granular Table first (single source of truth)
        const taxEntry = operadora.taxas_operadora.find(
          (t) =>
            t.modalidade === modalidade &&
            t.parcela === (modalidade === "CREDITO" ? parcelas : 1),
        );

        if (taxEntry) {
          taxaBase = Number(taxEntry.taxa_base_pct);
          taxaJuros = Number(taxEntry.taxa_juros_pct);
          taxaBaseClientePct =
            taxEntry.taxa_base_cliente_pct != null
              ? Number(taxEntry.taxa_base_cliente_pct)
              : null;
          prazo =
            modalidade === "DEBITO" || modalidade === "PIX"
              ? operadora.prazo_debito
              : parcelas === 1
                ? operadora.prazo_credito_vista
                : operadora.prazo_credito_parc;
        } else {
          // Fallback Legacy Defaults
          if (modalidade === "DEBITO" || modalidade === "PIX") {
            taxaBase = Number(operadora.taxa_debito);
            prazo = operadora.prazo_debito;
          } else if (modalidade === "CREDITO_AVISTA" || parcelas === 1) {
            taxaBase = Number(operadora.taxa_credito_vista);
            prazo = operadora.prazo_credito_vista;
          } else {
            taxaBase = Number(operadora.taxa_credito_parc);
            taxaJuros =
              Number(operadora.taxa_credito_parc) -
              Number(operadora.taxa_credito_vista);
            prazo = operadora.prazo_credito_parc;
          }
        }

        const calcResult = CalculadoraPagamentoService.calcular(
          valorTotal,
          taxaBase,
          taxaJuros,
          (data.tipo_parcelamento as "LOJA" | "CLIENTE") || "LOJA",
          taxaBaseClientePct,
        );

        const valorPorParcela = calcResult.valorPagoPeloCliente / parcelas;
        const valorLiquidoPorParcela =
          calcResult.valorLiquidoLojista / parcelas;
        const taxaPorParcela = calcResult.descontoLojistaTotal / parcelas;

        // ── Snapshot: congela a taxa % total neste instante ──
        const taxaPctSnapshot = taxaBase + taxaJuros;

        // Data base para vencimento
        const dataPrevistaBase = new Date();
        if (operadora.antecipacao_auto) {
          dataPrevistaBase.setDate(dataPrevistaBase.getDate() + 1);
        } else {
          dataPrevistaBase.setDate(dataPrevistaBase.getDate() + prazo);
        }

        for (let i = 1; i <= parcelas; i++) {
          const dataPrevistaParcela = new Date(dataPrevistaBase);
          if (
            !operadora.antecipacao_auto &&
            modalidade === "CREDITO" &&
            parcelas > 1
          ) {
            dataPrevistaParcela.setMonth(
              dataPrevistaParcela.getMonth() + (i - 1),
            );
          }

          await tx.recebivelCartao.create({
            data: {
              id_os: Number(data.id_os),
              id_operadora: Number(id_operadora),
              num_parcela: i,
              total_parcelas: parcelas,
              valor_bruto: valorPorParcela,
              valor_liquido: valorLiquidoPorParcela,
              taxa_aplicada: taxaPorParcela,
              tipo_parcelamento: data.tipo_parcelamento || "LOJA",
              data_venda: new Date(),
              data_prevista: dataPrevistaParcela,
              status: "PENDENTE",
              // ── Congelamento ──
              taxa_pct_snapshot: taxaPctSnapshot,
              modalidade_snapshot: modalidade,
            },
          });
        }
      } else {
        // Flow for Dinheiro, PIX Banco, Transf, or any other method without an operator
        await tx.recebivelCartao.create({
          data: {
            id_os: Number(data.id_os),
            id_operadora: null,
            num_parcela: 1,
            total_parcelas: 1,
            valor_bruto: Number(data.valor),
            valor_liquido: Number(data.valor),
            taxa_aplicada: 0,
            tipo_parcelamento: data.metodo_pagamento,
            data_venda: new Date(),
            data_prevista: new Date(),
            status: "PENDENTE",
            // ── Congelamento ──
            taxa_pct_snapshot: 0,
            modalidade_snapshot: data.metodo_pagamento,
          },
        });
      }

      return pagamento;
    });
  }
}
