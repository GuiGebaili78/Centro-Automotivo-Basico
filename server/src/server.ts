import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Importar todas as rotas primeiro
import { pessoaRoutes } from "./routes/pessoa.routes.js";
import { tipoRoutes } from "./routes/tipo.routes.js";
import { pessoaFisicaRoutes } from "./routes/pessoaFisica.routes.js";
import { pessoaJuridicaRoutes } from "./routes/pessoaJuridica.routes.js";
import { clienteRoutes } from "./routes/cliente.routes.js";
import { funcionarioRoutes } from "./routes/funcionario.routes.js";
import { pecasEstoqueRoutes } from "./routes/pecasEstoque.routes.js";
import { veiculoRoutes } from "./routes/veiculo.routes.js";
import { ordemDeServicoRoutes } from "./routes/ordemDeServico.routes.js";
import { itensOsRoutes } from "./routes/itensOs.routes.js";
import { servicoMaoDeObraRoutes } from "./routes/servicoMaoDeObra.routes.js";
import { fechamentoFinanceiroRoutes } from "./routes/fechamentoFinanceiro.routes.js";
import { fornecedorRoutes } from "./routes/fornecedor.routes.js";
import { pagamentoPecaRoutes } from "./routes/pagamentoPeca.routes.js";
import { pagamentoClienteRoutes } from "./routes/pagamentoCliente.routes.js";
import contasPagarRoutes from "./routes/contasPagar.routes.js";
import { pagamentoEquipeRoutes } from "./routes/pagamentoEquipe.routes.js";
import { livroCaixaRoutes } from "./routes/livroCaixa.routes.js";
import { categoriaFinanceiraRoutes } from "./routes/categoriaFinanceira.routes.js";
import { contaBancariaRoutes } from "./routes/contaBancaria.routes.js";
import { operadoraRoutes } from "./routes/operadoraCartao.routes.js";
import { recebivelCartaoRoutes } from "./routes/recebivelCartao.routes.js";
import { relatoriosRoutes } from "./routes/relatorio.routes.js";
import configuracaoRoutes from "./routes/configuracao.routes.js";
import { documentoRoutes } from "./routes/documento.routes.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Centro Automotivo API is running");
});

// Registrar todas as rotas
app.use("/api/configuracao", configuracaoRoutes);
app.use("/api/documento", documentoRoutes);
app.use("/api/pessoa", pessoaRoutes);
app.use("/api/tipo", tipoRoutes);
app.use("/api/pessoa-fisica", pessoaFisicaRoutes);
app.use("/api/pessoa-juridica", pessoaJuridicaRoutes);
app.use("/api/cliente", clienteRoutes);
app.use("/api/funcionario", funcionarioRoutes);
app.use("/api/pecas-estoque", pecasEstoqueRoutes);
app.use("/api/veiculo", veiculoRoutes);
app.use("/api/ordem-de-servico", ordemDeServicoRoutes);
app.use("/api/itens-os", itensOsRoutes);
app.use("/api/servico-mao-de-obra", servicoMaoDeObraRoutes);
app.use("/api/fechamento-financeiro", fechamentoFinanceiroRoutes);
app.use("/api/fornecedor", fornecedorRoutes);
app.use("/api/pagamento-peca", pagamentoPecaRoutes);
app.use("/api/pagamento-cliente", pagamentoClienteRoutes);
app.use("/api/contas-pagar", contasPagarRoutes);
app.use("/api/pagamento-equipe", pagamentoEquipeRoutes);
app.use("/api/livro-caixa", livroCaixaRoutes);
app.use("/api/categoria-financeira", categoriaFinanceiraRoutes);
app.use("/api/conta-bancaria", contaBancariaRoutes);
app.use("/api/operadora-cartao", operadoraRoutes);
app.use("/api/recebivel-cartao", recebivelCartaoRoutes);
app.use("/api/relatorios", relatoriosRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
