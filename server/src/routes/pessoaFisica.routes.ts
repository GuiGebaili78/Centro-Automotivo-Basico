import { Router } from 'express';
import { PessoaFisicaController } from '../controllers/pessoaFisica.controller.js';

const pessoaFisicaRoutes = Router();
const controller = new PessoaFisicaController();

pessoaFisicaRoutes.post('/', controller.create);
pessoaFisicaRoutes.get('/', controller.findAll);
pessoaFisicaRoutes.get('/:id', controller.findById);
pessoaFisicaRoutes.put('/:id', controller.update);
pessoaFisicaRoutes.delete('/:id', controller.delete);

export { pessoaFisicaRoutes };
