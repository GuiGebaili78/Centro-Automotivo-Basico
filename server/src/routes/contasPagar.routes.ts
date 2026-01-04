
import { Router } from 'express';
import { createConta, getContas, getContaById, updateConta, deleteConta } from '../controllers/contasPagar.controller.js';

const router = Router();

router.post('/', createConta);
router.get('/', getContas);
router.get('/:id', getContaById);
router.put('/:id', updateConta);
router.delete('/:id', deleteConta);

export default router;
