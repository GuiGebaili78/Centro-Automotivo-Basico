import { Router } from 'express';
import { FechamentoFinanceiroController } from '../controllers/fechamentoFinanceiro.controller.js';

const fechamentoFinanceiroRoutes = Router();
const controller = new FechamentoFinanceiroController();

fechamentoFinanceiroRoutes.post('/', controller.create);
fechamentoFinanceiroRoutes.get('/', controller.findAll);
fechamentoFinanceiroRoutes.get('/:id', controller.findById);
fechamentoFinanceiroRoutes.put('/:id', controller.update);
fechamentoFinanceiroRoutes.delete('/:id', controller.delete);

export { fechamentoFinanceiroRoutes };
