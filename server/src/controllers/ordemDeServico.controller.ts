import { Request, Response } from 'express';
import { OrdemDeServicoRepository } from '../repositories/ordemDeServico.repository.js';

const repository = new OrdemDeServicoRepository();

export class OrdemDeServicoController {
  async create(req: Request, res: Response) {
    try {
      const os = await repository.create(req.body);
      res.status(201).json(os);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create OS', details: error });
    }
  }

  async createUnified(req: Request, res: Response) {
    try {
        const result = await repository.createUnified(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Unified Create Error:', error);
        res.status(400).json({ error: 'Failed to create OS Unified', details: error instanceof Error ? error.message : error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const oss = await repository.findAll();
      res.json(oss);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch OSs' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const os = await repository.findById(id);
      if (!os) {
        return res.status(404).json({ error: 'OS not found' });
      }
      res.json(os);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch OS' });
    }
  }

  async findByVehicleId(req: Request, res: Response) {
    try {
      const vehicleId = Number(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ error: 'Invalid Vehicle ID' });
      }
      const oss = await repository.findByVehicleId(vehicleId);
      res.json(oss);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch OSs for vehicle' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      // STOCK MANAGEMENT LOGIC
      if (req.body.status) {
          const current = await repository.findById(id);
          if (current) {
               const oldStatus = current.status;
               const newStatus = req.body.status;
               
               const closedStatuses = ['PRONTO PARA FINANCEIRO', 'FINALIZADA', 'PAGA_CLIENTE'];
               const isClosing = closedStatuses.includes(newStatus);
               const wasClosed = closedStatuses.includes(oldStatus);
               
               // If moving TO closed state FROM open state -> DEDUCT
               if (isClosing && !wasClosed) {
                   await repository.adjustStockForOS(id, 'DEDUCT');
               } 
               // If moving FROM closed state TO open state -> RETURN
               else if (!isClosing && wasClosed) {
                   await repository.adjustStockForOS(id, 'RETURN');
               }
          }
      }

      const os = await repository.update(id, req.body);
      res.json(os);
    } catch (error) {
      console.error('Update OS Error:', error);
      res.status(400).json({ error: 'Failed to update OS', details: error instanceof Error ? error.message : error });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete OS' });
    }
  }
}
