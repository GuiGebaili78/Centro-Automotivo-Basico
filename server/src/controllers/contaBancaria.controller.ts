import { Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const getAll = async (req: Request, res: Response) => {
    try {
        const contas = await prisma.contaBancaria.findMany({
            orderBy: { id_conta: 'asc' }
        });
        res.json(contas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contas' });
    }
};

export const create = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const conta = await prisma.contaBancaria.create({ data });
        res.status(201).json(conta);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

export const update = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = req.body;
        const conta = await prisma.contaBancaria.update({
            where: { id_conta: Number(id) },
            data
        });
        res.json(conta);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
};

export const remove = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Soft delete logic can be added, but user asked for "Ativo/Inativo" status mostly.
        // For now, let's use the 'ativo' flag update as a soft delete or just toggle.
        // Or if real delete is needed:
        // await prisma.contaBancaria.delete({ where: { id_conta: Number(id) } });
        // But let's check if 'ativo' is enough.
        
        const conta = await prisma.contaBancaria.update({
            where: { id_conta: Number(id) },
            data: { ativo: false }
        });
        res.json(conta);
    } catch (error) {
         res.status(500).json({ error: 'Erro ao desativar conta' });
    }
};
