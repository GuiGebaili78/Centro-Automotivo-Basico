import { Request, Response } from "express";
import { RepomEstoqueUseCase } from "../usecases/estoque/RepomEstoqueUseCase.js";
import { SincronizarNotaFiscalUseCase } from "../usecases/estoque/SincronizarNotaFiscalUseCase.js";
import { ProdutoRepository } from "../repositories/produto.repository.js";
import { MovimentacaoEstoqueRepository } from "../repositories/movimentacaoEstoque.repository.js";
import { AppError } from "../errors/AppError.js";

export class EstoqueController {
  private repomEstoqueUseCase: RepomEstoqueUseCase;
  private sincronizarNotaFiscalUseCase: SincronizarNotaFiscalUseCase;
  private produtoRepository: ProdutoRepository;
  private movimentacaoEstoqueRepository: MovimentacaoEstoqueRepository;

  constructor() {
    this.repomEstoqueUseCase = new RepomEstoqueUseCase();
    this.sincronizarNotaFiscalUseCase = new SincronizarNotaFiscalUseCase();
    this.produtoRepository = new ProdutoRepository();
    this.movimentacaoEstoqueRepository = new MovimentacaoEstoqueRepository();
  }

  /**
   * Entrada de Reposição de Estoque em Lote (Bulk Insert)
   */
  async repomEstoque(req: Request, res: Response): Promise<Response> {
    try {
      const resultado = await this.repomEstoqueUseCase.executar(req.body);
      return res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ erro: error.message });
      }
      return res.status(500).json({ erro: "Falha interna no servidor.", detalhes: error?.message });
    }
  }

  /**
   * Sincronização Tardia de Nota Fiscal
   */
  async sincronizarNotaFiscal(req: Request, res: Response): Promise<Response> {
    try {
      const resultado = await this.sincronizarNotaFiscalUseCase.executar(req.body);
      return res.status(200).json(resultado);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ erro: error.message });
      }
      return res.status(500).json({ erro: "Falha interna no servidor.", detalhes: error?.message });
    }
  }

  /**
   * Busca Global de Produtos no Catálogo
   */
  async buscarGlobal(req: Request, res: Response): Promise<Response> {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        throw new AppError("O parâmetro de busca 'query' é obrigatório e deve ser uma string.", 400);
      }

      const produtos = await this.produtoRepository.buscarGlobal(query);
      return res.status(200).json(produtos);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ erro: error.message });
      }
      return res.status(500).json({ erro: "Falha interna no servidor.", detalhes: error?.message });
    }
  }

  /**
   * Busca de Movimentações por Número de Nota Fiscal (Tela de Pagamentos)
   */
  async buscarPorNotaFiscal(req: Request, res: Response): Promise<Response> {
    try {
      const { numero } = req.params;
      if (!numero) {
        throw new AppError("O número da Nota Fiscal é obrigatório.", 400);
      }

      const movimentacoes = await this.movimentacaoEstoqueRepository.buscarPorNumeroNotaFiscal(numero);
      return res.status(200).json(movimentacoes);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ erro: error.message });
      }
      return res.status(500).json({ erro: "Falha interna no servidor.", detalhes: error?.message });
    }
  }
}
