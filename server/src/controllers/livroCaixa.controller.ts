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
        const { descricao, valor, tipo_movimentacao, categoria, obs, origem } = req.body;
        const registro = await prisma.livroCaixa.create({
            data: { 
                descricao, 
                valor, 
                tipo_movimentacao, 
                categoria,
                obs,
                origem: origem || 'MANUAL'
            }
        });
        res.status(201).json(registro);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar registro' });
    }
};

export const update = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { descricao, valor, tipo_movimentacao, categoria, obs } = req.body;
        const registro = await prisma.livroCaixa.update({
            where: { id_livro_caixa: Number(id) },
            data: { descricao, valor, tipo_movimentacao, categoria, obs }
        });
        res.json(registro);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar registro' });
    }
};

export const softDelete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { obs } = req.body;
    try {
        const registro = await prisma.livroCaixa.update({
             where: { id_livro_caixa: Number(id) },
             data: { 
                 deleted_at: new Date(),
                 obs: obs // Update obs if provided
             }
        });
        res.json(registro);
    } catch (error) {
         res.status(500).json({ error: 'Erro ao deletar registro' });
    }
};
