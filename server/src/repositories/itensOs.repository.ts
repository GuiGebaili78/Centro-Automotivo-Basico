import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AuditLogRepository } from './auditLog.repository.js';
import { OrdemDeServicoRepository } from './ordemDeServico.repository.js';

const auditRepo = new AuditLogRepository();
const osRepo = new OrdemDeServicoRepository();

export class ItensOsRepository {
  async create(data: Prisma.ItensOsCreateInput) {
    const created = await prisma.itensOs.create({
      data,
    });
    
    await auditRepo.create({
        tabela: 'itens_os',
        registro_id: created.id_iten,
        acao: 'CREATE',
        valor_novo: created
    });

    // Criar PagamentoPeca sem fornecedor vinculado
    // Se for peça de estoque interno, o frontend já não permite edição de fornecedor,
    // mas deixamos criado para manter o padrão de relacionamento.
    await prisma.pagamentoPeca.create({
      data: {
        id_item_os: created.id_iten,
        id_pessoa: null,
        custo_real: 0,
        data_compra: new Date(),
        pago_ao_fornecedor: false,
      }
    });

    // Recalculate OS totals
    await osRepo.recalculateTotals(created.id_os);
    
    return created;
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

  async update(id: number, data: Prisma.ItensOsUpdateInput) {
    const current = await this.findById(id);
    const updated = await prisma.itensOs.update({
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
    
    // Recalculate OS totals
    await osRepo.recalculateTotals(updated.id_os);

    return updated;
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
