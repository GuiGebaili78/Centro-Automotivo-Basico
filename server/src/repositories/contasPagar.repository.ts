
import { prisma } from '../prisma.js';

export class ContasPagarRepository {
    async create(data: any) {
        // Formatar datas para ISO-8601 DateTime se vierem como string
        if (data.dt_vencimento) data.dt_vencimento = new Date(data.dt_vencimento);
        if (data.dt_pagamento) data.dt_pagamento = new Date(data.dt_pagamento);
        
        return prisma.contasPagar.create({ data });
    }

    async findAll() {
        return prisma.contasPagar.findMany({
            where: { deleted_at: null },
            orderBy: { dt_vencimento: 'asc' }
        });
    }

    async findById(id: number) {
        return prisma.contasPagar.findUnique({
            where: { id_conta_pagar: id }
        });
    }

    async update(id: number, data: any) {
        if (data.dt_vencimento) data.dt_vencimento = new Date(data.dt_vencimento);
        if (data.dt_pagamento) data.dt_pagamento = new Date(data.dt_pagamento);

        return prisma.contasPagar.update({
            where: { id_conta_pagar: id },
            data
        });
    }

    async delete(id: number) {
        return prisma.contasPagar.update({
            where: { id_conta_pagar: id },
            data: { deleted_at: new Date() }
        });
    }
}
