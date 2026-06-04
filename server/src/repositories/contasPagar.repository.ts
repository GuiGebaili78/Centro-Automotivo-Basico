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

      // Sincronizar campos nf_parcela e nf_total_parcelas se houver nf_numero e recorrência
      if (grupoId && mainData.nf_numero) {
        mainData.nf_parcela = 1;
        mainData.nf_total_parcelas = totalParcelas;
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
            id_categoria: created.id_categoria, // Link category
            dt_movimentacao: movimentoDate,
            origem: "AUTOMATICA",
            obs: `Referente à conta a pagar #${created.id_conta_pagar}. ${mainData.obs || ""}`,
          },
        });

        // ── Passo 4: Sincronização de Notas Fiscais na Criação ──
        if (created.nf_numero) {
          const pendentesCount = await tx.contasPagar.count({
            where: {
              nf_numero: created.nf_numero,
              status: { not: "PAGO" },
              deleted_at: null,
            },
          });
          if (pendentesCount === 0) {
            await tx.pagamentoPeca.updateMany({
              where: {
                nf_numero: created.nf_numero,
                pago_ao_fornecedor: false,
                deleted_at: null,
              },
              data: {
                pago_ao_fornecedor: true,
                data_pagamento_fornecedor: created.dt_pagamento || new Date(),
              },
            });
          }
        }
      }

      // Lógica de Repetição (Novas Parcelas)
      if (repetitions > 0 && mainData.dt_vencimento) {
        const baseDate = new Date(mainData.dt_vencimento);

        for (let i = 1; i <= repetitions; i++) {
          const newDate = new Date(baseDate);
          newDate.setMonth(baseDate.getMonth() + i);

          const repData = { ...mainData };
          if (repData.id_categoria)
            repData.id_categoria = Number(repData.id_categoria); // Ensure validation

          repData.dt_vencimento = newDate;
          repData.status = "PENDENTE"; // Repetições futuras nascem pendentes
          repData.dt_pagamento = null;
          repData.id_grupo_recorrencia = grupoId;
          repData.numero_parcela = i + 1;
          repData.total_parcelas = totalParcelas;

          // Sincronizar campos de parcelas da nota fiscal
          if (repData.nf_numero) {
            repData.nf_parcela = i + 1;
            repData.nf_total_parcelas = totalParcelas;
          }

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

  async findAll(startDate?: string, endDate?: string) {
    const where: any = { deleted_at: null };
    
    if (startDate || endDate) {
      where.dt_vencimento = {};
      if (startDate) {
        where.dt_vencimento.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.dt_vencimento.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    return prisma.contasPagar.findMany({
      where,
      orderBy: { dt_vencimento: "asc" },
      include: { 
        categoria_financeira: {
          include: { parent: true }
        }
      },
    });
  }

  async findById(id: number) {
    return prisma.contasPagar.findUnique({
      where: { id_conta_pagar: id },
      include: { categoria_financeira: true },
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
      id_categoria, // Extract id_categoria
      ...updateData
    } = data;

    // Add id_categoria to updateData if present
    if (id_categoria) {
      // @ts-ignore
      updateData.id_categoria = Number(id_categoria);
    }

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
            id_categoria: updated.id_categoria, // Link category
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

        // ── Passo 4: Sincronização de Notas Fiscais ao Pagar ──
        if (updated.nf_numero) {
          const pendentesCount = await tx.contasPagar.count({
            where: {
              nf_numero: updated.nf_numero,
              status: { not: "PAGO" },
              deleted_at: null,
            },
          });
          if (pendentesCount === 0) {
            await tx.pagamentoPeca.updateMany({
              where: {
                nf_numero: updated.nf_numero,
                pago_ao_fornecedor: false,
                deleted_at: null,
              },
              data: {
                pago_ao_fornecedor: true,
                data_pagamento_fornecedor: updated.dt_pagamento || new Date(),
              },
            });
          }
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

        // ── Cascata NF: reverter status_pagamento das peças ──
        if (current?.nf_numero) {
          // Se agora há pelo menos 1 conta pendente para essa NF,
          // todas as peças vinculadas (auto-pagas) devem voltar para "Não pago"
          const aindaPendente = await tx.contasPagar.count({
            where: {
              nf_numero: current.nf_numero,
              status: { not: "PAGO" },
              deleted_at: null,
            },
          });

          if (aindaPendente > 0) {
            const revertidos = await tx.pagamentoPeca.updateMany({
              where: {
                nf_numero: current.nf_numero,
                pago_ao_fornecedor: true,
                deleted_at: null,
                // Só reverte peças que foram pagas automaticamente (sem livro_caixa individual)
                id_livro_caixa: null,
              },
              data: {
                pago_ao_fornecedor: false,
                data_pagamento_fornecedor: null,
              },
            });

            if (revertidos.count > 0) {
              console.log(
                `[ContasPagarRepo] Cascata NF "${current.nf_numero}": ${revertidos.count} peça(s) revertida(s) para "Não pago"`,
              );
            }
          }
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

        // Manter os campos de recorrência e NF originais para não quebrar a ordem das parcelas da série
        delete updateData.id_grupo_recorrencia;
        delete updateData.numero_parcela;
        delete updateData.total_parcelas;
        delete updateData.nf_parcela;
        delete updateData.nf_total_parcelas;

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
      return this.delete(id);
    }

    return prisma.contasPagar.updateMany({
      where: {
        id_grupo_recorrencia: recInfo.id_grupo,
        status: { in: ["PENDENTE", "ATRASADO"] },
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  async getDistinct(field: 'descricao' | 'credor', search: string) {
    return await prisma.contasPagar.findMany({
      where: { [field]: { contains: search, mode: "insensitive" }, deleted_at: null },
      distinct: [field],
      select: { [field]: true },
      take: 10,
    });
  }

  async buscarDescricao(termo: string) {
    return await prisma.contasPagar.findMany({
      where: { 
        descricao: { contains: termo, mode: 'insensitive' },
        deleted_at: null
      },
      distinct: ['descricao'],
      select: { descricao: true }
    });
  }

  async buscarCredor(termo: string) {
    return await prisma.contasPagar.findMany({
      where: { 
        credor: { contains: termo, mode: 'insensitive' },
        deleted_at: null
      },
      distinct: ['credor'],
      select: { credor: true }
    });
  }

  async delete(id: number) {
    return prisma.contasPagar.update({
      where: { id_conta_pagar: id },
      data: { deleted_at: new Date() },
    });
  }

  // ── Rota A: NFs Pendentes ──
  async findNfsPendentes(params?: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = params || {};
    
    const contas = await prisma.contasPagar.findMany({
      where: {
        nf_numero: { not: null },
        deleted_at: null,
        ...(search ? { nf_numero: { contains: search, mode: "insensitive" } } : {})
      },
      select: {
        nf_numero: true,
        credor: true,
        valor: true,
        status: true,
      }
    });

    const nfMap = new Map<string, { nf_numero: string, credor: string, valor: number, isPendente: boolean }>();
    
    for (const c of contas) {
      if (!c.nf_numero) continue;
      if (!nfMap.has(c.nf_numero)) {
         nfMap.set(c.nf_numero, {
            nf_numero: c.nf_numero,
            credor: c.credor || "",
            valor: Number(c.valor),
            isPendente: c.status !== "PAGO"
         });
      } else {
         const existing = nfMap.get(c.nf_numero)!;
         existing.valor += Number(c.valor);
         if (c.status !== "PAGO") existing.isPendente = true;
      }
    }

    const allNfs = Array.from(nfMap.keys());

    const nfsInEstoque = await prisma.entradaEstoque.findMany({
      where: {
        OR: [
          { nf_numero: { in: allNfs } },
          { nota_fiscal: { in: allNfs } }
        ]
      },
      select: { nf_numero: true, nota_fiscal: true }
    });

    const nfsInPecas = await prisma.pagamentoPeca.findMany({
      where: { nf_numero: { in: allNfs } },
      distinct: ["nf_numero"],
      select: { nf_numero: true }
    });
    
    const setEstoque = new Set<string>();
    for (const e of nfsInEstoque) {
      if (e.nf_numero) setEstoque.add(e.nf_numero);
      if (e.nota_fiscal) setEstoque.add(e.nota_fiscal);
    }
    for (const p of nfsInPecas) {
      if (p.nf_numero) setEstoque.add(p.nf_numero);
    }

    const resultList = Array.from(nfMap.values()).filter(nf => {
       return nf.isPendente || !setEstoque.has(nf.nf_numero);
    });

    const total = resultList.length;
    // Quando take não é informado, retorna todos sem paginar
    const paginated = take
      ? resultList.slice(skip || 0, (skip || 0) + take)
      : resultList.slice(skip || 0);

    // Remove campo interno de controle antes de enviar ao cliente
    const data = paginated.map(({ isPendente: _drop, ...nf }) => nf);

    return { data, total };
  }

  // ── Rota B: Status de Sincronização da NF ──
  async getNfSyncStatus(nfNumero: string) {
    const contas = await prisma.contasPagar.findMany({
      where: { nf_numero: nfNumero, deleted_at: null }
    });
    const somaContas = contas.reduce((acc, c) => acc + Number(c.valor), 0);

    const estoque = await prisma.entradaEstoque.findMany({
      where: { nf_numero: nfNumero }
    });
    const somaEstoque = estoque.reduce((acc, e) => acc + Number(e.valor_total), 0);

    const pecas = await prisma.pagamentoPeca.findMany({
      where: { nf_numero: nfNumero, deleted_at: null }
    });
    const somaPecas = pecas.reduce((acc, p) => acc + Number(p.custo_real), 0);

    const somaRealizada = somaEstoque + somaPecas;

    let percent = 0;
    let flag = "OK";

    if (somaContas > 0) {
      percent = Number(((somaRealizada / somaContas) * 100).toFixed(2));
      if (percent > 100) {
        percent = 100;
        flag = "VALOR_DIVERGENTE";
      }
    } else if (somaRealizada > 0) {
      percent = 0;
      flag = "VALOR_DIVERGENTE";
    }

    return {
      nf_numero: nfNumero,
      totalContasPagar: Number(somaContas.toFixed(2)),
      totalEstoque: Number(somaEstoque.toFixed(2)),
      totalPagamentoPeca: Number(somaPecas.toFixed(2)),
      totalRealizado: Number(somaRealizada.toFixed(2)),
      matchPercent: percent,
      status: flag
    };
  }

  // ── Rota C: Agregação da Central de Notas Fiscais (FASE 4) ──
  async getNotasFiscaisCentral() {
    // 1. Executa as 3 consultas de lote indexadas em paralelo
    const [contasPagarList, entradaEstoqueList, pagamentoPecaList] = await Promise.all([
      prisma.contasPagar.findMany({
        where: { nf_numero: { not: null }, deleted_at: null },
        orderBy: { dt_vencimento: "asc" }
      }),
      prisma.entradaEstoque.findMany({
        where: { nf_numero: { not: null } },
        include: { fornecedor: true }
      }),
      prisma.pagamentoPeca.findMany({
        where: { nf_numero: { not: null }, deleted_at: null },
        include: {
          fornecedor: true,
          item_os: {
            include: {
              ordem_de_servico: {
                include: {
                  cliente: {
                    include: {
                      pessoa_fisica: { include: { pessoa: true } },
                      pessoa_juridica: { include: { pessoa: true } }
                    }
                  },
                  veiculo: true
                }
              }
            }
          }
        }
      })
    ]);

    // 2. Agrupa em memória linear O(N)
    const uniqueNfs = new Set<string>();
    contasPagarList.forEach((c) => c.nf_numero && uniqueNfs.add(c.nf_numero));
    entradaEstoqueList.forEach((e) => e.nf_numero && uniqueNfs.add(e.nf_numero));
    pagamentoPecaList.forEach((p) => p.nf_numero && uniqueNfs.add(p.nf_numero));

    return Array.from(uniqueNfs).map((nf) => {
      const contas = contasPagarList.filter((c) => c.nf_numero === nf);
      const estoques = entradaEstoqueList.filter((e) => e.nf_numero === nf);
      const pecas = pagamentoPecaList.filter((p) => p.nf_numero === nf);

      // Determina o Fornecedor Principal (Credor)
      const credor =
        contas[0]?.credor ||
        estoques[0]?.fornecedor?.nome ||
        (estoques[0]?.fornecedor as any)?.nome_fantasia ||
        pecas[0]?.fornecedor?.nome ||
        (pecas[0]?.fornecedor as any)?.nome_fantasia ||
        "FORNECEDOR NÃO INFORMADO";

      // Calcula o valor total planejado de Contas a Pagar
      const valorTotal = contas.reduce((sum, c) => sum + Number(c.valor), 0);

      // Status consolidado da NF: pago se todas as parcelas forem "PAGO"
      const statusConsolidado =
        contas.length > 0 && contas.every((c) => c.status === "PAGO") ? "PAGO" : "PENDENTE";

      return {
        nf_numero: nf,
        credor: credor.toUpperCase(),
        valor_total: Number(valorTotal.toFixed(2)),
        status: statusConsolidado,
        boletos: contas.map((c) => ({
          id_conta_pagar: c.id_conta_pagar,
          descricao: c.descricao,
          valor: Number(c.valor),
          dt_vencimento: c.dt_vencimento,
          dt_pagamento: c.dt_pagamento,
          status: c.status,
          numero_parcela: c.numero_parcela,
          total_parcelas: c.total_parcelas,
          nf_parcela: c.nf_parcela,
          nf_total_parcelas: c.nf_total_parcelas,
          nf_boleto: c.nf_boleto,
        })),
        pecas_estoque: estoques.map((e) => ({
          id_entrada_estoque: e.id_entrada,
          nota_fiscal: e.nota_fiscal,
          data_compra: e.data_compra,
          valor_total: Number(e.valor_total),
          obs: e.obs,
          fornecedor: (e.fornecedor as any)?.nome_fantasia || e.fornecedor?.nome || "Desconhecido",
        })),
        pecas_os: pecas.map((p) => {
          const os = p.item_os?.ordem_de_servico;
          let clientName = "Cliente não cadastrado";

          if (os?.cliente) {
            if (os.cliente.tipo_pessoa === 2 && os.cliente.pessoa_juridica?.pessoa?.nome) {
              clientName = os.cliente.pessoa_juridica.pessoa.nome;
            } else if (os.cliente.pessoa_fisica?.pessoa?.nome) {
              clientName = os.cliente.pessoa_fisica.pessoa.nome;
            }
          }

          return {
            id_pagamento_peca: p.id_pagamento_peca,
            descricao: p.item_os?.descricao || "Peça Avulsa",
            custo_real: Number(p.custo_real),
            data_compra: p.data_compra,
            pago_ao_fornecedor: p.pago_ao_fornecedor,
            id_os: os?.id_os,
            cliente: clientName.toUpperCase(),
            veiculo: os?.veiculo
              ? `${os.veiculo.modelo} (${os.veiculo.placa})`.toUpperCase()
              : "SEM VEÍCULO",
          };
        }),
      };
    });
  }
}
