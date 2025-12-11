import { Router } from 'express';
import { PessoaController } from '../controllers/pessoa.controller.js';

const pessoaRoutes = Router();
const controller = new PessoaController();

pessoaRoutes.post('/', controller.create);
pessoaRoutes.get('/', controller.findAll);
pessoaRoutes.get('/:id', controller.findById);
pessoaRoutes.put('/:id', controller.update);
pessoaRoutes.delete('/:id', controller.delete);

export { pessoaRoutes };
