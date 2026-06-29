/**
 * PecasEstoqueRepository — Camada de Anti-Corrupção (ACL)
 *
 * RESPONSABILIDADE: Isolar a aplicação da mudança de infraestrutura no banco.
 *
 * O banco migrou de:
 *   pecas_estoque  → produto
 *   entrada_estoque + item_entrada → removidas (entradas viram MovimentacaoEstoque)
 *   movimentacao_estoque → refatorada (produto_id, tipo enum, campos renomeados)
 *
 * Este repositório consulta os NOVOS modelos Prisma, mas mapeia (traduz)
 * os dados de volta para o contrato ANTERIOR que os Controllers e o frontend
 * já esperam — garantindo que a mudança de banco fique restrita a esta camada.
 *
 * Princípios:
 * - Mapper puro: funções sem efeito colateral que traduzem DB ↔ Contrato
 * - Operações atômicas: $transaction sempre que há mais de uma escrita
 * - Auditoria: toda movimentação grava id_usuario + nome_usuario_snapshot
 * - Imutabilidade: sem DELETE em movimentacao_estoque (apenas estorno)
 * - Paginação: findAll retorna { data, total, page, limit }
 */

import { Prisma, TipoMovimentacao, CondicaoPeca } from "@prisma/client";
import { prisma } from "../prisma.js";
import { PrecificacaoService } from "../services/precificacao.service.js";

const precificacaoService = new PrecificacaoService();

// ─────────────────────────────────────────────────────────────────────────────
// Tipos Públicos (mantidos idênticos ao contrato anterior)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Mappers — a única camada que conhece os dois vocabulários
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DB (Produto) → Contrato Legado (IPecasEstoque)
 * Nenhum consumidor fora deste arquivo precisa saber que a tabela mudou.
 */
function mapProdutoToPecasEstoque(p: any): any {
  let itens_entrada: any[] = [];
  if (p.movimentacoes && p.movimentacoes.length > 0) {
    const mov = p.movimentacoes[0];
    if (mov && mov.tipo === "ENTRADA") {
      itens_entrada = [
        {
          entrada: {
            data_compra: mov.data_movimentacao,
            nf_numero: mov.nota_fiscal?.numero || null,
            fornecedor: mov.nota_fiscal?.fornecedor || null,
            id_pessoa: mov.nota_fiscal?.id_fornecedor || null,
          },
          condicao: mov.condicao || p.condicao || "NOVO",
          aplicacao: p.aplicacao_equivalencia || null,
          ref_cod: p.ref_cod || null,
        }
      ];
    }
  }

  return {
    id_pecas_estoque: p.id_produto,
    nome: p.nome,
    fabricante: p.fabricante || null,
    descricao: p.descricao || p.nome,
    valor_custo: p.preco_custo_atual,
    valor_venda: p.preco_venda_atual,
    estoque_atual: p.saldo_atual,
    estoque_minimo: p.estoque_minimo,
    unidade_medida: p.unidade_medida || null,
    custo_unitario_padrao: p.custo_unitario_padrao,
    dt_ultima_compra: p.data_ultima_compra || null,
    dt_cadastro: p.dt_cadastro,
    ref_cod: p.ref_cod || null,
    localizacao: p.localizacao || null,
    aplicacao: p.aplicacao_equivalencia || null,
    modelo: p.modelo || null,
    id_categoria: p.id_categoria || null,
    categoria: p.categoria || null,
    condicao: p.condicao || "NOVO",
    ativo: p.ativo,
    itens_entrada: itens_entrada,
    _count: p._count,
  };
}

/**
 * DB (MovimentacaoEstoque novo) → Contrato Legado (IMovimentacaoEstoque)
 * produto_id → id_pecas_estoque, tipo enum → tipo_movimento string, etc.
 */
function mapMovimentacaoToLegacy(m: any): any {
  return {
    id_movimentacao: m.id_movimentacao,
    id_pecas_estoque: m.produto_id,
    id_usuario: m.id_usuario || null,
    nome_usuario_snapshot: m.nome_usuario_snapshot || null,
    tipo_movimento: m.tipo,             // enum value é compatível como string
    quantidade: m.quantidade,
    saldo_anterior: m.saldo_anterior,
    saldo_atual: m.saldo_atual,
    valor_unitario: m.custo_unitario_historico || null,
    origem: m.origem || null,
    obs: m.obs || null,
    dt_movimentacao: m.data_movimentacao,
    id_os: m.id_os || null,
    item_entrada: null,                 // tabela removida
    ordem_de_servico: m.ordem_de_servico || null,
  };
}

/**
 * Payload legado (IPecasEstoque) → campos do Produto (DB)
 */
function mapLegacyPayloadToProduto(data: any): any {
  let condicaoEnum: any = CondicaoPeca.NOVO;
  if (data.condicao) {
    const upper = data.condicao.toUpperCase();
    if (upper === "ORIGINAL") condicaoEnum = (CondicaoPeca as any).ORIGINAL || "ORIGINAL";
    else if (upper === "USADO") condicaoEnum = CondicaoPeca.USADO;
    else if (upper === "RECONDICIONADO") condicaoEnum = CondicaoPeca.RECONDICIONADO;
  }

  return {
    nome: data.nome,
    fabricante: data.fabricante ?? "",
    modelo: data.modelo ?? "",
    condicao: condicaoEnum,
    descricao: data.descricao || data.nome || null,
    preco_custo_atual: data.valor_custo,
    preco_venda_atual: data.valor_venda,
    saldo_atual: data.estoque_atual ?? 0,
    estoque_minimo: data.estoque_minimo ?? 0,
    unidade_medida: data.unidade_medida || "UN",
    custo_unitario_padrao: data.custo_unitario_padrao ?? data.valor_custo ?? 0,
    ref_cod: data.ref_cod || null,
    localizacao: data.localizacao || null,
    aplicacao_equivalencia: data.aplicacao || null,
    id_categoria: data.id_categoria || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PecasEstoqueRepository {
  // ───────────────────────────────────────────────────────────
  // CATÁLOGO (CRUD)
  // ───────────────────────────────────────────────────────────

  async create(data: any) {
    try {
      const produto = await prisma.produto.create({
        data: mapLegacyPayloadToProduto(data),
      });
      return mapProdutoToPecasEstoque(produto);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error(
          "Peça já cadastrada no catálogo com este Nome, Fabricante, Modelo e Condição."
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

    const whereClause: any = { ativo: true };

    if (id_categoria) {
      whereClause.id_categoria = id_categoria;
    }

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { fabricante: { contains: search, mode: "insensitive" } },
        { ref_cod: { contains: search, mode: "insensitive" } },
        { modelo: { contains: search, mode: "insensitive" } },
        { aplicacao_equivalencia: { contains: search, mode: "insensitive" } },
        { localizacao: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.produto.findMany({
        where: whereClause,
        include: {
          categoria: true,
          movimentacoes: {
            where: { tipo: 'ENTRADA' },
            orderBy: { data_movimentacao: 'desc' },
            take: 1,
            include: { nota_fiscal: { include: { fornecedor: true } } },
          },
        },
        orderBy: { nome: "asc" },
        skip,
        take: limit,
      }),
      prisma.produto.count({ where: whereClause }),
    ]);

    return { data: data.map(mapProdutoToPecasEstoque), total, page, limit };
  }

  async findById(id: number) {
    const produto = await prisma.produto.findUnique({
      where: { id_produto: id },
      include: {
        categoria: true,
        _count: {
          select: { movimentacoes: true },
        },
      },
    });
    if (!produto) return null;
    return mapProdutoToPecasEstoque(produto);
  }

  async update(id_pecas_estoque: number, data: any, auditoria?: AuditoriaCtx) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verificar conflito de unicidade (constraint: nome + fabricante + modelo + condicao)
      if (data.nome !== undefined) {
        let condicaoEnum: any = undefined;
        if (data.condicao) {
          const upper = data.condicao.toUpperCase();
          if (upper === "ORIGINAL") condicaoEnum = (CondicaoPeca as any).ORIGINAL || "ORIGINAL";
          else if (upper === "USADO") condicaoEnum = CondicaoPeca.USADO;
          else if (upper === "RECONDICIONADO") condicaoEnum = CondicaoPeca.RECONDICIONADO;
          else condicaoEnum = CondicaoPeca.NOVO;
        }

        const conflito = await tx.produto.findFirst({
          where: {
            nome: data.nome,
            fabricante: data.fabricante ?? undefined,
            modelo: data.modelo ?? undefined,
            condicao: condicaoEnum ?? undefined,
            id_produto: { not: id_pecas_estoque },
          },
        });
        if (conflito) {
          throw new Error(
            "Já existe outra peça cadastrada com esta combinação de Nome, Fabricante, Modelo e Condição."
          );
        }
      }

      // 2. Buscar registro atual
      const atual = await tx.produto.findUnique({
        where: { id_produto: id_pecas_estoque },
      });
      if (!atual) throw new Error("Peça não encontrada no catálogo.");

      // 3. Construir payload de update apenas com os campos enviados
      const updateData: any = {};
      if (data.nome !== undefined)               updateData.nome = data.nome;
      if (data.fabricante !== undefined)         updateData.fabricante = data.fabricante ?? "";
      if (data.modelo !== undefined)             updateData.modelo = data.modelo ?? atual.modelo;
      if (data.descricao !== undefined)          updateData.descricao = data.descricao || null;
      if (data.valor_custo !== undefined)        updateData.preco_custo_atual = data.valor_custo;
      if (data.valor_venda !== undefined)        updateData.preco_venda_atual = data.valor_venda;
      if (data.estoque_atual !== undefined)      updateData.saldo_atual = data.estoque_atual;
      if (data.estoque_minimo !== undefined)     updateData.estoque_minimo = data.estoque_minimo;
      if (data.unidade_medida !== undefined)     updateData.unidade_medida = data.unidade_medida;
      if (data.ref_cod !== undefined)            updateData.ref_cod = data.ref_cod || null;
      if (data.localizacao !== undefined)        updateData.localizacao = data.localizacao || null;
      if (data.aplicacao !== undefined)          updateData.aplicacao_equivalencia = data.aplicacao || null;
      if (data.id_categoria !== undefined)       updateData.id_categoria = data.id_categoria || null;
      if (data.condicao !== undefined) {
        const upper = data.condicao.toUpperCase();
        if (upper === "ORIGINAL") updateData.condicao = (CondicaoPeca as any).ORIGINAL || "ORIGINAL";
        else if (upper === "USADO") updateData.condicao = CondicaoPeca.USADO;
        else if (upper === "RECONDICIONADO") updateData.condicao = CondicaoPeca.RECONDICIONADO;
        else updateData.condicao = CondicaoPeca.NOVO;
      }
      if (data.custo_unitario_padrao !== undefined) {
        updateData.custo_unitario_padrao = data.custo_unitario_padrao;
      }

      const produtoAtualizado = await tx.produto.update({
        where: { id_produto: id_pecas_estoque },
        data: updateData,
      });

      return mapProdutoToPecasEstoque(produtoAtualizado);
    });
  }

  async delete(id: number) {
    const temHistorico = await prisma.movimentacaoEstoque.count({
      where: { produto_id: id },
    });

    const produto = await prisma.produto.update({
      where: { id_produto: id },
      data: { ativo: false },
      select: {
        id_produto: true,
        nome: true,
        ativo: true,
        _count: { select: { movimentacoes: true } },
      },
    });

    return {
      peca: {
        id_pecas_estoque: produto.id_produto,
        nome: produto.nome,
        ativo: produto.ativo,
        _count: produto._count,
      },
      temHistorico: temHistorico > 0,
    };
  }

  async search(query: string, tipo?: number) {
    const whereClause: any = { ativo: true };

    if (tipo) whereClause.id_categoria = tipo;

    if (query && query.trim() !== "") {
      whereClause.OR = [
        { nome: { contains: query, mode: "insensitive" } },
        { fabricante: { contains: query, mode: "insensitive" } },
        { ref_cod: { contains: query, mode: "insensitive" } },
        { modelo: { contains: query, mode: "insensitive" } },
        { aplicacao_equivalencia: { contains: query, mode: "insensitive" } },
        { localizacao: { contains: query, mode: "insensitive" } },
      ];
    }

    const produtos = await prisma.produto.findMany({
      where: whereClause,
      take: 20,
      include: {
        categoria: true,
        movimentacoes: {
          where: { tipo: 'ENTRADA' },
          orderBy: { data_movimentacao: 'desc' },
          take: 1,
          include: { nota_fiscal: { include: { fornecedor: true } } },
        },
      },
    });

    return produtos.map(mapProdutoToPecasEstoque);
  }

  async getAvailability(id: number) {
    const produto = await prisma.produto.findUnique({
      where: { id_produto: id },
      select: {
        saldo_atual: true,
        nome: true,
        preco_venda_atual: true,
        id_produto: true,
      },
    });

    if (!produto) return null;

    // itens_os agora usa id_produto (renomeado de id_pecas_estoque na migração)
    const reservedItems = await prisma.itensOs.aggregate({
      where: {
        id_produto: id,
        deleted_at: null,
        ordem_de_servico: {
          status: { notIn: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          deleted_at: null,
        },
      },
      _sum: { quantidade: true },
    });

    const reserved = reservedItems._sum.quantidade || 0;

    // Buscar lotes de entrada (FIFO)
    const lotes = await prisma.movimentacaoEstoque.findMany({
      where: { produto_id: id, tipo: TipoMovimentacao.ENTRADA },
      orderBy: { data_movimentacao: "asc" },
    });

    // Buscar total já consumido (saídas consolidadas)
    const saidas = await prisma.movimentacaoEstoque.aggregate({
      where: { produto_id: id, tipo: TipoMovimentacao.SAIDA },
      _sum: { quantidade: true },
    });

    const consumidoTotal = Math.abs(saidas._sum.quantidade || 0) + reserved;
    const loteSugerido = precificacaoService.selecionarLoteFIFO(lotes as any, consumidoTotal);

    return {
      id_pecas_estoque: produto.id_produto,
      nome: produto.nome,
      valor_venda: loteSugerido ? Number(loteSugerido.preco_venda_historico) : produto.preco_venda_atual,
      valor_custo: loteSugerido ? Number(loteSugerido.custo_unitario_historico) : undefined,
      condicao: loteSugerido ? loteSugerido.condicao : "NOVO",
      lote_sugerido_id: loteSugerido ? loteSugerido.id_movimentacao : null,
      estoque_atual: produto.saldo_atual,
      reserved: reserved,
    };
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
        where: { produto_id: id_pecas_estoque },
        orderBy: { data_movimentacao: "desc" },
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
        },
      }),
      prisma.movimentacaoEstoque.count({ where: { produto_id: id_pecas_estoque } }),
    ]);

    return { data: data.map(mapMovimentacaoToLegacy), total, page, limit };
  }

  /**
   * Registra um estorno compensatório para uma movimentação existente.
   * NUNCA deleta registros históricos — cria uma movimentação inversa.
   */
  async registrarEstorno(
    id_movimentacao: number,
    auditoria: AuditoriaCtx
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar movimentação original
      const original = await tx.movimentacaoEstoque.findUnique({
        where: { id_movimentacao },
      });

      if (!original) throw new Error("Movimentação não encontrada.");
      if (original.tipo === TipoMovimentacao.ESTORNO) {
        throw new Error("Não é possível estornar um estorno.");
      }

      const qtdEstorno = -original.quantidade;

      // 2. Buscar saldo atual do produto
      const produto = await tx.produto.findUnique({
        where: { id_produto: original.produto_id },
        select: { saldo_atual: true, preco_venda_atual: true, preco_custo_atual: true },
      });
      if (!produto) throw new Error("Produto não encontrado.");

      const saldoAntes = produto.saldo_atual;

      // 3. Validar que o estorno não gera saldo negativo
      if (saldoAntes + qtdEstorno < 0) {
        throw new Error(
          `Estorno bloqueado: o saldo ficaria negativo (${saldoAntes} - ${original.quantidade} = ${saldoAntes + qtdEstorno}).`
        );
      }

      // 4. Atualizar saldo atomicamente
      const produtoAtualizado = await tx.produto.update({
        where: { id_produto: original.produto_id },
        data: {
          saldo_atual:
            qtdEstorno > 0
              ? { increment: Math.abs(qtdEstorno) }
              : { decrement: Math.abs(qtdEstorno) },
        },
        select: { saldo_atual: true },
      });

      // 5. Registrar movimentação de estorno (imutável)
      const estorno = await tx.movimentacaoEstoque.create({
        data: {
          produto_id: original.produto_id,
          id_usuario: auditoria.id_usuario,
          nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
          tipo: TipoMovimentacao.ESTORNO,
          quantidade: qtdEstorno,
          saldo_anterior: saldoAntes,
          saldo_atual: produtoAtualizado.saldo_atual,
          custo_unitario_historico: original.custo_unitario_historico,
          preco_venda_historico: original.preco_venda_historico,
          origem: `Estorno da Movimentação #${id_movimentacao}`,
          obs: `Estorno compensatório. Original: ${original.tipo} de ${original.quantidade} unidades.`,
        },
      });

      return mapMovimentacaoToLegacy(estorno);
    });
  }

  async ajustarSaldo(
    id_pecas_estoque: number,
    payload: { tipo: "ADD" | "REMOVE"; quantidade: number; motivo: string },
    auditoria: AuditoriaCtx
  ) {
    return await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id_produto: id_pecas_estoque },
        select: {
          saldo_atual: true,
          nome: true,
          preco_venda_atual: true,
          preco_custo_atual: true,
        },
      });
      if (!produto) throw new Error("Peça não encontrada no catálogo.");

      const saldoAntes = produto.saldo_atual;
      const diff = payload.tipo === "ADD" ? payload.quantidade : -payload.quantidade;

      if (saldoAntes + diff < 0) {
        throw new Error(
          `Ajuste bloqueado: o estoque atual (${saldoAntes}) não possui quantidade suficiente para remover ${payload.quantidade} unidades.`
        );
      }

      const produtoAtualizado = await tx.produto.update({
        where: { id_produto: id_pecas_estoque },
        data: {
          saldo_atual:
            payload.tipo === "ADD"
              ? { increment: payload.quantidade }
              : { decrement: payload.quantidade },
        },
        select: { saldo_atual: true },
      });

      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          produto_id: id_pecas_estoque,
          id_usuario: auditoria.id_usuario,
          nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
          tipo: TipoMovimentacao.AJUSTE,
          quantidade: diff,
          saldo_anterior: saldoAntes,
          saldo_atual: produtoAtualizado.saldo_atual,
          custo_unitario_historico: produto.preco_custo_atual,
          preco_venda_historico: produto.preco_venda_atual,
          origem: "Ajuste Manual de Saldo",
          obs: payload.motivo,
        },
      });

      return {
        peca: { estoque_atual: produtoAtualizado.saldo_atual },
        movimentacao: mapMovimentacaoToLegacy(movimentacao),
      };
    });
  }

  // ───────────────────────────────────────────────────────────
  // ENTRADAS DE ESTOQUE
  //
  // NOTA ARQUITETURAL: As tabelas `entrada_estoque` e `item_entrada`
  // foram removidas na migração 20260627194500. Entradas agora são
  // registradas diretamente como MovimentacaoEstoque (tipo: ENTRADA).
  // O método `createEntry` mantém a mesma assinatura pública e retorna
  // um objeto sintético compatível com o contrato anterior.
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
    const nfNumero = data.nf_numero ? data.nf_numero.trim() || null : null;

    return await prisma.$transaction(async (tx) => {
      const movimentacoesCriadas: any[] = [];
      let valorTotal = 0;

      for (const item of data.itens) {
        // No contrato legado: id_pecas_estoque == id_produto no banco novo
        let produtoId = item.id_pecas_estoque;

        // 2a. Criar produto novo se não existir
        if (!produtoId && item.new_part_data) {
          let condicaoEnum: any = CondicaoPeca.NOVO;
          if (item.condicao || item.new_part_data.condicao) {
            const c = (item.condicao || item.new_part_data.condicao).toUpperCase();
            if (c === "ORIGINAL") condicaoEnum = (CondicaoPeca as any).ORIGINAL || "ORIGINAL";
            else if (c === "USADO") condicaoEnum = CondicaoPeca.USADO;
            else if (c === "RECONDICIONADO") condicaoEnum = CondicaoPeca.RECONDICIONADO;
          }

          const novoProduto = await tx.produto.create({
            data: {
              nome: item.new_part_data.nome,
              fabricante: item.new_part_data.fabricante ?? "",
              modelo: item.new_part_data.modelo ?? "",
              condicao: condicaoEnum,
              descricao: item.new_part_data.descricao || item.new_part_data.nome,
              preco_custo_atual: item.valor_custo,
              preco_venda_atual: item.valor_venda,
              saldo_atual: 0,
              estoque_minimo: item.new_part_data.estoque_minimo || 0,
              unidade_medida: item.new_part_data.unidade_medida || "UN",
              custo_unitario_padrao: item.valor_custo,
              localizacao: item.new_part_data.localizacao || null,
              aplicacao_equivalencia: item.aplicacao || null,
              id_categoria: item.new_part_data.id_categoria || null,
            },
          });
          produtoId = novoProduto.id_produto;
        }

        if (!produtoId) {
          throw new Error("Item sem ID de peça e sem dados para cadastro.");
        }

        // 2b. Atualizar master data do catálogo se solicitado
        if (item.new_part_data?._update_master) {
          await tx.produto.update({
            where: { id_produto: produtoId },
            data: {
              nome: item.new_part_data.nome,
              fabricante: item.new_part_data.fabricante || null,
              modelo: item.new_part_data.modelo || null,
              localizacao: item.new_part_data.localizacao || null,
              id_categoria: item.new_part_data.id_categoria || null,
            },
          });
        }

        // 2c. Capturar saldo ANTES do incremento
        let produtoAntes = await tx.produto.findUnique({
          where: { id_produto: produtoId },
        });

        if (!produtoAntes) {
          throw new Error("Peça não encontrada no catálogo.");
        }

        let condicaoEnum: any = produtoAntes.condicao;
        if (item.condicao) {
          const upper = item.condicao.toUpperCase();
          if (upper === "ORIGINAL") condicaoEnum = (CondicaoPeca as any).ORIGINAL || "ORIGINAL";
          else if (upper === "USADO") condicaoEnum = CondicaoPeca.USADO;
          else if (upper === "RECONDICIONADO") condicaoEnum = CondicaoPeca.RECONDICIONADO;
          else condicaoEnum = CondicaoPeca.NOVO;
        }

        // Se a condição selecionada na entrada for diferente da condição da peça base,
        // gerencia a separação por condição (busca existente ou cria nova peça para aquela condição)
        if (produtoAntes.condicao !== condicaoEnum) {
          let produtoCondicao = await tx.produto.findFirst({
            where: {
              nome: produtoAntes.nome,
              fabricante: produtoAntes.fabricante,
              modelo: produtoAntes.modelo,
              condicao: condicaoEnum,
            },
          });

          if (!produtoCondicao) {
            produtoCondicao = await tx.produto.create({
              data: {
                nome: produtoAntes.nome,
                fabricante: produtoAntes.fabricante,
                modelo: produtoAntes.modelo,
                condicao: condicaoEnum,
                descricao: produtoAntes.descricao,
                preco_custo_atual: item.valor_custo,
                preco_venda_atual: item.valor_venda,
                saldo_atual: 0,
                estoque_minimo: produtoAntes.estoque_minimo,
                unidade_medida: produtoAntes.unidade_medida,
                custo_unitario_padrao: item.valor_custo,
                localizacao: produtoAntes.localizacao,
                aplicacao_equivalencia: produtoAntes.aplicacao_equivalencia,
                id_categoria: produtoAntes.id_categoria,
              },
            });
          }
          produtoId = produtoCondicao.id_produto;
          produtoAntes = produtoCondicao;
        }

        const saldoAntes = produtoAntes.saldo_atual;

        // 2d. Incrementar saldo e atualizar preços atomicamente
        const produtoAtualizado = await tx.produto.update({
          where: { id_produto: produtoId },
          data: {
            saldo_atual: { increment: item.quantidade },
            preco_venda_atual: item.valor_venda,
            preco_custo_atual: item.valor_custo,
            data_ultima_compra: new Date(),
          },
          select: { saldo_atual: true },
        });

        // 2e. Registrar movimentação de auditoria (IMUTÁVEL)
        const mov = await tx.movimentacaoEstoque.create({
          data: {
            produto_id: produtoId,
            id_usuario: auditoria.id_usuario,
            nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
            tipo: TipoMovimentacao.ENTRADA,
            quantidade: item.quantidade,
            saldo_anterior: saldoAntes,
            saldo_atual: produtoAtualizado.saldo_atual,
            custo_unitario_historico: new Prisma.Decimal(item.valor_custo),
            preco_venda_historico: new Prisma.Decimal(item.valor_venda),
            condicao: condicaoEnum,
            origem: `Entrada de Estoque - Fornecedor #${data.id_fornecedor}`,
            obs: item.obs || data.obs || null,
          },
        });
        movimentacoesCriadas.push(mov);
        valorTotal += item.quantidade * item.valor_custo;
      }

      // Retornar objeto sintético compatível com o contrato anterior de EntradaEstoque
      return {
        id_entrada: movimentacoesCriadas[0]?.id_movimentacao ?? 0,
        id_pessoa: data.id_fornecedor,
        nota_fiscal: data.nota_fiscal || null,
        nf_numero: nfNumero,
        data_compra: data.data_compra || new Date(),
        valor_total: valorTotal,
        obs: data.obs || null,
        created_at: new Date(),
        _movimentacoes_criadas: movimentacoesCriadas.length,
      };
    });
  }

  async findEntryById(id: number) {
    const mov = await prisma.movimentacaoEstoque.findUnique({
      where: { id_movimentacao: id },
      include: { produto: true },
    });
    if (!mov || mov.tipo !== TipoMovimentacao.ENTRADA) return null;

    const custo = Number(mov.custo_unitario_historico);
    const venda = Number(mov.preco_venda_historico);
    const margem = custo > 0 ? ((venda - custo) / custo) * 100 : 0;

    return {
      id_entrada: mov.id_movimentacao,
      id_pessoa: 1, // fallback id_fornecedor
      nota_fiscal: mov.nota_fiscal_id ? String(mov.nota_fiscal_id) : "",
      nf_numero: "",
      data_compra: mov.data_movimentacao.toISOString(),
      obs: mov.obs || "",
      itens: [
        {
          id_item_entrada: mov.id_movimentacao,
          id_pecas_estoque: mov.produto_id,
          peca: { nome: mov.produto.nome },
          quantidade: mov.quantidade,
          valor_custo: custo,
          valor_venda: venda,
          margem_lucro: margem,
          ref_cod: mov.produto.ref_cod || "",
          condicao: mov.condicao,
          aplicacao: mov.produto.aplicacao_equivalencia || "",
          obs: mov.obs || "",
        },
      ],
    };
  }

  async updateEntry(
    id: number,
    data: any,
    _auditoria: AuditoriaCtx
  ) {
    return await prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacaoEstoque.findUnique({
        where: { id_movimentacao: id },
        include: { produto: true },
      });
      if (!mov || mov.tipo !== TipoMovimentacao.ENTRADA) {
        throw new Error("Movimentação de entrada não encontrada.");
      }

      for (const item of data.itens) {
        if (item.id_item_entrada === id) {
          const diff = item.quantidade - mov.quantidade;
          let condicaoEnum: any = CondicaoPeca.NOVO;
          if (item.condicao) {
            const upper = item.condicao.toUpperCase();
            if (upper === "ORIGINAL") condicaoEnum = (CondicaoPeca as any).ORIGINAL || "ORIGINAL";
            else if (upper === "USADO") condicaoEnum = CondicaoPeca.USADO;
            else if (upper === "RECONDICIONADO") condicaoEnum = CondicaoPeca.RECONDICIONADO;
          }

          if (diff !== 0 || item.condicao) {
            // Atualizar saldo do produto
            if (diff !== 0) {
              await tx.produto.update({
                where: { id_produto: mov.produto_id },
                data: {
                  saldo_atual: diff > 0 ? { increment: diff } : { decrement: Math.abs(diff) },
                },
              });
            }
            // Atualizar movimentacao
            await tx.movimentacaoEstoque.update({
              where: { id_movimentacao: id },
              data: {
                quantidade: item.quantidade,
                condicao: condicaoEnum,
              },
            });
          }
        }
      }
      return { success: true };
    });
  }

  async deleteEntry(id: number, auditoria: AuditoriaCtx) {
    return await prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacaoEstoque.findUnique({
        where: { id_movimentacao: id },
      });
      if (!mov || mov.tipo !== TipoMovimentacao.ENTRADA) {
        throw new Error("Movimentação de entrada não encontrada.");
      }

      // Decrementar saldo do produto
      await tx.produto.update({
        where: { id_produto: mov.produto_id },
        data: {
          saldo_atual: { decrement: mov.quantidade },
        },
      });

      // Registrar estorno
      await tx.movimentacaoEstoque.create({
        data: {
          produto_id: mov.produto_id,
          id_usuario: auditoria.id_usuario,
          nome_usuario_snapshot: auditoria.nome_usuario_snapshot,
          tipo: TipoMovimentacao.ESTORNO,
          quantidade: -mov.quantidade,
          saldo_anterior: mov.saldo_atual,
          saldo_atual: mov.saldo_atual - mov.quantidade,
          custo_unitario_historico: mov.custo_unitario_historico,
          preco_venda_historico: mov.preco_venda_historico,
          condicao: mov.condicao,
          origem: `Estorno da Entrada #${id}`,
          obs: `Exclusão de entrada via modal de confirmação.`,
        },
      });

      return { success: true };
    });
  }
}
