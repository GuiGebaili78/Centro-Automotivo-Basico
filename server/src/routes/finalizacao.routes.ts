import { Router } from 'express';
import { FinalizacaoController } from '../controllers/finalizacao.controller.js';

const finalizacaoRoutes = Router();
const controller = new FinalizacaoController();

finalizacaoRoutes.post('/', controller.create);
finalizacaoRoutes.get('/', controller.findAll);
finalizacaoRoutes.get('/:id', controller.findById);
finalizacaoRoutes.put('/:id', controller.update);
finalizacaoRoutes.delete('/:id', controller.delete);

export { finalizacaoRoutes };
