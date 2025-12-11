import { Router } from 'express';
import { OrdemDeServicoController } from '../controllers/ordemDeServico.controller.js';

const ordemDeServicoRoutes = Router();
const controller = new OrdemDeServicoController();

ordemDeServicoRoutes.post('/', controller.create);
ordemDeServicoRoutes.get('/', controller.findAll);
ordemDeServicoRoutes.get('/:id', controller.findById);
ordemDeServicoRoutes.put('/:id', controller.update);
ordemDeServicoRoutes.delete('/:id', controller.delete);

export { ordemDeServicoRoutes };
