import { Router } from 'express';
import { EquipamentoClienteController } from '../controllers/equipamentoCliente.controller.js';

const equipamentoClienteRoutes = Router();
const controller = new EquipamentoClienteController();

equipamentoClienteRoutes.post('/', controller.create);
equipamentoClienteRoutes.get('/', controller.findAll);
equipamentoClienteRoutes.get('/:id', controller.findById);
equipamentoClienteRoutes.put('/:id', controller.update);
equipamentoClienteRoutes.delete('/:id', controller.delete);

export { equipamentoClienteRoutes };
