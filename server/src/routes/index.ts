import { Router } from "express";

// Import all route modules
import { pessoaRoutes } from "./pessoa.routes.js";
import { tipoRoutes } from "./tipo.routes.js";
import { pessoaFisicaRoutes } from "./pessoaFisica.routes.js";
import { pessoaJuridicaRoutes } from "./pessoaJuridica.routes.js";
import { clienteRoutes } from "./cliente.routes.js";
import { funcionarioRoutes } from "./funcionario.routes.js";
import { pecasEstoqueRoutes } from "./pecasEstoque.routes.js";
import { veiculoRoutes } from "./veiculo.routes.js";
import { ordemDeServicoRoutes } from "./ordemDeServico.routes.js";
import { itensOsRoutes } from "./itensOs.routes.js";
import { servicoMaoDeObraRoutes } from "./servicoMaoDeObra.routes.js";
import { fechamentoFinanceiroRoutes } from "./fechamentoFinanceiro.routes.js";
import { fornecedorRoutes } from "./fornecedor.routes.js";
import { pagamentoPecaRoutes } from "./pagamentoPeca.routes.js";
import { pagamentoClienteRoutes } from "./pagamentoCliente.routes.js";
import contasPagarRoutes from "./contasPagar.routes.js";
import { pagamentoEquipeRoutes } from "./pagamentoEquipe.routes.js";
import { livroCaixaRoutes } from "./livroCaixa.routes.js";
import { categoriaFinanceiraRoutes } from "./categoriaFinanceira.routes.js";
import { contaBancariaRoutes } from "./contaBancaria.routes.js";
import { operadoraRoutes } from "./operadoraCartao.routes.js";
import { recebivelCartaoRoutes } from "./recebivelCartao.routes.js";
import { relatoriosRoutes } from "./relatorio.routes.js";
import configuracaoRoutes from "./configuracao.routes.js";
import { documentoRoutes } from "./documento.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { financeiroRoutes } from "./financeiro.routes.js";

const apiRouter = Router();

// Register routes
apiRouter.use("/financeiro", financeiroRoutes);
apiRouter.use("/configuracao", configuracaoRoutes);
apiRouter.use("/documento", documentoRoutes);
apiRouter.use("/pessoa", pessoaRoutes);
apiRouter.use("/tipo", tipoRoutes);
apiRouter.use("/pessoa-fisica", pessoaFisicaRoutes);
apiRouter.use("/pessoa-juridica", pessoaJuridicaRoutes);
apiRouter.use("/cliente", clienteRoutes);
apiRouter.use("/funcionario", funcionarioRoutes);
apiRouter.use("/pecas-estoque", pecasEstoqueRoutes);
apiRouter.use("/veiculo", veiculoRoutes);
apiRouter.use("/ordem-de-servico", ordemDeServicoRoutes);
apiRouter.use("/itens-os", itensOsRoutes);
apiRouter.use("/servico-mao-de-obra", servicoMaoDeObraRoutes);
apiRouter.use("/fechamento-financeiro", fechamentoFinanceiroRoutes);
apiRouter.use("/fornecedor", fornecedorRoutes);
apiRouter.use("/pagamento-peca", pagamentoPecaRoutes);
apiRouter.use("/pagamento-cliente", pagamentoClienteRoutes);
apiRouter.use("/contas-pagar", contasPagarRoutes);
apiRouter.use("/pagamento-equipe", pagamentoEquipeRoutes);
apiRouter.use("/livro-caixa", livroCaixaRoutes);
apiRouter.use("/categoria-financeira", categoriaFinanceiraRoutes);
apiRouter.use("/conta-bancaria", contaBancariaRoutes);
apiRouter.use("/operadora-cartao", operadoraRoutes);
apiRouter.use("/recebivel-cartao", recebivelCartaoRoutes);
apiRouter.use("/relatorios", relatoriosRoutes);
apiRouter.use("/dashboard", dashboardRoutes);

export { apiRouter };
