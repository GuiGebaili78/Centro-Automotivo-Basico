import { Router } from 'express';
import { FornecedorController } from '../controllers/fornecedor.controller.js';

const fornecedorRoutes = Router();
const controller = new FornecedorController();

fornecedorRoutes.post('/', controller.create);
fornecedorRoutes.get('/', controller.findAll);
fornecedorRoutes.get('/:id', controller.findById);
fornecedorRoutes.put('/:id', controller.update);
fornecedorRoutes.delete('/:id', controller.delete);

export { fornecedorRoutes };
