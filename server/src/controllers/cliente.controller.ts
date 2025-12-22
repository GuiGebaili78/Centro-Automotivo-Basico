import { Request, Response } from 'express';
import { ClienteRepository } from '../repositories/cliente.repository.js';

const repository = new ClienteRepository();

export class ClienteController {
  async create(req: Request, res: Response) {
    console.log('🔵 ClienteController.create - Received request');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const cliente = await repository.create(req.body);
      console.log('✅ ClienteController.create - Success:', cliente.id_cliente);
      res.status(201).json(cliente);
    } catch (error: any) {
      console.error('❌ ClienteController.create - Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      res.status(400).json({ error: 'Failed to create Cliente', details: error.message });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const clientes = await repository.findAll();
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Clientes' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const cliente = await repository.findById(id);
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente not found' });
      }
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Cliente' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const cliente = await repository.update(id, req.body);
      res.json(cliente);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Cliente' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Cliente' });
    }
  }

  async searchByName(req: Request, res: Response) {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name query parameter is required' });
      }
      const clientes = await repository.searchByName(name);
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search Clientes' });
    }
  }
}
