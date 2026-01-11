import { Request, Response } from 'express';
import { PagamentoClienteRepository } from '../repositories/pagamentoCliente.repository.js';
import { prisma } from '../prisma.js';

const repository = new PagamentoClienteRepository();

export class PagamentoClienteController {
  async create(req: Request, res: Response) {
    try {
      const { id_operadora, ...data } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
          // 1. Create PagamentoCliente
          const pagamento = await tx.pagamentoCliente.create({ data });

          // 2. If Operator selected, create Receivables
          if (id_operadora && (data.metodo_pagamento === 'CREDITO' || data.metodo_pagamento === 'DEBITO')) {
              const operadora = await tx.operadoraCartao.findUnique({ where: { id_operadora } });
              if (!operadora) throw new Error('Operadora não encontrada');

              const parcelas = data.qtd_parcelas || 1;
              const valorTotal = Number(data.valor);
              const valorParcela = valorTotal / parcelas;
              
              // Determine Rates & Deadlines
              let taxa = 0;
              let prazo = 0;
              
              if (data.metodo_pagamento === 'DEBITO') {
                  taxa = Number(operadora.taxa_debito);
                  prazo = operadora.prazo_debito;
              } else if (parcelas === 1) {
                  taxa = Number(operadora.taxa_credito_vista);
                  prazo = operadora.prazo_credito_vista;
              } else {
                  taxa = Number(operadora.taxa_credito_parc);
                  prazo = operadora.prazo_credito_parc;
              }

              // Create Receivables
              for (let i = 1; i <= parcelas; i++) {
                  // Calculate Due Date
                  // For Debit/Credit 1x: Date + Prazo
                  // For Credit Nx: Date + Prazo + (30 * (i-1))
                  let daysToAdd = prazo;
                  if (data.metodo_pagamento === 'CREDITO' && parcelas > 1) {
                       daysToAdd = prazo + (30 * (i - 1));
                  }
                  
                  const dtPrevista = new Date();
                  dtPrevista.setDate(dtPrevista.getDate() + daysToAdd);

                  const valorLiquido = valorParcela - (valorParcela * (taxa / 100));

                  await tx.recebivelCartao.create({
                      data: {
                          id_os: data.id_os,
                          id_operadora: id_operadora,
                          num_parcela: i,
                          total_parcelas: parcelas,
                          valor_bruto: valorParcela,
                          valor_liquido: valorLiquido,
                          taxa_aplicada: taxa,
                          data_venda: new Date(),
                          data_prevista: dtPrevista,
                          status: 'PENDENTE'
                      }
                  });
              }
          }
          return pagamento;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create PagamentoCliente', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pagamentos = await repository.findAll();
      res.json(pagamentos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch PagamentoClientes' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pagamento = await repository.findById(id);
      if (!pagamento) {
        return res.status(404).json({ error: 'PagamentoCliente not found' });
      }
      res.json(pagamento);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch PagamentoCliente' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pagamento = await repository.update(id, req.body);
      res.json(pagamento);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update PagamentoCliente' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete PagamentoCliente' });
    }
  }
}
