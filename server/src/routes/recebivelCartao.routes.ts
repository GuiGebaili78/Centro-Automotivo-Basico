import { Router } from 'express';
import { RecebivelCartaoController } from '../controllers/recebivelCartao.controller.js';

const recebivelCartaoRoutes = Router();
const controller = new RecebivelCartaoController();

// CRUD básico
recebivelCartaoRoutes.post('/', controller.create);
recebivelCartaoRoutes.get('/', controller.findAll);
recebivelCartaoRoutes.get('/resumo', controller.getResumo);
recebivelCartaoRoutes.get('/:id', controller.findById);
recebivelCartaoRoutes.put('/:id', controller.update);
recebivelCartaoRoutes.delete('/:id', controller.delete);

// Filtros específicos
recebivelCartaoRoutes.get('/operadora/:idOperadora', controller.findByOperadora);
recebivelCartaoRoutes.get('/status/:status', controller.findByStatus);
recebivelCartaoRoutes.get('/date-range', controller.findByDateRange);

// Ações
recebivelCartaoRoutes.post('/confirmar', controller.confirmarRecebimentoLote);
recebivelCartaoRoutes.post('/:id/confirmar', controller.confirmarRecebimento);
recebivelCartaoRoutes.post('/:id/estornar', controller.estornarRecebimento);

export { recebivelCartaoRoutes };
