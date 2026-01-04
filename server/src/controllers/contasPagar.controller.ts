
import { Request, Response } from 'express';
import { ContasPagarRepository } from '../repositories/contasPagar.repository.js';

const repository = new ContasPagarRepository();

export const createConta = async (req: Request, res: Response) => {
    try {
        const conta = await repository.create(req.body);
        res.status(201).json(conta);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao criar conta a pagar' });
    }
};

export const getContas = async (req: Request, res: Response) => {
    try {
        const contas = await repository.findAll();
        res.json(contas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contas' });
    }
};

export const getContaById = async (req: Request, res: Response) => {
    try {
        const conta = await repository.findById(Number(req.params.id));
        if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
        res.json(conta);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar conta' });
    }
};

export const updateConta = async (req: Request, res: Response) => {
    try {
        const conta = await repository.update(Number(req.params.id), req.body);
        res.json(conta);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar conta' });
    }
};

export const deleteConta = async (req: Request, res: Response) => {
    try {
        await repository.delete(Number(req.params.id));
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: 'Erro ao deletar conta' });
    }
};
