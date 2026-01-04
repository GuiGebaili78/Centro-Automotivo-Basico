import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAll = async (req: Request, res: Response) => {
    try {
        const registros = await prisma.livroCaixa.findMany({
            orderBy: { dt_movimentacao: 'desc' }
        });
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar livro caixa' });
    }
};

export const create = async (req: Request, res: Response) => {
    try {
        const { descricao, valor, tipo_movimentacao, categoria } = req.body;
        const registro = await prisma.livroCaixa.create({
            data: { descricao, valor, tipo_movimentacao, categoria }
        });
        res.status(201).json(registro);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar registro' });
    }
};
