import { Router } from 'express';
import { ClienteController } from '../controllers/cliente.controller.js';

const clienteRoutes = Router();
const controller = new ClienteController();

clienteRoutes.post('/', controller.create);
clienteRoutes.get('/', controller.findAll);
clienteRoutes.get('/:id', controller.findById);
clienteRoutes.put('/:id', controller.update);
clienteRoutes.delete('/:id', controller.delete);

export { clienteRoutes };
