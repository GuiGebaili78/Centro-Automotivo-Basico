import { Router } from 'express';
import { RecebivelCartaoController } from '../controllers/recebivelCartao.controller.js';

const recebivelCartaoRoutes = Router();
const controller = new RecebivelCartaoController();

// CRUD básico
// Rotas específicas (DEVEM vir antes de /:id)
recebivelCartaoRoutes.get('/resumo', controller.getResumo);
recebivelCartaoRoutes.get('/date-range', controller.findByDateRange);
recebivelCartaoRoutes.get('/operadora/:idOperadora', controller.findByOperadora);
recebivelCartaoRoutes.get('/status/:status', controller.findByStatus);

// CRUD básico e rotas parametrizadas por ID
recebivelCartaoRoutes.post('/', controller.create);
recebivelCartaoRoutes.get('/', controller.findAll);
recebivelCartaoRoutes.get('/:id', controller.findById);
recebivelCartaoRoutes.put('/:id', controller.update);
recebivelCartaoRoutes.delete('/:id', controller.delete);

// Ações
recebivelCartaoRoutes.post('/confirmar', controller.confirmarRecebimentoLote);
recebivelCartaoRoutes.post('/:id/confirmar', controller.confirmarRecebimento);
recebivelCartaoRoutes.post('/:id/estornar', controller.estornarRecebimento);

export { recebivelCartaoRoutes };
