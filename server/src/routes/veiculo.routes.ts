import { Router } from 'express';
import { VeiculoController } from '../controllers/veiculo.controller.js';

const veiculoRoutes = Router();
const controller = new VeiculoController();

veiculoRoutes.post('/', controller.create);
veiculoRoutes.get('/', controller.findAll);
veiculoRoutes.get('/search', controller.search);
veiculoRoutes.get('/placa/:placa', controller.findByPlaca);
veiculoRoutes.get('/:id', controller.findById);
veiculoRoutes.put('/:id', controller.update);
veiculoRoutes.delete('/:id', controller.delete);

export { veiculoRoutes };
