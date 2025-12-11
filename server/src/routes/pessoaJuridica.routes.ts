import { Router } from 'express';
import { PessoaJuridicaController } from '../controllers/pessoaJuridica.controller.js';

const pessoaJuridicaRoutes = Router();
const controller = new PessoaJuridicaController();

pessoaJuridicaRoutes.post('/', controller.create);
pessoaJuridicaRoutes.get('/', controller.findAll);
pessoaJuridicaRoutes.get('/:id', controller.findById);
pessoaJuridicaRoutes.put('/:id', controller.update);
pessoaJuridicaRoutes.delete('/:id', controller.delete);

export { pessoaJuridicaRoutes };
