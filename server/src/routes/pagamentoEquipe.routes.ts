import { Router } from 'express';
import * as PagamentoEquipeController from '../controllers/pagamentoEquipe.controller.js';

export const pagamentoEquipeRoutes = Router();

pagamentoEquipeRoutes.get('/pendentes/:id_funcionario', PagamentoEquipeController.getPendentesByFuncionario);
pagamentoEquipeRoutes.post('/', PagamentoEquipeController.createPagamento);
pagamentoEquipeRoutes.get('/', PagamentoEquipeController.getHistorico);
