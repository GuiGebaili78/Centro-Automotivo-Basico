import { Request, Response } from 'express';
import { RecebivelCartaoRepository } from '../repositories/recebivelCartao.repository.js';

const repository = new RecebivelCartaoRepository();

export class RecebivelCartaoController {
  async create(req: Request, res: Response) {
    try {
      const recebivel = await repository.create(req.body);
      res.status(201).json(recebivel);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Recebível', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const recebiveis = await repository.findAll();
      res.json(recebiveis);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Recebíveis' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const recebivel = await repository.findById(id);
      if (!recebivel) {
        return res.status(404).json({ error: 'Recebível not found' });
      }
      res.json(recebivel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Recebível' });
    }
  }

  async findByOperadora(req: Request, res: Response) {
    try {
      const idOperadora = Number(req.params.idOperadora);
      const recebiveis = await repository.findByOperadora(idOperadora);
      res.json(recebiveis);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Recebíveis by Operadora' });
    }
  }

  async findByStatus(req: Request, res: Response) {
    try {
      const { status } = req.params;
      const recebiveis = await repository.findByStatus(status);
      res.json(recebiveis);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Recebíveis by Status' });
    }
  }

  async findByDateRange(req: Request, res: Response) {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
      }

      // Ensure full day coverage by setting hours
      const start = new Date(dataInicio as string);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dataFim as string);
      end.setHours(23, 59, 59, 999);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Datas inválidas fornecidas' });
      }
      
      console.log(`Buscando recebíveis de ${start.toISOString()} até ${end.toISOString()}`);

      const recebiveis = await repository.findByDateRange(start, end);
      res.json(recebiveis);
    } catch (error) {
      console.error('Error in findByDateRange:', error); 
      res.status(500).json({ error: 'Failed to fetch Recebíveis by Date Range' });
    }
  }

  async confirmarRecebimento(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { confirmadoPor } = req.body;
      
      const recebivel = await repository.confirmarRecebimento(id, confirmadoPor || 'Sistema');
      res.json(recebivel);
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to confirm Recebível', details: error.message });
    }
  }

  async estornarRecebimento(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const recebivel = await repository.estornarRecebimento(id);
      res.json(recebivel);
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to reverse Recebível', details: error.message });
    }
  }

  async getResumo(req: Request, res: Response) {
    try {
      const resumo = await repository.getResumo();
      res.json(resumo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Resumo' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const recebivel = await repository.update(id, req.body);
      res.json(recebivel);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Recebível' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Recebível' });
    }
  }

  async confirmarRecebimentoLote(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'IDs inválidos' });
      }

      const confirmadoPor = req.body.confirmadoPor || 'Sistema';
      const resultados = await repository.confirmarRecebimentoLote(ids, confirmadoPor);
      
      res.json({ 
        message: `${resultados.length} recebimento(s) confirmado(s) com sucesso`,
        resultados 
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: 'Failed to confirm Recebíveis', 
        details: error.message 
      });
    }
  }
}
