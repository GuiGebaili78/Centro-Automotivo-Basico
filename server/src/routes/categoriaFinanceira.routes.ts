import { Router } from 'express';
import * as CategoriaController from '../controllers/categoriaFinanceira.controller.js';

export const categoriaFinanceiraRoutes = Router();

categoriaFinanceiraRoutes.get('/', CategoriaController.getAll);
categoriaFinanceiraRoutes.post('/', CategoriaController.create);
categoriaFinanceiraRoutes.put('/:id', CategoriaController.update);
categoriaFinanceiraRoutes.delete('/:id', CategoriaController.remove);
