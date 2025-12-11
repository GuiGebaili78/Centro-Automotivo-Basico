import { Router } from 'express';
import { ItensOsController } from '../controllers/itensOs.controller.js';

const itensOsRoutes = Router();
const controller = new ItensOsController();

itensOsRoutes.post('/', controller.create);
itensOsRoutes.get('/', controller.findAll);
itensOsRoutes.get('/:id', controller.findById);
itensOsRoutes.put('/:id', controller.update);
itensOsRoutes.delete('/:id', controller.delete);

export { itensOsRoutes };
