export interface IPessoa {
  id_pessoa: number;
  nome: string;
  genero?: string | null;
  dt_nascimento?: string | null; // Date sent as string
  obs?: string | null;
  dt_cadastro: string;
}

export interface IPessoaFisica {
  id_pessoa_fisica: number;
  id_pessoa: number;
  cpf?: string | null;
  dt_cadastro: string;
}

export interface IPessoaJuridica {
  id_pessoa_juridica: number;
  id_pessoa: number;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  dt_cadastro: string;
}

export interface ITipo {
  id_tipo: number;
  funcao?: string | null;
  dt_cadastro: string;
}

export interface ICliente {
  id_cliente: number;
  id_pessoa_fisica?: number | null;
  id_pessoa_juridica?: number | null;
  tipo_pessoa: number;
  telefone_1: string;
  telefone_2?: string | null;
  telefone_3?: string | null;
  email?: string | null;
  logradouro: string;
  nr_logradouro: string;
  compl_logradouro?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  dt_cadastro: string;

  // Optional Joins
  pessoa_fisica?: IPessoaFisica & { pessoa: IPessoa };
  pessoa_juridica?: IPessoaJuridica & { pessoa: IPessoa };
  veiculos?: IVeiculo[];
}

export interface IFuncionario {
  id_funcionario: number;
  id_pessoa_fisica: number;
  ativo: string;
  cargo: string;

  // Antigos
  salario?: number | null;
  comissao?: number | null; // Mão de Obra

  dt_admissao: string;
  dt_recisao?: string | null;
  motivo_saida?: string | null;
  obs?: string | null;
  dt_cadastro: string;

  // MEI / Identificação
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj_mei?: string | null;
  inscricao_municipal?: string | null;

  // Dados Pessoais / Endereço
  rg?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone_pessoal?: string | null;
  email_pessoal?: string | null;

  // Operacional / Financeiro Extra
  especialidade?: string | null;
  tipo_pagamento?: string | null;
  valor_pagamento?: number | null;
  comissao_pecas?: number | null;

  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  periodicidade_pagamento?: string | null;
  dia_vencimento?: number | null;

  // Docs
  url_ccmei?: string | null;
  url_cnh?: string | null;
  equipamentos_epis?: string | null;

  // Optional Joins
  pessoa_fisica?: IPessoaFisica & { pessoa: IPessoa };
}

export interface IPecasEstoque {
  id_pecas_estoque: number;
  fabricante?: string | null;
  nome: string;
  descricao: string;
  valor_custo: number; // Decimal
  valor_venda: number; // Decimal
  estoque_atual: number;
  unidade_medida?: string | null;
  custo_unitario_padrao: number; // Decimal
  dt_ultima_compra?: string | null;
  dt_cadastro: string;
}

export interface IVeiculo {
  id_veiculo: number;
  id_cliente: number;
  placa: string;
  chassi?: string | null;
  marca: string;
  modelo: string;
  versao?: string | null;
  ano_modelo: string;
  cor: string;
  combustivel: string;
  obs?: string | null;
  dt_cadastro: string;

  // Optional Joins
  cliente?: ICliente;
}

export interface IOrdemDeServico {
  id_os: number;
  id_cliente: number;
  id_veiculo: number;
  id_funcionario: number;
  dt_abertura: string;
  dt_entrega?: string | null;
  km_entrada: number;
  status: string;
  defeito_relatado?: string | null;
  diagnostico?: string | null;
  valor_servico?: number | null;
  valor_pecas?: number | null;
  valor_final?: number | null;

  valor_total_cliente?: number | null;
  valor_mao_de_obra?: number | null;

  modo_pagamento?: string | null;
  cod_pagamento?: string | null;
  parcelas: number;
  obs?: string | null;
  obs_final?: string | null;
  dt_cadastro: string;

  // Optional Joins
  cliente?: ICliente;
  veiculo?: IVeiculo;
  itens_os?: IItensOs[];
  pagamentos_cliente?: IPagamentoCliente[];
  funcionario?: IFuncionario;
  fechamento_financeiro?: IFechamentoFinanceiro;
  servicos_mao_de_obra?: IServicoMaoDeObra[];
}

export interface IServicoMaoDeObra {
  id_servico_mao_de_obra: number;
  id_os: number;
  id_funcionario: number;
  valor: number;
  descricao?: string | null;
  dt_cadastro: string;

  // Optional Joins
  funcionario?: IFuncionario;
}

export interface IPagamentoCliente {
  id_pagamento_cliente: number;
  id_os: number;
  metodo_pagamento: string;
  valor: number;
  data_pagamento: string;
  bandeira_cartao?: string | null;
  codigo_transacao?: string | null;
  qtd_parcelas: number;
  deleted_at?: string | null;

  id_operadora?: number | null;
  operadora?: IOperadoraCartao;
  id_conta_bancaria?: number | null;
  conta_bancaria?: IContaBancaria;
}

export interface IItensOs {
  id_iten: number;
  id_os: number;
  id_pecas_estoque?: number | null;
  descricao: string;
  codigo_referencia?: string | null;
  quantidade: number;
  valor_venda: number;
  valor_total: number;
  dt_cadastro: string;
}

export interface IFechamentoFinanceiro {
  id_fechamento_financeiro: number;
  id_os: number;
  custo_total_pecas_real: number;
  data_fechamento_financeiro: string;
}

export interface IFornecedor {
  id_fornecedor: number;
  // Identificação
  tipo_pessoa?: string | null;
  nome: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;

  // Contato
  contato?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;

  // Endereço
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;

  // Financeiro
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  condicoes_pagamento?: string | null;
  categoria_produto?: string | null;

  obs?: string | null;
  dt_cadastro: string;
}

export interface IPagamentoPeca {
  id_pagamento_peca: number;
  id_item_os: number;
  id_fornecedor: number;
  custo_real: number;
  data_compra: string;
  data_pagamento_fornecedor?: string | null;
  pago_ao_fornecedor: boolean;
}

export interface IContasPagar {
  id_conta_pagar: number;
  descricao: string;
  valor: number;
  dt_vencimento: string;
  dt_pagamento?: string | null;
  status: string;
  categoria?: string | null;

  // New
  credor?: string | null;
  dt_emissao?: string | null;
  num_documento?: string | null;
  forma_pagamento?: string | null;
  url_anexo?: string | null;

  // Recurrence fields
  id_grupo_recorrencia?: string | null;
  numero_parcela?: number | null;
  total_parcelas?: number | null;

  obs?: string | null;
  dt_cadastro: string;
}

export interface IRecurrenceInfo {
  numero_parcela: number;
  total_parcelas: number;
  id_grupo: string | null;
}

// ---------------------------------------------------------
// INTELIGÊNCIA FINANCEIRA
// ---------------------------------------------------------

export interface IContaBancaria {
  id_conta: number;
  nome: string;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  saldo_atual: number;
  ativo: boolean;
  dt_cadastro: string;
}

export interface ITaxaCartao {
  id_taxa?: number;
  id_operadora?: number;
  modalidade: "DEBITO" | "CREDITO";
  num_parcelas: number;
  taxa_total: number;
  taxa_antecipacao?: number;
}

export interface IOperadoraCartao {
  id_operadora: number;
  nome: string;
  ativo: boolean; // Added field
  vincular_caixa: boolean;

  taxa_debito: number;
  prazo_debito: number;

  taxa_credito_vista: number;
  prazo_credito_vista: number;

  taxa_credito_parc: number;
  prazo_credito_parc: number;

  taxa_antecipacao: number;
  antecipacao_auto: boolean;

  id_conta_destino: number;
  conta_destino?: IContaBancaria;

  taxas_cartao?: ITaxaCartao[];
}

export interface IRecebivelCartao {
  id_recebivel: number;
  id_os?: number | null;
  id_operadora: number;

  num_parcela: number;
  total_parcelas: number;

  valor_bruto: number;
  valor_liquido: number;
  taxa_aplicada: number;

  data_venda: string;
  data_prevista: string;
  data_recebimento?: string | null;

  status: string; // 'PENDENTE', 'RECEBIDO'

  operadora?: IOperadoraCartao;
  ordem_de_servico?: IOrdemDeServico;
}

export interface ILivroCaixa {
  id_livro_caixa: number;
  descricao: string;
  valor: number; // Decimal string in UI usually, but number here
  tipo_movimentacao: string; // 'ENTRADA' | 'SAIDA'
  categoria: string;
  dt_movimentacao: string;
  obs?: string | null;
  origem: string;
  id_conta_bancaria?: number | null;
  conta?: IContaBancaria;
}
