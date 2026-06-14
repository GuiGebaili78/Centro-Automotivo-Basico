import { Router } from 'express';
import { FuncionarioController } from '../controllers/funcionario.controller.js';

const funcionarioRoutes = Router();
const controller = new FuncionarioController();

funcionarioRoutes.post('/', controller.create);
funcionarioRoutes.get('/', controller.findAll);
funcionarioRoutes.get('/:id', controller.findById);
funcionarioRoutes.put('/:id', controller.update);
funcionarioRoutes.delete('/:id', controller.delete);

// --- DIÁRIAS ---
funcionarioRoutes.post('/:id/diarias', controller.registrarDiarias);
funcionarioRoutes.get('/:id/diarias', controller.listarDiarias);
funcionarioRoutes.put('/:id/diarias/pagas', controller.marcarDiariasComoPagas);

export { funcionarioRoutes };
