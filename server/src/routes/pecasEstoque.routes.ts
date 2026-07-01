import { Router } from 'express';
import { PecasEstoqueController } from '../controllers/pecasEstoque.controller.js';

const pecasEstoqueRoutes = Router();
const controller = new PecasEstoqueController();

// ── Entradas (devem vir antes de /:id para evitar conflito de rotas) ──
pecasEstoqueRoutes.post('/entry', controller.createEntry.bind(controller));
pecasEstoqueRoutes.get('/entry/:id', controller.findEntryById.bind(controller));
pecasEstoqueRoutes.put('/entry/:id', controller.updateEntry.bind(controller));
pecasEstoqueRoutes.delete('/entry/:id', controller.deleteEntry.bind(controller));

// ── Catálogo de Peças ──
pecasEstoqueRoutes.post('/', controller.create.bind(controller));
pecasEstoqueRoutes.get('/', controller.findAll.bind(controller));
pecasEstoqueRoutes.get('/search', controller.search.bind(controller));
pecasEstoqueRoutes.get('/sugestoes', controller.getSuggestions.bind(controller));

// ── Rotas com :id (devem vir após rotas literais) ──
pecasEstoqueRoutes.get('/:id/availability', controller.getAvailability.bind(controller));

// ── Histórico de Movimentações (IMUTÁVEL — sem rota DELETE) ──
pecasEstoqueRoutes.get('/:id/historico', controller.getHistorico.bind(controller));
pecasEstoqueRoutes.post('/:id/ajuste', controller.ajustarSaldo.bind(controller));

// ── Estorno Compensatório (POST — nunca DELETE no histórico) ──
pecasEstoqueRoutes.post('/movimentacao/:id/estorno', controller.registrarEstorno.bind(controller));

// ── CRUD padrão de peças ──
pecasEstoqueRoutes.get('/:id', controller.findById.bind(controller));
pecasEstoqueRoutes.put('/:id', controller.update.bind(controller));
pecasEstoqueRoutes.delete('/:id', controller.delete.bind(controller));

export { pecasEstoqueRoutes };
