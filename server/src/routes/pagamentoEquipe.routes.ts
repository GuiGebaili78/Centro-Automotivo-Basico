import { Router } from 'express';
import * as PagamentoEquipeController from '../controllers/pagamentoEquipe.controller.js';

export const pagamentoEquipeRoutes = Router();

pagamentoEquipeRoutes.get('/pendentes/:id_funcionario', PagamentoEquipeController.getPendentesByFuncionario);
pagamentoEquipeRoutes.get('/vales/:id_funcionario', PagamentoEquipeController.getValesPendentesByFuncionario);
pagamentoEquipeRoutes.post('/', PagamentoEquipeController.createPagamento);
pagamentoEquipeRoutes.get('/', PagamentoEquipeController.getHistorico);
