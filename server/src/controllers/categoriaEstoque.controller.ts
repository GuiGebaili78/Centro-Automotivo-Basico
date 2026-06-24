import { Request, Response } from 'express';
import { CategoriaEstoqueRepository } from '../repositories/categoriaEstoque.repository.js';

const repository = new CategoriaEstoqueRepository();

export class CategoriaEstoqueController {
  async findAll(req: Request, res: Response) {
    try {
      const categorias = await repository.findAll();
      res.json(categorias);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { nome } = req.body;
      if (!nome) {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório' });
      }
      const categoria = await repository.create({ nome });
      res.status(201).json(categoria);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message || 'Erro ao criar categoria' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome } = req.body;
      if (!nome) {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório' });
      }
      const categoria = await repository.update(Number(id), { nome });
      res.json(categoria);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message || 'Erro ao atualizar categoria' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { replacementCategory } = req.body;

      let replacementId: number | undefined;
      if (replacementCategory) {
        // Find replacement ID by name
        const rep = await repository.findAll().then(cats => cats.find(c => c.nome === replacementCategory));
        if (rep) replacementId = rep.id_categoria;
      }

      await repository.delete(Number(id), replacementId);
      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes("Escolha uma categoria substituta")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(400).json({ error: error.message || 'Erro ao deletar categoria' });
    }
  }
}
