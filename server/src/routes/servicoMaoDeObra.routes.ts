import { Router } from 'express';
import { servicoMaoDeObraController } from '../controllers/servicoMaoDeObra.controller.js';

const servicoMaoDeObraRoutes = Router();

servicoMaoDeObraRoutes.post('/', servicoMaoDeObraController.create);
servicoMaoDeObraRoutes.get('/os/:id_os', servicoMaoDeObraController.index);
servicoMaoDeObraRoutes.put('/:id', servicoMaoDeObraController.update);
servicoMaoDeObraRoutes.delete('/:id', servicoMaoDeObraController.delete);

export { servicoMaoDeObraRoutes };
