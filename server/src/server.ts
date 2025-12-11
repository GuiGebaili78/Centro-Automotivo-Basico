import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Centro Automotivo API is running');
});

import { pessoaRoutes } from './routes/pessoa.routes.js';
import { tipoRoutes } from './routes/tipo.routes.js';
import { pessoaFisicaRoutes } from './routes/pessoaFisica.routes.js';
import { pessoaJuridicaRoutes } from './routes/pessoaJuridica.routes.js';
import { clienteRoutes } from './routes/cliente.routes.js';
import { funcionarioRoutes } from './routes/funcionario.routes.js';
import { pecasEstoqueRoutes } from './routes/pecasEstoque.routes.js';
import { veiculoRoutes } from './routes/veiculo.routes.js';
import { ordemDeServicoRoutes } from './routes/ordemDeServico.routes.js';
import { itensOsRoutes } from './routes/itensOs.routes.js';
import { finalizacaoRoutes } from './routes/finalizacao.routes.js';

app.use('/api/pessoa', pessoaRoutes);
app.use('/api/tipo', tipoRoutes);
app.use('/api/pessoa-fisica', pessoaFisicaRoutes);
app.use('/api/pessoa-juridica', pessoaJuridicaRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/funcionario', funcionarioRoutes);
app.use('/api/pecas-estoque', pecasEstoqueRoutes);
app.use('/api/veiculo', veiculoRoutes);
app.use('/api/ordem-de-servico', ordemDeServicoRoutes);
app.use('/api/itens-os', itensOsRoutes);
app.use('/api/finalizacao', finalizacaoRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
