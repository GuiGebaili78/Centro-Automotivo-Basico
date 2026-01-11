import { Router } from 'express';
import * as ContaBancariaController from '../controllers/contaBancaria.controller.js';

export const contaBancariaRoutes = Router();

contaBancariaRoutes.get('/', ContaBancariaController.getAll);
contaBancariaRoutes.post('/', ContaBancariaController.create);
contaBancariaRoutes.put('/:id', ContaBancariaController.update);
contaBancariaRoutes.delete('/:id', ContaBancariaController.remove);
