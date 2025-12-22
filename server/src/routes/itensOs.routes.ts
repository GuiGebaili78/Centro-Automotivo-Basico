import { Router } from 'express';
import { ItensOsController } from '../controllers/itensOs.controller.js';

const itensOsRoutes = Router();
const controller = new ItensOsController();

itensOsRoutes.post('/', controller.create);
itensOsRoutes.get('/', controller.findAll);
itensOsRoutes.get('/os/:idOs', controller.findByOsId);
itensOsRoutes.get('/:id', controller.findById);
itensOsRoutes.put('/:id', controller.update);
itensOsRoutes.delete('/:id', controller.delete);
itensOsRoutes.get('/search/desc', controller.search);

export { itensOsRoutes };
