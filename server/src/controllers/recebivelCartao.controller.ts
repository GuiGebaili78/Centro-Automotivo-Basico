import { Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const getAll = async (req: Request, res: Response) => {
    try {
        const { status, startDate, endDate } = req.query;
        
        const where: any = {};
        if (status) where.status = String(status);
        if (startDate && endDate) {
            where.data_prevista = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }

        const recebiveis = await prisma.recebivelCartao.findMany({
            where,
            include: { operadora: true, ordem_de_servico: true },
            orderBy: { data_prevista: 'asc' }
        });
        res.json(recebiveis);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar recebíveis' });
    }
};

export const confirmarRecebimento = async (req: Request, res: Response) => {
    const { ids } = req.body; // Array of IDs
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'IDs inválidos' });
    }

    try {
        // Transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            const recebiveis = await tx.recebivelCartao.findMany({
                where: { id_recebivel: { in: ids } },
                include: { operadora: true }
            });

            for (const r of recebiveis) {
                if (r.status === 'RECEBIDO') continue;

                // 1. Update Recebivel Status
                await tx.recebivelCartao.update({
                    where: { id_recebivel: r.id_recebivel },
                    data: { 
                        status: 'RECEBIDO',
                        data_recebimento: new Date()
                    }
                });

                // 2. Add to Livro Caixa
                await tx.livroCaixa.create({
                    data: {
                        descricao: `Recebimento Cartão - OS #${r.id_os || '?'} (${r.operadora.nome})`,
                        valor: r.valor_liquido,
                        tipo_movimentacao: 'ENTRADA',
                        categoria: 'VENDA',
                        origem: 'AUTOMATICA',
                        id_conta_bancaria: r.operadora.id_conta_destino
                    }
                });

                // 3. Update Account Balance
                await tx.contaBancaria.update({
                    where: { id_conta: r.operadora.id_conta_destino },
                    data: {
                        saldo_atual: { increment: r.valor_liquido }
                    }
                });
            }
        });

        res.json({ message: 'Recebimentos confirmados e conciliados.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao confirmar recebimentos' });
    }
};
