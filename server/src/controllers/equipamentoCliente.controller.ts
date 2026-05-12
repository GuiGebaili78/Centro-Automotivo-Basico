import { Request, Response } from 'express';
import { EquipamentoClienteRepository } from '../repositories/equipamentoCliente.repository.js';

const repository = new EquipamentoClienteRepository();

export class EquipamentoClienteController {
  async create(req: Request, res: Response) {
    try {
      const equip = await repository.create(req.body);
      res.status(201).json(equip);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const equips = await repository.findAll();
      res.json(equips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const equip = await repository.findById(Number(req.params.id));
      if (!equip) {
        return res.status(404).json({ error: 'Equipamento não encontrado' });
      }
      res.json(equip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async findByClienteId(req: Request, res: Response) {
    try {
      const equips = await repository.findByClienteId(Number(req.params.id));
      res.json(equips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const equip = await repository.update(Number(req.params.id), req.body);
      res.json(equip);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await repository.delete(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
