import { Router } from 'express';
import { TipoController } from '../controllers/tipo.controller.js';

const tipoRoutes = Router();
const controller = new TipoController();

tipoRoutes.post('/', controller.create);
tipoRoutes.get('/', controller.findAll);
tipoRoutes.get('/:id', controller.findById);
tipoRoutes.put('/:id', controller.update);
tipoRoutes.delete('/:id', controller.delete);

export { tipoRoutes };
