
import { prisma } from '../prisma.js';

export class ContasPagarRepository {
    async create(data: any) {
        console.log('[ContasPagarRepo] Creating:', data);
        
        // Helper para normalizar datas para Meio-Dia UTC (Garante fidelidade do dia no Fuso BRT)
        // Evita que 00:00 UTC vire 21:00 do dia anterior.
        const normalizeDate = (dateInfo: any) => {
             if (!dateInfo) return null;
             const dt = new Date(dateInfo);
             dt.setUTCHours(12, 0, 0, 0);
             return dt;
        };

        if (data.dt_vencimento) data.dt_vencimento = normalizeDate(data.dt_vencimento);
        if (data.dt_pagamento) data.dt_pagamento = normalizeDate(data.dt_pagamento);
        
        return prisma.$transaction(async (tx) => {
            const created = await tx.contasPagar.create({ data });
            console.log('[ContasPagarRepo] Created Status:', created.status);

            // Se já nascer PAGO, lança no caixa
            if (created.status === 'PAGO') {
                console.log('[ContasPagarRepo] Auto-launching Livro Caixa for Create');
                
                 // Smart Date Logic for Livro Caixa
                 let movimentoDate = new Date();
                 if (data.dt_pagamento) {
                     const pgDate = new Date(data.dt_pagamento);
                     const now = new Date();
                     const isSameDay = pgDate.toISOString().split('T')[0] === now.toISOString().split('T')[0]; 
                     if (!isSameDay) movimentoDate = pgDate; 
                 }

                await tx.livroCaixa.create({
                    data: {
                        descricao: `Conta: ${created.descricao}`,
                        valor: created.valor,
                        tipo_movimentacao: 'SAIDA',
                        categoria: created.categoria || 'DESPESAS GERAIS',
                        dt_movimentacao: movimentoDate,
                        origem: 'AUTOMATICA',
                        obs: `Referente à conta a pagar #${created.id_conta_pagar}`
                    }
                });
            }
            return created;
        });
    }

    // ... findAll / findById ...
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
        console.log(`[ContasPagarRepo] Updating ID ${id} with:`, data);
        
        // Redefinindo o helper aqui ou usando lógica direta para manter o arquivo limpo se não extraí pra fora da classe
        const normalizeDate = (dateInfo: any) => {
             if (!dateInfo) return null;
             const dt = new Date(dateInfo);
             dt.setUTCHours(12, 0, 0, 0);
             return dt;
        };

        if (data.dt_vencimento) data.dt_vencimento = normalizeDate(data.dt_vencimento);
        if (data.dt_pagamento) data.dt_pagamento = normalizeDate(data.dt_pagamento);

        // ... dentro de update ...
        // Checar estado anterior
        const current = await prisma.contasPagar.findUnique({ where: { id_conta_pagar: id } });
        console.log(`[ContasPagarRepo] Current status: ${current?.status}, New status: ${data.status}`);
        
        const isPayingNow = current?.status !== 'PAGO' && data.status === 'PAGO';
        console.log('[ContasPagarRepo] Is Paying Now?', isPayingNow);

        return prisma.$transaction(async (tx) => {
            const updated = await tx.contasPagar.update({
                where: { id_conta_pagar: id },
                data: { ...data } // Ensure we pass the modified data object with fixed dates
            });

            if (isPayingNow) {
                 console.log('[ContasPagarRepo] Auto-launching Livro Caixa for Update');
                 
                 // Smart Date Logic for Livro Caixa
                 // Se data.dt_pagamento existe (foi processada para 12h ou veio no payload)
                 // Verificamos se é "HOJE". Se for, usamos AGORA (pra ter hora certa).
                 // Se não, usamos a data processada (12h) para garantir o dia.
                 let movimentoDate = new Date();
                 if (data.dt_pagamento) {
                     const pgDate = new Date(data.dt_pagamento);
                     const now = new Date();
                     // Check if same day (ignoring time)
                     const isSameDay = pgDate.toISOString().split('T')[0] === now.toISOString().split('T')[0]; // Crude check but works for simplified UTC comparison logic established
                     
                     if (!isSameDay) {
                         movimentoDate = pgDate; // Use the 12:00 UTC date
                     }
                     // If it IS same day, we stick with 'movimentoDate = new Date()' to capture exact current time
                 }

                 await tx.livroCaixa.create({
                    data: {
                        descricao: `Conta: ${updated.descricao}`,
                        valor: updated.valor,
                        tipo_movimentacao: 'SAIDA',
                        categoria: updated.categoria || 'DESPESAS GERAIS',
                        dt_movimentacao: movimentoDate,
                        origem: 'AUTOMATICA',
                        obs: `Referente à conta a pagar #${updated.id_conta_pagar}`
                    }
                });
            }

            return updated;
        });
    }

    async delete(id: number) {
        return prisma.contasPagar.update({
            where: { id_conta_pagar: id },
            data: { deleted_at: new Date() }
        });
    }
}
