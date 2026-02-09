import { prisma } from "../prisma.js";
import crypto from "crypto";

export class ContasPagarRepository {
  async create(data: any) {
    console.log("[ContasPagarRepo] Creating:", data);

    const { repetir_parcelas, applyToAllRecurrences, ...mainData } = data;
    const repetitions = Number(repetir_parcelas || 0);

    // Helper para normalizar datas para Meio-Dia UTC
    const normalizeDate = (dateInfo: any) => {
      if (!dateInfo) return null;
      const dt = new Date(dateInfo);
      dt.setUTCHours(12, 0, 0, 0);
      return dt;
    };

    if (mainData.dt_vencimento)
      mainData.dt_vencimento = normalizeDate(mainData.dt_vencimento);
    if (mainData.dt_pagamento)
      mainData.dt_pagamento = normalizeDate(mainData.dt_pagamento);

    return prisma.$transaction(async (tx) => {
      // Gerar UUID para grupo de recorrência se houver repetições
      const grupoId = repetitions > 0 ? crypto.randomUUID() : null;
      const totalParcelas = repetitions > 0 ? repetitions + 1 : null;

      // Adicionar campos de recorrência à conta principal
      if (grupoId) {
        mainData.id_grupo_recorrencia = grupoId;
        mainData.numero_parcela = 1;
        mainData.total_parcelas = totalParcelas;
        mainData.obs =
          `${mainData.obs || ""} (Recorrência 1/${totalParcelas})`.trim();
      }

      const created = await tx.contasPagar.create({ data: mainData });
      console.log("[ContasPagarRepo] Created Status:", created.status);

      // Se já nascer PAGO, lança no caixa
      if (created.status === "PAGO") {
        console.log("[ContasPagarRepo] Auto-launching Livro Caixa for Create");

        const movimentoDate = new Date();

        await tx.livroCaixa.create({
          data: {
            descricao: `Conta: ${created.descricao}${created.credor ? " - " + created.credor : ""}`,
            valor: created.valor,
            tipo_movimentacao: "SAIDA",
            categoria: created.categoria || "DESPESAS GERAIS",
            dt_movimentacao: movimentoDate,
            origem: "AUTOMATICA",
            obs: `Referente à conta a pagar #${created.id_conta_pagar}. ${mainData.obs || ""}`,
          },
        });
      }

      // Lógica de Repetição (Novas Parcelas)
      if (repetitions > 0 && mainData.dt_vencimento) {
        const baseDate = new Date(mainData.dt_vencimento);

        for (let i = 1; i <= repetitions; i++) {
          const newDate = new Date(baseDate);
          newDate.setMonth(baseDate.getMonth() + i);

          const repData = { ...mainData };
          repData.dt_vencimento = newDate;
          repData.status = "PENDENTE"; // Repetições futuras nascem pendentes
          repData.dt_pagamento = null;
          repData.id_grupo_recorrencia = grupoId;
          repData.numero_parcela = i + 1;
          repData.total_parcelas = totalParcelas;

          // Remover a observação antiga e adicionar a nova
          const baseObs = (mainData.obs || "")
            .replace(/\s*\(Recorrência \d+\/\d+\)/, "")
            .trim();
          repData.obs =
            `${baseObs} (Recorrência ${i + 1}/${totalParcelas})`.trim();

          await tx.contasPagar.create({ data: repData });
        }
      }

      return created;
    });
  }

  // ... findAll / findById ...
  async findAll() {
    return prisma.contasPagar.findMany({
      where: { deleted_at: null },
      orderBy: { dt_vencimento: "asc" },
    });
  }

  async findById(id: number) {
    return prisma.contasPagar.findUnique({
      where: { id_conta_pagar: id },
    });
  }

  async update(id: number, data: any) {
    console.log(`[ContasPagarRepo] Updating ID ${id} with:`, data);

    // Redefinindo o helper aqui ou usando lógica direta para manter o arquivo limpo se não extraí pra fora da classe
    const normalizeDate = (dateInfo: any) => {
      if (!dateInfo) return null;
      const dt = new Date(dateInfo);
      dt.setUTCHours(12, 0, 0, 0);
      return dt;
    };

    if (data.dt_vencimento)
      data.dt_vencimento = normalizeDate(data.dt_vencimento);
    if (data.dt_pagamento) data.dt_pagamento = normalizeDate(data.dt_pagamento);

    const {
      id_conta_bancaria: idContaRaw,
      repetir_parcelas,
      applyToAllRecurrences,
      ...updateData
    } = data;

    // ... dentro de update ...
    // Checar estado anterior
    const current = await prisma.contasPagar.findUnique({
      where: { id_conta_pagar: id },
    });
    console.log(
      `[ContasPagarRepo] Current status: ${current?.status}, New status: ${updateData.status}`,
    );

    const isPayingNow =
      current?.status !== "PAGO" && updateData.status === "PAGO";
    console.log("[ContasPagarRepo] Is Paying Now?", isPayingNow);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.contasPagar.update({
        where: { id_conta_pagar: id },
        data: updateData, // Ensure we pass the modified data object with fixed dates
      });

      if (isPayingNow) {
        console.log("[ContasPagarRepo] Auto-launching Livro Caixa for Update");

        const id_conta_bancaria = idContaRaw ? Number(idContaRaw) : null;

        // LivroCaixa entries should always reflect the exact system time of the operation.
        // This ensures that the dt_movimentacao accurately represents when the cash movement
        // was recorded in the system, resolving issues with incorrect timestamps like 9:00 AM.
        const movimentoDate = new Date();

        await tx.livroCaixa.create({
          data: {
            descricao: `Conta: ${updated.descricao}${updated.credor ? " - " + updated.credor : ""}`,
            valor: updated.valor,
            tipo_movimentacao: "SAIDA",
            categoria: updated.categoria || "DESPESAS GERAIS",
            dt_movimentacao: movimentoDate,
            origem: "AUTOMATICA",
            obs: `Referente à conta a pagar #${updated.id_conta_pagar}. ${updated.obs || ""}`,
            id_conta_bancaria: id_conta_bancaria,
          },
        });

        if (id_conta_bancaria) {
          console.log(
            `[ContasPagarRepo] Updating Bank Balance for Conta ${id_conta_bancaria}: -${updated.valor}`,
          );
          await tx.contaBancaria.update({
            where: { id_conta: id_conta_bancaria },
            data: { saldo_atual: { decrement: updated.valor } },
          });
        }
      }

      const isReverting = current?.status === "PAGO" && data.status !== "PAGO";
      if (isReverting) {
        console.log(
          `[ContasPagarRepo] Reverting payment for ID ${id} - Removing LivroCaixa entry`,
        );

        // Find existing entries to refund balance if needed
        const entriesToDelete = await tx.livroCaixa.findMany({
          where: {
            origem: "AUTOMATICA",
            obs: { startsWith: `Referente à conta a pagar #${id}` },
            deleted_at: null,
          },
        });

        for (const entry of entriesToDelete) {
          if (entry.id_conta_bancaria) {
            console.log(
              `[ContasPagarRepo] Refunding Bank Balance for Conta ${entry.id_conta_bancaria}: +${entry.valor}`,
            );
            await tx.contaBancaria.update({
              where: { id_conta: entry.id_conta_bancaria },
              data: { saldo_atual: { increment: entry.valor } },
            });
          }
        }

        if (entriesToDelete.length > 0) {
          await tx.livroCaixa.updateMany({
            where: {
              id_livro_caixa: {
                in: entriesToDelete.map((e) => e.id_livro_caixa),
              },
            },
            data: { deleted_at: new Date() },
          });
        }
      }

      // Lógica de Repetição para Edição (Gerar Novas Parcelas a partir desta)
      // Se o usuário pedir para repetir X vezes ao editar, vamos gerar X novas contas
      // baseadas nos dados ATUALIZADOS desta conta.
      const repetitions = Number(repetir_parcelas || 0);
      if (repetitions > 0 && updated.dt_vencimento) {
        console.log(
          `[ContasPagarRepo] Generating ${repetitions} future installments from updated bill`,
        );
        const baseDate = new Date(updated.dt_vencimento);

        for (let i = 1; i <= repetitions; i++) {
          const newDate = new Date(baseDate);
          newDate.setMonth(baseDate.getMonth() + i);

          const repData: any = { ...updateData };
          // Garantir que não levamos ID ou status de pago
          delete repData.id_conta_pagar;
          delete repData.created_at;
          delete repData.updated_at;

          repData.dt_vencimento = newDate;
          repData.status = "PENDENTE";
          repData.dt_pagamento = null;
          repData.obs = `${repData.obs || ""} (Recorrência ${i + 1}/${repetitions + 1} gerada via edição)`;

          await tx.contasPagar.create({ data: repData });
        }
      }

      return updated;
    });
  }

  async findRecurrenceInfo(id: number) {
    const conta = await this.findById(id);
    if (!conta) return null;

    // Verificar se tem campos de recorrência no banco
    if (conta.id_grupo_recorrencia) {
      return {
        numero_parcela: conta.numero_parcela,
        total_parcelas: conta.total_parcelas,
        id_grupo: conta.id_grupo_recorrencia,
      };
    }

    // Fallback: Parse da observação (para contas antigas)
    const match = conta.obs?.match(/\(Recorrência (\d+)\/(\d+)\)/);
    if (match) {
      return {
        numero_parcela: parseInt(match[1]!),
        total_parcelas: parseInt(match[2]!),
        id_grupo: null,
      };
    }

    return null; // Não é recorrente
  }

  async findByGrupoRecorrencia(idGrupo: string) {
    return prisma.contasPagar.findMany({
      where: {
        id_grupo_recorrencia: idGrupo,
        deleted_at: null,
      },
      orderBy: { numero_parcela: "asc" },
    });
  }

  async updateRecurrenceSeries(id: number, data: any, applyToAll: boolean) {
    if (!applyToAll) {
      return this.update(id, data);
    }

    const recInfo = await this.findRecurrenceInfo(id);
    if (!recInfo || !recInfo.id_grupo) {
      // Se não tem grupo, atualiza apenas esta conta
      return this.update(id, data);
    }

    // Buscar todas as contas do grupo
    const seriesContas = await this.findByGrupoRecorrencia(recInfo.id_grupo);

    // Normalização de datas (mesma lógica do update individual)
    const normalizeDate = (dateInfo: any) => {
      if (!dateInfo) return null;
      const dt = new Date(dateInfo);
      dt.setUTCHours(12, 0, 0, 0);
      return dt;
    };

    if (data.dt_vencimento)
      data.dt_vencimento = normalizeDate(data.dt_vencimento);
    if (data.dt_pagamento) data.dt_pagamento = normalizeDate(data.dt_pagamento);
    if (data.dt_emissao) data.dt_emissao = normalizeDate(data.dt_emissao);

    // Identify the specific bill being edited to calculate date deltas
    const originalBill = seriesContas.find((c) => c.id_conta_pagar === id);
    let dateDelta = 0;

    if (originalBill && data.dt_vencimento) {
      const oldDate = new Date(originalBill.dt_vencimento);
      const newDate = new Date(data.dt_vencimento);
      // Calculate difference in milliseconds
      dateDelta = newDate.getTime() - oldDate.getTime();
    }

    return prisma.$transaction(async (tx) => {
      const updates = [];
      for (const c of seriesContas) {
        // Preparar dados mantendo campos específicos de cada parcela
        const updateData = { ...data };

        // Remove invalid fields that cause 400 Bad Request
        delete updateData.repetir_parcelas;
        delete updateData.applyToAllRecurrences;

        // Manter os campos de recorrência originais
        delete updateData.id_grupo_recorrencia;
        delete updateData.numero_parcela;
        delete updateData.total_parcelas;

        // Smart Date Shifting
        // If we have a delta, apply it to the original date of THIS installment
        if (dateDelta !== 0) {
          const originalDate = new Date(c.dt_vencimento);
          const shifedDate = new Date(originalDate.getTime() + dateDelta);
          updateData.dt_vencimento = shifedDate;
        } else {
          // If date wasn't changed in the form, don't overwrite it with the single date from the form
          // UNLESS it was explicitly passed. But since we calculated delta from the form data,
          // if delta is 0, it means either date didn't change OR it wasn't passed.
          // If it wasn't passed, data.dt_vencimento is undefined, so we shouldn't touch it.
          // If it WAS passed but is same, we technically re-set it.
          // Ideally we only touch dt_vencimento if delta != 0 to preserve unique dates in series.
          delete updateData.dt_vencimento;
        }

        // Atualizar a observação mantendo o número da parcela
        if (updateData.obs !== undefined) {
          const obsStr = updateData.obs || "";
          const baseObs = obsStr
            .replace(/\s*\(Recorrência \d+\/\d+\)/, "")
            .trim();
          updateData.obs =
            `${baseObs} (Recorrência ${c.numero_parcela}/${c.total_parcelas})`.trim();
        }

        const updated = await tx.contasPagar.update({
          where: { id_conta_pagar: c.id_conta_pagar },
          data: updateData,
        });
        updates.push(updated);
      }
      return updates;
    });
  }

  async deleteRecurrenceSeries(id: number, deleteAll: boolean) {
    if (!deleteAll) {
      return this.delete(id);
    }

    const recInfo = await this.findRecurrenceInfo(id);
    if (!recInfo || !recInfo.id_grupo) {
      // Se não tem grupo, deleta apenas esta conta
      return this.delete(id);
    }

    // Buscar todas as contas do grupo
    const seriesContas = await this.findByGrupoRecorrencia(recInfo.id_grupo);

    return prisma.$transaction(async (tx) => {
      for (const c of seriesContas) {
        await tx.contasPagar.update({
          where: { id_conta_pagar: c.id_conta_pagar },
          data: { deleted_at: new Date() },
        });
      }
    });
  }

  async delete(id: number) {
    return prisma.contasPagar.update({
      where: { id_conta_pagar: id },
      data: { deleted_at: new Date() },
    });
  }
}
