import { Router } from 'express';
import * as LivroCaixaController from '../controllers/livroCaixa.controller.js';

export const livroCaixaRoutes = Router();

livroCaixaRoutes.get('/', LivroCaixaController.getAll);
livroCaixaRoutes.post('/', LivroCaixaController.create);
