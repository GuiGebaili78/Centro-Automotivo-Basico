import { Router } from 'express';
import { PecasEstoqueController } from '../controllers/pecasEstoque.controller.js';

const pecasEstoqueRoutes = Router();
const controller = new PecasEstoqueController();

pecasEstoqueRoutes.post('/', controller.create);
pecasEstoqueRoutes.get('/', controller.findAll);
pecasEstoqueRoutes.get('/:id', controller.findById);
pecasEstoqueRoutes.put('/:id', controller.update);
pecasEstoqueRoutes.delete('/:id', controller.delete);

export { pecasEstoqueRoutes };
