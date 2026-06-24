/**
 * PecasEstoqueRepository
 *
 * Responsabilidade EXCLUSIVA: acesso ao banco de dados via Prisma.
 * Nenhuma lógica de negócio ou validação de HTTP deve existir aqui.
 *
 * Princípios aplicados:
 * - Operações atômicas: increment/decrement dentro de $transaction (sem SELECT + UPDATE separados)
 * - Auditoria total: toda movimentação grava id_usuario + nome_usuario_snapshot
 * - Imutabilidade: nenhum método de DELETE em movimentacao_estoque
 * - Paginação: findAll retorna { data, total, page, limit }
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

// ─────────────────────────────────────────────────────────────
// Tipos Internos
// ─────────────────────────────────────────────────────────────

export interface AuditoriaCtx {
  id_usuario: number | null;
  nome_usuario_snapshot: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export class PecasEstoqueRepository {
  // ───────────────────────────────────────────────────────────
  // CATÁLOGO (CRUD)
  // ───────────────────────────────────────────────────────────

  async create(data: Prisma.PecasEstoqueCreateInput) {
    try {
      return await prisma.pecasEstoque.create({ data });
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error(
          "Peça já cadastrada no catálogo com este Nome, Fabricante e Referência."
        );
      }
      throw error;
    }
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    id_categoria?: number
  ): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.PecasEstoqueWhereInput = { ativo: true };

    if (id_categoria) {
      whereClause.id_categoria = id_categoria;
    }

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { fabricante: { contains: search, mode: "insensitive" } },
        { ref_cod: { contains: search, mode: "insensitive" } },
        { modelo: { contains: search, mode: "insensitive" } },
        { aplicacao: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.pecasEstoque.findMany({
        where: whereClause,
        include: { categoria: true },
        orderBy: { nome: "asc" },
        skip,
        take: limit,
      }),
      prisma.pecasEstoque.count({ where: whereClause }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return await prisma.pecasEstoque.findUnique({
      where: { id_pecas_estoque: id },
      include: {
        categoria: true,
        itens_entrada: {
          take: 1,
          orderBy: { id_item_entrada: "desc" },
          include: { entrada: { include: { fornecedor: true } } },
        },
        _count: {
          select: { movimentacoes: true },
        },
      },
    });
  }

  async update(id_pecas_estoque: number, data: any, auditoria?: AuditoriaCtx) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verificar conflito de unicidade
      const conflito = await tx.pecasEstoque.findFirst({
        where: {
          nome: data.nome,
          fabricante: data.fabricante,
          ref_cod: data.ref_cod,
          id_pecas_estoque: { not: id_pecas_estoque },
        },
      });

      if (conflito) {
        throw new Error(
          "Já existe outra peça cadastrada com esta combinação de Nome, Fabricante e Referência."
        );
      }

      // 2. Buscar registro atual para comparação (Diff)
      const atual = await tx.pecasEstoque.findUnique({
        where: { id_pecas_estoque },
      });

      if (!atual) {
        throw new Error("Peça não encontrada no catálogo.");
      }

      // 3. Executar o update
      const pecaAtualizada = await tx.pecasEstoque.update({
        where: { id_pecas_estoque },
        data,
      });

      // 4. Comparar campos críticos e gerar log de metadados se houver alterações
      const alteracoes: string[] = [];

      if (data.nome !== undefined && data.nome.trim() !== atual.nome.trim()) {
        alteracoes.push(`nome (de '${atual.nome}' para '${data.nome}')`);
      }

      const fabAtual = atual.fabricante || "";
      const fabNovo = data.fabricante !== undefined ? (data.fabricante || "") : fabAtual;
      if (fabNovo.trim() !== fabAtual.trim()) {
        alteracoes.push(`fabricante (de '${atual.fabricante || "Sem fabricante"}' para '${data.fabricante || "Sem fabricante"}')`);
      }

      if (data.valor_custo !== undefined && Number(data.valor_custo) !== Number(atual.valor_custo)) {
        alteracoes.push(`valor_custo (de ${Number(atual.valor_custo)} para ${Number(data.valor_custo)})`);
      }

      if (data.valor_venda !== undefined && Number(data.valor_venda) !== Number(atual.valor_venda)) {
        alteracoes.push(`valor_venda (de ${Number(atual.valor_venda)} para ${Number(data.valor_venda)})`);
      }

      if (alteracoes.length > 0 && auditoria) {
        await tx.movimentacaoEstoque.create({
          data: {
            id_pecas_estoque,
            id_usuario: auditoria.id_usuario,
            nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
            tipo_movimento: "ATUALIZACAO_CADASTRAL",
            quantidade: 0,
            saldo_anterior: atual.estoque_atual,
            saldo_atual: pecaAtualizada.estoque_atual,
            origem: "Edição do Catálogo",
            obs: `Alterado: ${alteracoes.join(", ")}`,
          },
        });
      }

      return pecaAtualizada;
    });
  }

  async delete(id: number) {
    const temHistorico = await prisma.movimentacaoEstoque.count({
      where: { id_pecas_estoque: id },
    });

    const peca = await prisma.pecasEstoque.update({
      where: { id_pecas_estoque: id },
      data: { ativo: false },
      select: {
        id_pecas_estoque: true,
        nome: true,
        ativo: true,
        _count: { select: { movimentacoes: true } },
      },
    });

    return { peca, temHistorico: temHistorico > 0 };
  }

  async search(query: string, tipo?: number) {
    const whereClause: Prisma.PecasEstoqueWhereInput = { ativo: true };

    if (tipo) whereClause.id_categoria = tipo;

    if (query && query.trim() !== "") {
      whereClause.OR = [
        { nome: { contains: query, mode: "insensitive" } },
        { fabricante: { contains: query, mode: "insensitive" } },
        { ref_cod: { contains: query, mode: "insensitive" } },
        { modelo: { contains: query, mode: "insensitive" } },
        { aplicacao: { contains: query, mode: "insensitive" } },
      ];
    }

    return await prisma.pecasEstoque.findMany({
      where: whereClause,
      take: 20,
      include: { categoria: true },
    });
  }

  async getAvailability(id: number) {
    const part = await prisma.pecasEstoque.findUnique({
      where: { id_pecas_estoque: id },
      select: {
        estoque_atual: true,
        nome: true,
        valor_venda: true,
        id_pecas_estoque: true,
      },
    });

    if (!part) return null;

    const reservedItems = await prisma.itensOs.aggregate({
      where: {
        id_pecas_estoque: id,
        deleted_at: null,
        ordem_de_servico: {
          status: { notIn: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          deleted_at: null,
        },
      },
      _sum: { quantidade: true },
    });

    return { ...part, reserved: reservedItems._sum.quantidade || 0 };
  }

  // ───────────────────────────────────────────────────────────
  // HISTÓRICO DE MOVIMENTAÇÕES
  // ───────────────────────────────────────────────────────────

  async getHistoricoByPeca(
    id_pecas_estoque: number,
    page: number,
    limit: number
  ): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.movimentacaoEstoque.findMany({
        where: { id_pecas_estoque },
        orderBy: { dt_movimentacao: "desc" },
        skip,
        take: limit,
        include: {
          ordem_de_servico: {
            select: {
              id_os: true,
              status: true,
              cliente: {
                select: {
                  pessoa_fisica: { select: { pessoa: { select: { nome: true } } } },
                  pessoa_juridica: { select: { razao_social: true } },
                },
              },
              veiculo: {
                select: {
                  placa: true,
                  marca: true,
                  modelo: true,
                  cor: true,
                },
              },
            },
          },
          item_entrada: {
            select: {
              id_item_entrada: true,
              entrada: {
                select: {
                  id_entrada: true,
                  nf_numero: true,
                  data_compra: true,
                  fornecedor: {
                    select: { nome: true, nome_fantasia: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.movimentacaoEstoque.count({ where: { id_pecas_estoque } }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Registra um estorno compensatório para uma movimentação existente.
   * NUNCA deleta registros históricos. O estorno é uma nova movimentação
   * com quantidade inversa que corrige o saldo.
   */
  async registrarEstorno(
    id_movimentacao: number,
    auditoria: AuditoriaCtx
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar a movimentação original
      const original = await tx.movimentacaoEstoque.findUnique({
        where: { id_movimentacao },
        include: { peca: { select: { estoque_atual: true, nome: true } } },
      });

      if (!original) throw new Error("Movimentação não encontrada.");
      if (original.tipo_movimento === "ESTORNO") {
        throw new Error("Não é possível estornar um estorno.");
      }

      // 2. Determinar quantidade de ajuste (inverso da original)
      const qtdEstorno = -original.quantidade; // Ex: se original = +10, estorno = -10

      // 3. Buscar saldo atual para snapshot
      const pecaAtual = await tx.pecasEstoque.findUnique({
        where: { id_pecas_estoque: original.id_pecas_estoque },
        select: { estoque_atual: true },
      });
      if (!pecaAtual) throw new Error("Peça não encontrada.");

      const saldoAntes = pecaAtual.estoque_atual;

      // 4. Validar se o estorno não geraria saldo negativo
      if (saldoAntes + qtdEstorno < 0) {
        throw new Error(
          `Estorno bloqueado: o saldo da peça ficaria negativo (${saldoAntes} - ${original.quantidade} = ${saldoAntes + qtdEstorno}).`
        );
      }

      // 5. Atualizar saldo atomicamente
      const pecaAtualizada = await tx.pecasEstoque.update({
        where: { id_pecas_estoque: original.id_pecas_estoque },
        data: {
          estoque_atual:
            qtdEstorno > 0
              ? { increment: Math.abs(qtdEstorno) }
              : { decrement: Math.abs(qtdEstorno) },
        },
        select: { estoque_atual: true },
      });

      // 6. Registrar a movimentação de estorno (imutável, como todas as outras)
      const estorno = await tx.movimentacaoEstoque.create({
        data: {
          id_pecas_estoque: original.id_pecas_estoque,
          id_usuario: auditoria.id_usuario,
          nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
          tipo_movimento: "ESTORNO",
          quantidade: qtdEstorno,
          saldo_anterior: saldoAntes,
          saldo_atual: pecaAtualizada.estoque_atual,
          valor_unitario: original.valor_unitario,
          origem: `Estorno da Movimentação #${id_movimentacao}`,
          obs: `Estorno compensatório. Movimentação original: ${original.tipo_movimento} de ${original.quantidade} unidades.`,
        },
      });

      return estorno;
    });
  }

  async ajustarSaldo(
    id_pecas_estoque: number,
    payload: { tipo: "ADD" | "REMOVE"; quantidade: number; motivo: string },
    auditoria: AuditoriaCtx
  ) {
    return await prisma.$transaction(async (tx) => {
      const peca = await tx.pecasEstoque.findUnique({
        where: { id_pecas_estoque },
        select: { estoque_atual: true, nome: true },
      });
      if (!peca) throw new Error("Peça não encontrada no catálogo.");

      const saldoAntes = peca.estoque_atual;
      const diff = payload.tipo === "ADD" ? payload.quantidade : -payload.quantidade;

      if (saldoAntes + diff < 0) {
        throw new Error(
          `Ajuste bloqueado: o estoque atual (${saldoAntes}) não possui quantidade suficiente para remover ${payload.quantidade} unidades.`
        );
      }

      const pecaAtualizada = await tx.pecasEstoque.update({
        where: { id_pecas_estoque },
        data: {
          estoque_atual:
            payload.tipo === "ADD"
              ? { increment: payload.quantidade }
              : { decrement: payload.quantidade },
        },
        select: { estoque_atual: true },
      });

      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          id_pecas_estoque,
          id_usuario: auditoria.id_usuario,
          nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
          tipo_movimento: "AJUSTE",
          quantidade: diff,
          saldo_anterior: saldoAntes,
          saldo_atual: pecaAtualizada.estoque_atual,
          origem: "Ajuste Manual de Saldo",
          obs: payload.motivo,
        },
      });

      return { peca: pecaAtualizada, movimentacao };
    });
  }

  // ───────────────────────────────────────────────────────────
  // ENTRADAS DE ESTOQUE
  // ───────────────────────────────────────────────────────────

  async createEntry(
    data: {
      id_fornecedor: number;
      nota_fiscal?: string;
      data_compra?: Date;
      obs?: string;
      nf_numero?: string | null;
      itens: {
        id_pecas_estoque?: number;
        new_part_data?: any;
        quantidade: number;
        valor_custo: number;
        valor_venda: number;
        margem_lucro?: number;
        ref_cod?: string;
        condicao?: string;
        aplicacao?: string;
        obs?: string;
      }[];
    },
    auditoria: AuditoriaCtx
  ) {
    const nfNumeroNormalized = data.nf_numero
      ? data.nf_numero.trim() || null
      : null;

    return await prisma.$transaction(async (tx) => {
      // 1. Criar cabeçalho da entrada
      const entrada = await tx.entradaEstoque.create({
        data: {
          id_pessoa: data.id_fornecedor,
          nota_fiscal: data.nota_fiscal || null,
          data_compra: data.data_compra || new Date(),
          valor_total: data.itens.reduce(
            (acc, i) => acc + Number(i.valor_custo) * Number(i.quantidade),
            0
          ),
          obs: data.obs || null,
          nf_numero: nfNumeroNormalized,
        },
      });

      // 2. Processar cada item
      for (const item of data.itens) {
        let partId = item.id_pecas_estoque;

        // 2a. Criar peça nova se necessário
        if (!partId && item.new_part_data) {
          const newPart = await tx.pecasEstoque.create({
            data: {
              nome: item.new_part_data.nome,
              descricao: item.new_part_data.descricao || item.new_part_data.nome,
              unidade_medida: item.new_part_data.unidade_medida || "UN",
              estoque_atual: 0,
              valor_custo: item.valor_custo,
              valor_venda: item.valor_venda,
              estoque_minimo: item.new_part_data.estoque_minimo || 0,
              custo_unitario_padrao: item.valor_custo,
              fabricante: item.new_part_data.fabricante || null,
              localizacao: item.new_part_data.localizacao || null,
              modelo: item.new_part_data.modelo || null,
              id_categoria: item.new_part_data.id_categoria || null,
            },
          });
          partId = newPart.id_pecas_estoque;
        }

        if (!partId)
          throw new Error("Item sem ID de peça e sem dados para cadastro.");

        // 2b. Atualizar dados do catálogo se solicitado
        if (partId && item.new_part_data?._update_master) {
          await tx.pecasEstoque.update({
            where: { id_pecas_estoque: partId },
            data: {
              nome: item.new_part_data.nome,
              descricao:
                item.new_part_data.descricao || item.new_part_data.nome,
              fabricante: item.new_part_data.fabricante || null,
              localizacao: item.new_part_data.localizacao || null,
              modelo: item.new_part_data.modelo || null,
              id_categoria: item.new_part_data.id_categoria || null,
            },
          });
        }

        // 2c. Criar ItemEntrada
        const itemEntradaCriado = await tx.itemEntrada.create({
          data: {
            id_entrada: entrada.id_entrada,
            id_pecas_estoque: partId,
            quantidade: item.quantidade,
            valor_custo: item.valor_custo,
            valor_venda: item.valor_venda,
            margem_lucro: item.margem_lucro || null,
            ref_cod: item.ref_cod || null,
            condicao: item.condicao || null,
            aplicacao: item.aplicacao || null,
            obs: item.obs || null,
          },
        });

        // 2d. OPERAÇÃO ATÔMICA: incrementar estoque + capturar saldo para auditoria
        // O saldo_anterior é capturado ANTES do increment dentro da mesma transação
        const pecaAntes = await tx.pecasEstoque.findUnique({
          where: { id_pecas_estoque: partId },
          select: { estoque_atual: true },
        });
        const saldoAntes = pecaAntes?.estoque_atual ?? 0;

        const pecaAtualizada = await tx.pecasEstoque.update({
          where: { id_pecas_estoque: partId },
          data: {
            estoque_atual: { increment: item.quantidade },
            valor_venda: item.valor_venda,
            dt_ultima_compra: new Date(),
          },
          select: { estoque_atual: true },
        });

        // 2e. Registrar movimentação de auditoria (IMUTÁVEL)
        await tx.movimentacaoEstoque.create({
          data: {
            id_pecas_estoque: partId,
            id_usuario: auditoria.id_usuario,
            nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
            tipo_movimento: "ENTRADA",
            quantidade: item.quantidade,
            saldo_anterior: saldoAntes,
            saldo_atual: pecaAtualizada.estoque_atual,
            valor_unitario: new Prisma.Decimal(item.valor_custo),
            origem: `Entrada de Estoque #${entrada.id_entrada}`,
            id_item_entrada: itemEntradaCriado.id_item_entrada,
          },
        });
      }

      return entrada;
    });
  }

  async findEntryById(id: number) {
    return await prisma.entradaEstoque.findUnique({
      where: { id_entrada: id },
      include: {
        fornecedor: true,
        itens: { include: { peca: true } },
      },
    });
  }

  async updateEntry(
    id: number,
    data: {
      id_pessoa?: number;
      nota_fiscal?: string | null;
      data_compra?: Date;
      obs?: string | null;
      nf_numero?: string | null;
      itens: {
        id_item_entrada?: number;
        id_pecas_estoque?: number;
        new_part_data?: any;
        quantidade: number;
        valor_custo: number;
        valor_venda: number;
        margem_lucro?: number;
        ref_cod?: string;
        condicao?: string;
        aplicacao?: string;
        obs?: string;
        _delete?: boolean;
      }[];
    },
    auditoria: AuditoriaCtx
  ) {
    return await prisma.$transaction(async (tx) => {
      const entrada = await tx.entradaEstoque.findUnique({
        where: { id_entrada: id },
        include: { itens: { include: { peca: true } } },
      });
      if (!entrada) throw new Error("Entrada de estoque não encontrada.");

      const payloadIds = data.itens
        .map((i) => i.id_item_entrada)
        .filter((id): id is number => id !== undefined && id !== null);

      // --- Deleção: itens no banco ausentes no payload ---
      const itemsToDelete = entrada.itens.filter(
        (dbItem) => !payloadIds.includes(dbItem.id_item_entrada)
      );

      for (const itemExistente of itemsToDelete) {
        const partId = itemExistente.id_pecas_estoque;

        const osAtivas = await tx.itensOs.count({
          where: {
            id_pecas_estoque: partId,
            deleted_at: null,
            ordem_de_servico: {
              status: { notIn: ["FINALIZADA", "CANCELADA", "PAGA_CLIENTE"] },
              deleted_at: null,
            },
          },
        });
        if (osAtivas > 0) {
          const nomePeca = itemExistente.peca?.nome || `ID ${partId}`;
          throw new Error(
            `A peça "${nomePeca}" não pode ser removida pois está vinculada a uma Ordem de Serviço ativa.`
          );
        }

        // Capturar saldo antes do decrement atômico
        const pecaAntes = await tx.pecasEstoque.findUnique({
          where: { id_pecas_estoque: partId },
          select: { estoque_atual: true },
        });
        const saldoAntes = pecaAntes?.estoque_atual ?? 0;

        const pecaAtualizada = await tx.pecasEstoque.update({
          where: { id_pecas_estoque: partId },
          data: { estoque_atual: { decrement: itemExistente.quantidade } },
          select: { estoque_atual: true },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            id_pecas_estoque: partId,
            id_usuario: auditoria.id_usuario,
            nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
            tipo_movimento: "SAIDA",
            quantidade: -itemExistente.quantidade,
            saldo_anterior: saldoAntes,
            saldo_atual: pecaAtualizada.estoque_atual,
            origem: `Remoção de item da Entrada #${id}`,
          },
        });

        await tx.itemEntrada.delete({
          where: { id_item_entrada: itemExistente.id_item_entrada },
        });
      }

      // --- Atualização e Criação de itens ---
      for (const item of data.itens) {
        if (item.id_item_entrada) {
          const dbItem = await tx.itemEntrada.findUnique({
            where: { id_item_entrada: item.id_item_entrada },
          });
          if (!dbItem) throw new Error(`Item da entrada (ID ${item.id_item_entrada}) não encontrado.`);

          const diffQtd = item.quantidade - dbItem.quantidade;
          const partId = dbItem.id_pecas_estoque;

          // Atualizar o item da entrada (NOTA: respeita a alteração da NF, mas não altera os dados cadastrais da peça)
          await tx.itemEntrada.update({
            where: { id_item_entrada: item.id_item_entrada },
            data: {
              quantidade: item.quantidade,
              valor_custo: item.valor_custo,
              ref_cod: item.ref_cod ?? null,
              condicao: item.condicao ?? null,
              aplicacao: item.aplicacao ?? null,
              obs: item.obs ?? null,
            },
          });

          if (diffQtd !== 0 || Number(dbItem.valor_custo) !== Number(item.valor_custo)) {
            const pecaAntes = await tx.pecasEstoque.findUnique({
              where: { id_pecas_estoque: partId },
              select: { estoque_atual: true },
            });
            const saldoAntes = pecaAntes?.estoque_atual ?? 0;

            if (saldoAntes + diffQtd < 0) {
              throw new Error(
                `Retificação bloqueada: a alteração na NF subtrairia ${Math.abs(diffQtd)} unidades da peça, mas o estoque atual é de apenas ${saldoAntes} (as peças já foram consumidas ou vendidas).`
              );
            }

            const pecaAtualizada = await tx.pecasEstoque.update({
              where: { id_pecas_estoque: partId },
              data: {
                estoque_atual: { increment: diffQtd },
                valor_custo: item.valor_custo,
                // Proibido alterar nome ou valor_venda da oficina aqui
              },
              select: { estoque_atual: true },
            });

            await tx.movimentacaoEstoque.create({
              data: {
                id_pecas_estoque: partId,
                id_usuario: auditoria.id_usuario,
                nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
                tipo_movimento: "RETIFICAÇÃO",
                quantidade: diffQtd,
                saldo_anterior: saldoAntes,
                saldo_atual: pecaAtualizada.estoque_atual,
                valor_unitario: new Prisma.Decimal(item.valor_custo),
                origem: `Retificação da Entrada #${id}`,
                obs: `Correção de quantidade (${dbItem.quantidade} para ${item.quantidade}) ou custo na NF.`,
                id_item_entrada: item.id_item_entrada,
              },
            });
          }
          continue;
        }

        let partId = item.id_pecas_estoque;
        if (!partId && item.new_part_data) {
          const newPart = await tx.pecasEstoque.create({
            data: {
              nome: item.new_part_data.nome,
              descricao: item.new_part_data.descricao || item.new_part_data.nome,
              unidade_medida: item.new_part_data.unidade_medida || "UN",
              estoque_atual: 0,
              valor_custo: item.valor_custo,
              valor_venda: item.valor_venda,
              estoque_minimo: item.new_part_data.estoque_minimo || 0,
              custo_unitario_padrao: item.valor_custo,
              fabricante: item.new_part_data.fabricante || null,
              localizacao: item.new_part_data.localizacao || null,
              modelo: item.new_part_data.modelo || null,
              id_categoria: item.new_part_data.id_categoria || null,
            },
          });
          partId = newPart.id_pecas_estoque;
        }
        if (!partId)
          throw new Error("Item sem ID de peça e sem dados para cadastro.");

        await tx.itemEntrada.create({
          data: {
            id_entrada: id,
            id_pecas_estoque: partId,
            quantidade: item.quantidade,
            valor_custo: item.valor_custo,
            valor_venda: item.valor_venda,
            margem_lucro: item.margem_lucro ?? null,
            ref_cod: item.ref_cod ?? null,
            condicao: item.condicao ?? null,
            aplicacao: item.aplicacao ?? null,
            obs: item.obs ?? null,
          },
        });

        const pecaAntes = await tx.pecasEstoque.findUnique({
          where: { id_pecas_estoque: partId },
          select: { estoque_atual: true },
        });
        const saldoAntes = pecaAntes?.estoque_atual ?? 0;

        const pecaAtualizada = await tx.pecasEstoque.update({
          where: { id_pecas_estoque: partId },
          data: {
            estoque_atual: { increment: item.quantidade },
            valor_venda: item.valor_venda,
            dt_ultima_compra: new Date(),
          },
          select: { estoque_atual: true },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            id_pecas_estoque: partId,
            id_usuario: auditoria.id_usuario,
            nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
            tipo_movimento: "ENTRADA",
            quantidade: item.quantidade,
            saldo_anterior: saldoAntes,
            saldo_atual: pecaAtualizada.estoque_atual,
            valor_unitario: new Prisma.Decimal(item.valor_custo),
            origem: `Adição de item na Entrada #${id}`,
          },
        });
      }

      // Recalcular valor total
      const itensAtualizados = await tx.itemEntrada.findMany({
        where: { id_entrada: id },
      });
      const novoTotal = itensAtualizados.reduce(
        (acc, i) => acc + Number(i.valor_custo) * Number(i.quantidade),
        0
      );

      return await tx.entradaEstoque.update({
        where: { id_entrada: id },
        data: {
          ...(data.id_pessoa !== undefined && { id_pessoa: data.id_pessoa }),
          ...(data.nota_fiscal !== undefined && {
            nota_fiscal: data.nota_fiscal,
          }),
          ...(data.data_compra !== undefined && {
            data_compra: data.data_compra,
          }),
          ...(data.obs !== undefined && { obs: data.obs }),
          ...(data.nf_numero !== undefined && {
            nf_numero: data.nf_numero?.trim() || null,
          }),
          valor_total: novoTotal,
        },
        include: { itens: { include: { peca: true } } },
      });
    });
  }

  async deleteEntry(id: number, auditoria: AuditoriaCtx) {
    return await prisma.$transaction(async (tx) => {
      const entrada = await tx.entradaEstoque.findUnique({
        where: { id_entrada: id },
        include: { itens: { include: { peca: true } } },
      });

      if (!entrada) throw new Error("Entrada de estoque não encontrada.");

      for (const item of entrada.itens) {
        const partId = item.id_pecas_estoque;

        const osAtivas = await tx.itensOs.count({
          where: {
            id_pecas_estoque: partId,
            deleted_at: null,
            ordem_de_servico: {
              status: { notIn: ["CANCELADA"] },
              deleted_at: null,
            },
          },
        });

        if (osAtivas > 0) {
          const nomePeca = item.peca?.nome || `ID ${partId}`;
          throw new Error(
            `Não é possível excluir esta entrada. A peça "${nomePeca}" já foi vinculada a uma Ordem de Serviço.`
          );
        }

        // Capturar saldo antes do decrement atômico
        const pecaAntes = await tx.pecasEstoque.findUnique({
          where: { id_pecas_estoque: partId },
          select: { estoque_atual: true },
        });
        const saldoAntes = pecaAntes?.estoque_atual ?? 0;

        // OPERAÇÃO ATÔMICA: o CHECK constraint do banco rejeita se resultar em < 0
        const pecaAtualizada = await tx.pecasEstoque.update({
          where: { id_pecas_estoque: partId },
          data: { estoque_atual: { decrement: item.quantidade } },
          select: { estoque_atual: true },
        });

        // Registrar movimentação de saída (auditoria)
        await tx.movimentacaoEstoque.create({
          data: {
            id_pecas_estoque: partId,
            id_usuario: auditoria.id_usuario,
            nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
            tipo_movimento: "SAIDA",
            quantidade: -item.quantidade,
            saldo_anterior: saldoAntes,
            saldo_atual: pecaAtualizada.estoque_atual,
            origem: `Exclusão da Entrada de Estoque #${id}`,
          },
        });
      }

      await tx.itemEntrada.deleteMany({ where: { id_entrada: id } });
      await tx.entradaEstoque.delete({ where: { id_entrada: id } });

      return { success: true };
    });
  }
}
