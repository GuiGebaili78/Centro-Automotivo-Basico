/**
 * PecasEstoqueController
 *
 * Responsabilidades EXCLUSIVAS:
 * 1. Validar DTOs (req.body) — retornar HTTP 400 com mensagem clara se inválido
 * 2. Capturar id_usuario e nome de req.user (injetado pelo authMiddleware)
 * 3. Extrair parâmetros de paginação de req.query
 * 4. Chamar o Repository e devolver a resposta HTTP adequada
 * 5. Interceptar erros do Repository e convertê-los em HTTP 400 ou 500
 *
 * PROIBIDO: qualquer chamada direta ao Prisma ou acesso ao banco de dados.
 */

import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  PecasEstoqueRepository,
  type AuditoriaCtx,
} from "../repositories/pecasEstoque.repository.js";

const repository = new PecasEstoqueRepository();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Extrai o contexto de auditoria do usuário autenticado via authMiddleware */
function getAuditoria(req: Request): AuditoriaCtx {
  const user = (req as any).user;
  return {
    id_usuario: user?.id_usuario ?? null,
    nome_usuario_snapshot: user?.nome ?? "Sistema",
  };
}

/**
 * Tratamento centralizado e tipado de erros.
 * - Erros do Prisma conhecidos → HTTP 400 com mensagem legível
 * - Erros de lógica de negócio (Error lançado pelo Repository) → HTTP 400
 * - Erros inesperados → HTTP 500 (sem vazar detalhes internos)
 */
function handleError(res: Response, error: unknown, contexto: string): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        res.status(400).json({
          error: "Registro duplicado. Verifique os dados e tente novamente.",
        });
        return;
      case "P2003":
        res.status(400).json({
          error:
            "Referência inválida. O fornecedor ou peça informado não existe no sistema.",
        });
        return;
      case "P2025":
        res.status(404).json({ error: "Registro não encontrado." });
        return;
      // Violação de CHECK constraint (código PostgreSQL 23514 — saldo negativo)
      case "P2010":
        res.status(400).json({
          error:
            "Operação bloqueada pelo banco de dados: o estoque da peça ficaria negativo. Verifique a quantidade disponível.",
        });
        return;
    }
    // Outros erros conhecidos do Prisma com meta.code (ex: violação de CHECK via raw)
    const pgCode = (error.meta as any)?.code;
    if (pgCode === "23514") {
      res.status(400).json({
        error:
          "Estoque insuficiente: a operação deixaria o saldo abaixo de zero. Verifique a quantidade disponível.",
      });
      return;
    }
    if (pgCode === "23503") {
      res.status(400).json({
        error:
          "Referência inválida: registro dependente não encontrado no banco de dados.",
      });
      return;
    }
  }

  // Erros de lógica de negócio lançados intencionalmente pelo Repository
  if (error instanceof Error) {
    res.status(400).json({ error: error.message });
    return;
  }

  // Apenas erros verdadeiramente inesperados chegam aqui
  console.error(`[PecasEstoqueController] Erro inesperado em ${contexto}:`, error);
  res.status(500).json({
    error: "Erro interno do servidor. Tente novamente em instantes.",
  });
}

// ─────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────

export class PecasEstoqueController {
  // ── Catálogo ──

  async create(req: Request, res: Response) {
    try {
      const { nome, descricao, valor_custo, valor_venda, estoque_atual } =
        req.body;
      if (!nome || valor_custo === undefined || valor_venda === undefined || estoque_atual === undefined) {
        return res.status(400).json({
          error: "Campos obrigatórios: nome, valor_custo, valor_venda, estoque_atual.",
        });
      }
      const peca = await repository.create(req.body);
      res.status(201).json(peca);
    } catch (error) {
      handleError(res, error, "create");
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
      const search = req.query.q as string | undefined;
      const id_categoria = req.query.tipo
        ? Number(req.query.tipo)
        : undefined;

      const result = await repository.findAll(page, limit, search, id_categoria);
      res.json(result);
    } catch (error) {
      handleError(res, error, "findAll");
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const peca = await repository.findById(id);
      if (!peca) return res.status(404).json({ error: "Peça não encontrada." });
      res.json(peca);
    } catch (error) {
      handleError(res, error, "findById");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const auditoria = getAuditoria(req);
      const peca = await repository.update(id, req.body, auditoria);
      res.json(peca);
    } catch (error) {
      handleError(res, error, "update");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const result = await repository.delete(id);
      res.status(200).json({ success: true, temHistorico: result.temHistorico });
    } catch (error) {
      handleError(res, error, "delete");
    }
  }

  async search(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      const tipo = req.query.tipo ? Number(req.query.tipo) : undefined;
      if (!query && !tipo) return res.json([]);
      const pecas = await repository.search(query, tipo);
      res.json(pecas);
    } catch (error) {
      handleError(res, error, "search");
    }
  }

  async getAvailability(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const result = await repository.getAvailability(id);
      if (!result) return res.status(404).json({ error: "Peça não encontrada." });
      res.json(result);
    } catch (error) {
      handleError(res, error, "getAvailability");
    }
  }

  // ── Histórico de Movimentações ──

  async getHistorico(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

      const result = await repository.getHistoricoByPeca(id, page, limit);
      res.json(result);
    } catch (error) {
      handleError(res, error, "getHistorico");
    }
  }

  async registrarEstorno(req: Request, res: Response) {
    try {
      const id_movimentacao = Number(req.params.id);
      if (isNaN(id_movimentacao)) {
        return res.status(400).json({ error: "ID de movimentação inválido." });
      }

      const auditoria = getAuditoria(req);
      const estorno = await repository.registrarEstorno(id_movimentacao, auditoria);
      res.status(201).json(estorno);
    } catch (error) {
      handleError(res, error, "registrarEstorno");
    }
  }

  async ajustarSaldo(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID de peça inválido." });

      const { tipo, quantidade, motivo } = req.body;
      if (tipo !== "ADD" && tipo !== "REMOVE") {
        return res.status(400).json({ error: "Tipo de ajuste deve ser 'ADD' ou 'REMOVE'." });
      }
      const qtd = Number(quantidade);
      if (isNaN(qtd) || qtd <= 0) {
        return res.status(400).json({ error: "Quantidade deve ser um número maior que zero." });
      }
      if (!motivo || typeof motivo !== "string" || motivo.trim().length === 0) {
        return res.status(400).json({ error: "Motivo/justificativa é obrigatório para realizar o ajuste." });
      }

      const auditoria = getAuditoria(req);
      const result = await repository.ajustarSaldo(id, { tipo, quantidade: qtd, motivo: motivo.trim() }, auditoria);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error, "ajustarSaldo");
    }
  }

  // ── Entradas de Estoque ──

  async createEntry(req: Request, res: Response) {
    try {
      const { id_fornecedor, itens } = req.body;

      // Validação de DTO obrigatória
      if (!id_fornecedor || isNaN(Number(id_fornecedor))) {
        return res.status(400).json({ error: "id_fornecedor é obrigatório e deve ser um número." });
      }
      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: "É obrigatório informar ao menos um item." });
      }
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        if (!item.id_pecas_estoque && !item.new_part_data) {
          return res.status(400).json({
            error: `Item ${i + 1}: deve ter id_pecas_estoque (peça existente) ou new_part_data (nova peça).`,
          });
        }
        if (!item.quantidade || item.quantidade <= 0) {
          return res.status(400).json({ error: `Item ${i + 1}: quantidade deve ser maior que zero.` });
        }
        if (item.valor_custo === undefined || item.valor_custo < 0) {
          return res.status(400).json({ error: `Item ${i + 1}: valor_custo é obrigatório.` });
        }
        if (item.valor_venda === undefined || item.valor_venda < 0) {
          return res.status(400).json({ error: `Item ${i + 1}: valor_venda é obrigatório.` });
        }
        if (item.condicao && !["ORIGINAL", "NOVO", "USADO", "RECONDICIONADO"].includes(item.condicao.toUpperCase())) {
          return res.status(400).json({ error: `Item ${i + 1}: condicao deve ser 'ORIGINAL', 'NOVO', 'USADO' ou 'RECONDICIONADO'.` });
        }
      }

      // Normalizar nf_numero
      const payload = { ...req.body };
      if (typeof payload.nf_numero === "string") {
        payload.nf_numero = payload.nf_numero.trim() || null;
      }

      const auditoria = getAuditoria(req);
      const entry = await repository.createEntry(
        { ...payload, id_fornecedor: Number(id_fornecedor) },
        auditoria
      );
      res.status(201).json(entry);
    } catch (error) {
      handleError(res, error, "createEntry");
    }
  }

  async findEntryById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const entry = await repository.findEntryById(id);
      if (!entry) {
        return res.status(404).json({ error: "Entrada de estoque não encontrada." });
      }
      res.json(entry);
    } catch (error) {
      handleError(res, error, "findEntryById");
    }
  }

  async updateEntry(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const { itens } = req.body;
      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: "É obrigatório informar ao menos um item." });
      }

      const payload = { ...req.body };
      if (typeof payload.nf_numero === "string") {
        payload.nf_numero = payload.nf_numero.trim() || null;
      }

      const auditoria = getAuditoria(req);
      const updated = await repository.updateEntry(id, payload, auditoria);
      res.json(updated);
    } catch (error) {
      handleError(res, error, "updateEntry");
    }
  }

  async deleteEntry(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido." });

      const auditoria = getAuditoria(req);
      await repository.deleteEntry(id, auditoria);
      res.status(204).send();
    } catch (error) {
      handleError(res, error, "deleteEntry");
    }
  }
}
