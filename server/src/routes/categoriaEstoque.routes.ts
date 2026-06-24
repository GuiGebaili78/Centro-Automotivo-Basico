import { Router } from 'express';
import { CategoriaEstoqueController } from '../controllers/categoriaEstoque.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
const controller = new CategoriaEstoqueController();

router.use(authMiddleware);

router.get('/', controller.findAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
