import { Request, Response } from 'express';
import { ItensOsRepository } from '../repositories/itensOs.repository.js';
import { PagamentoPecaRepository } from '../repositories/pagamentoPeca.repository.js';

const repository = new ItensOsRepository();
const pagamentoRepository = new PagamentoPecaRepository();

export class ItensOsController {
  async create(req: Request, res: Response) {
    try {
      const { id_fornecedor, custo_real, ...itemData } = req.body;
      const item = await repository.create(itemData);
      
      if (id_fornecedor) {
          await pagamentoRepository.create({
              item_os: { connect: { id_iten: item.id_iten } },
              fornecedor: { connect: { id_fornecedor: Number(id_fornecedor) } },
              custo_real: custo_real ? Number(custo_real) : 0,
              data_compra: new Date(),
              pago_ao_fornecedor: false
          });
      }

      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Item OS', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const itens = await repository.findAll();
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Itens OS' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const item = await repository.findById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item OS not found' });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Item OS' });
    }
  }

  async findByOsId(req: Request, res: Response) {
    try {
      const idOs = Number(req.params.idOs);
      const itens = await repository.findByOsId(idOs);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Itens for OS' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { id_fornecedor, custo_real, ...itemData } = req.body;
      
      const item = await repository.update(id, itemData);

      if (id_fornecedor !== undefined) {
          // Check if payment record exists
          const existingPayments = await pagamentoRepository.findByItemId(id);
          
          if (existingPayments && existingPayments.length > 0) {
              if (id_fornecedor) {
                  const updateData: any = {
                      fornecedor: { connect: { id_fornecedor: Number(id_fornecedor) } }
                  };
                  if (custo_real) {
                      updateData.custo_real = Number(custo_real);
                  }
                  
                  await pagamentoRepository.update(existingPayments[0]!.id_pagamento_peca, updateData);
              } else {
                  // If cleared, delete the payment record
                  await pagamentoRepository.delete(existingPayments[0]!.id_pagamento_peca);
              }
          } else if (id_fornecedor) {
              // Create new if strictly provided
              await pagamentoRepository.create({
                  item_os: { connect: { id_iten: id } },
                  fornecedor: { connect: { id_fornecedor: Number(id_fornecedor) } },
                  custo_real: custo_real ? Number(custo_real) : 0,
                  data_compra: new Date(),
                  pago_ao_fornecedor: false
              });
          }
      }

      res.json(item);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to update Item OS' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Item OS' });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) return res.json([]);
      const itens = await repository.search(query);
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search Item OS descriptions' });
    }
  }
}
