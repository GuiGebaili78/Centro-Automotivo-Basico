import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AuditLogRepository } from './auditLog.repository.js';
import { OrdemDeServicoRepository } from './ordemDeServico.repository.js';

const auditRepo = new AuditLogRepository();
const osRepo = new OrdemDeServicoRepository();

export class ItensOsRepository {
  async create(data: Prisma.ItensOsCreateInput, extraData?: { id_fornecedor?: number | null, custo_real?: number }) {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.itensOs.create({
        data,
      });
      
      await auditRepo.create({
          tabela: 'itens_os',
          registro_id: created.id_iten,
          acao: 'CREATE',
          valor_novo: created
      });

      // Se for uma peça externa (não vinda do estoque e não interna), cria registro de PagamentoPeca imediatamente
      const isFromStock = !!data.pecas_estoque?.connect;
      if (!isFromStock && !data.is_interno) {
        await tx.pagamentoPeca.create({
          data: {
            id_item_os: created.id_iten,
            id_pessoa: extraData?.id_fornecedor || null,
            custo_real: extraData?.custo_real || 0,
            data_compra: new Date(),
            pago_ao_fornecedor: false,
          }
        });
      }

      // Recalculate OS totals
      await osRepo.recalculateTotals(created.id_os, tx);
      
      return created;
    });
  }

  async findAll(includeInternal: boolean = false) {
    return await prisma.itensOs.findMany({
        where: { 
          deleted_at: null,
          ...(includeInternal ? {} : { is_interno: false })
        },
        include: { ordem_de_servico: true, pecas_estoque: true, pagamentos_peca: true }
    });
  }

  async findById(id: number) {
    return await prisma.itensOs.findUnique({
      where: { id_iten: id },
        include: { ordem_de_servico: true, pecas_estoque: true, pagamentos_peca: true }
    });
  }

  async findByOsId(idOs: number, includeInternal: boolean = false) {
    return await prisma.itensOs.findMany({
      where: { 
        id_os: idOs, 
        deleted_at: null,
        ...(includeInternal ? {} : { is_interno: false })
      },
      include: { pecas_estoque: true, pagamentos_peca: true }
    });
  }

  async update(id: number, data: Prisma.ItensOsUpdateInput, extraData?: { id_fornecedor?: number | null, custo_real?: number }) {
    return await prisma.$transaction(async (tx) => {
      const current = await this.findById(id); // Using global prisma for find is ok here since it's just reading
      const updated = await tx.itensOs.update({
        where: { id_iten: id },
        data,
      });

      await auditRepo.create({
          tabela: 'itens_os',
          registro_id: id,
          acao: 'UPDATE',
          valor_antigo: current,
          valor_novo: updated
      });

      if (extraData && extraData.id_fornecedor !== undefined) {
          const existingPayments = await tx.pagamentoPeca.findMany({ where: { id_item_os: id } });
          
          if (existingPayments && existingPayments.length > 0) {
              if (extraData.id_fornecedor) {
                  const updateData: any = { id_pessoa: extraData.id_fornecedor };
                  if (extraData.custo_real !== undefined) updateData.custo_real = extraData.custo_real;
                  
                  await tx.pagamentoPeca.update({
                      where: { id_pagamento_peca: existingPayments[0]!.id_pagamento_peca },
                      data: updateData
                  });
              } else {
                  await tx.pagamentoPeca.update({
                      where: { id_pagamento_peca: existingPayments[0]!.id_pagamento_peca },
                      data: { id_pessoa: null }
                  });
              }
          } else if (extraData.id_fornecedor) {
              await tx.pagamentoPeca.create({
                data: {
                  id_item_os: id,
                  id_pessoa: extraData.id_fornecedor,
                  custo_real: extraData.custo_real || 0,
                  data_compra: new Date(),
                  pago_ao_fornecedor: false,
                }
              });
          }
      }

      // Recalculate OS totals
      await osRepo.recalculateTotals(updated.id_os, tx);

      return updated;
    });
  }

  async delete(id: number) {
    const current = await this.findById(id);
    if (!current) throw new Error('Item not found');

    const hasPaidPayment = current.pagamentos_peca?.some((p) => p.pago_ao_fornecedor && !p.deleted_at);
    if (hasPaidPayment) {
      throw new Error("A peça já foi paga ao fornecedor. Estorne o pagamento antes de removê-la da OS.");
    }

    // Soft-delete unpaid payments associated with this item to prevent orphans
    await prisma.pagamentoPeca.updateMany({
      where: { id_item_os: id, pago_ao_fornecedor: false, deleted_at: null },
      data: { deleted_at: new Date() }
    });

    const updated = await prisma.itensOs.update({
      where: { id_iten: id },
      data: { deleted_at: new Date() }
    });

    await auditRepo.create({
        tabela: 'itens_os',
        registro_id: id,
        acao: 'SOFT_DELETE',
        valor_antigo: current
    });
    
    // Recalculate OS totals
    await osRepo.recalculateTotals(current.id_os);

    return updated;
  }

  async search(query: string) {
    // Busca descrições únicas na tabela de itens já usados
    return await prisma.itensOs.findMany({
      where: {
        descricao: { contains: query, mode: 'insensitive' },
        deleted_at: null
      },
      distinct: ['descricao'],
      take: 10
    });
  }
}
