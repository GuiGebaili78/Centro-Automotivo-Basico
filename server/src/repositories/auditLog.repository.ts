import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class AuditLogRepository {
  async create(data: {
    tabela: string;
    registro_id: number;
    acao: 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE';
    valor_antigo?: any;
    valor_novo?: any;
    usuario_id?: number;
  }) {
    return await prisma.auditLog.create({
      data: {
        tabela: data.tabela,
        registro_id: data.registro_id,
        acao: data.acao,
        valor_antigo: data.valor_antigo ? JSON.stringify(data.valor_antigo) : null,
        valor_novo: data.valor_novo ? JSON.stringify(data.valor_novo) : null,
        usuario_id: data.usuario_id || null, // Optional for now
      }
    });
  }
}
