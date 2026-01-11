import { Router } from 'express';
import * as RecebivelController from '../controllers/recebivelCartao.controller.js';

export const recebivelRoutes = Router();

recebivelRoutes.get('/', RecebivelController.getAll);
recebivelRoutes.post('/confirmar', RecebivelController.confirmarRecebimento);
