
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AuditLogRepository } from './auditLog.repository.js';
import { OrdemDeServicoRepository } from './ordemDeServico.repository.js';

const auditRepo = new AuditLogRepository();
const osRepo = new OrdemDeServicoRepository();

export class ServicoMaoDeObraRepository {
  async create(data: { id_os: number; id_funcionario: number; valor: number; descricao?: string | null }) {
    const created = await prisma.servicoMaoDeObra.create({
      data: {
        id_os: data.id_os,
        id_funcionario: data.id_funcionario,
        valor: data.valor,
        descricao: data.descricao ?? null
      },
      include: { funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } } }
    });
    
    await auditRepo.create({
        tabela: 'servico_mao_de_obra',
        registro_id: created.id_servico_mao_de_obra,
        acao: 'CREATE',
        valor_novo: created
    });

    await osRepo.recalculateTotals(data.id_os);

    return created;
  }

  async findAllByOs(id_os: number) {
    return await prisma.servicoMaoDeObra.findMany({
      where: { id_os: id_os, deleted_at: null },
      include: {
        funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } }
      }
    });
  }

  async update(id: number, data: { valor?: number; descricao?: string; id_funcionario?: number }) {
    const current = await prisma.servicoMaoDeObra.findUnique({ where: { id_servico_mao_de_obra: id } });
    
    if (!current) throw new Error('Serviço não encontrado');
    // @ts-ignore - status_pagamento exists in db but type might leak outdated
    if (current.status_pagamento === 'PAGO') throw new Error('Bloqueado: Comissão já paga ao funcionário.');

    const updated = await prisma.servicoMaoDeObra.update({
      where: { id_servico_mao_de_obra: id },
      data,
      include: { funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } } }
    });

    await auditRepo.create({
        tabela: 'servico_mao_de_obra',
        registro_id: id,
        acao: 'UPDATE',
        valor_antigo: current,
        valor_novo: updated
    });

    await osRepo.recalculateTotals(updated.id_os);

    return updated;
  }

  async softDelete(id: number) {
    const current = await prisma.servicoMaoDeObra.findUnique({ where: { id_servico_mao_de_obra: id } });
    if (!current) throw new Error('Serviço não encontrado');
    // @ts-ignore
    if (current.status_pagamento === 'PAGO') throw new Error('Bloqueado: Comissão já paga ao funcionário.');

    const updated = await prisma.servicoMaoDeObra.update({
        where: { id_servico_mao_de_obra: id },
        data: { deleted_at: new Date() }
    });

    await auditRepo.create({
        tabela: 'servico_mao_de_obra',
        registro_id: id,
        acao: 'SOFT_DELETE',
        valor_antigo: current
    });

    await osRepo.recalculateTotals(current.id_os);
    
    return updated;
  }
}
