import { Router } from 'express';
import { FuncionarioController } from '../controllers/funcionario.controller.js';

const funcionarioRoutes = Router();
const controller = new FuncionarioController();

funcionarioRoutes.post('/', controller.create);
funcionarioRoutes.get('/', controller.findAll);
funcionarioRoutes.get('/:id', controller.findById);
funcionarioRoutes.put('/:id', controller.update);
funcionarioRoutes.delete('/:id', controller.delete);

export { funcionarioRoutes };
