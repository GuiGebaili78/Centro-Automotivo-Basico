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
    salario?: number | null;
    comissao?: number | null;
    dt_admissao: string;
    dt_recisao?: string | null;
    motivo_saida?: string | null;
    obs?: string | null;
    dt_cadastro: string;

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
    nome: string;
    documento?: string | null;
    contato?: string | null;
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

