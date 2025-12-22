import { Router } from 'express';
import { PagamentoClienteController } from '../controllers/pagamentoCliente.controller.js';

const pagamentoClienteRoutes = Router();
const controller = new PagamentoClienteController();

pagamentoClienteRoutes.post('/', controller.create);
pagamentoClienteRoutes.get('/', controller.findAll);
pagamentoClienteRoutes.get('/:id', controller.findById);
pagamentoClienteRoutes.put('/:id', controller.update);
pagamentoClienteRoutes.delete('/:id', controller.delete);

export { pagamentoClienteRoutes };
