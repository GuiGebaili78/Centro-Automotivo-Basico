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
}

export interface IFuncionario {
    id_funcionario: number;
    id_pessoa_fisica: number;
    ativo: string;
    cargo: string;
    salario?: number | null; // Decimal to number
    comissao?: number | null;
    dt_admissao: string;
    dt_recisao?: string | null;
    motivo_saida?: string | null;
    obs?: string | null;
    dt_cadastro: string;
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
    modo_pagamento?: string | null;
    cod_pagamento?: string | null;
    parcelas: number;
    obs?: string | null;
    dt_cadastro: string;
}

export interface IItensOs {
    id_iten: number;
    id_os: number;
    id_pecas_estoque?: number | null;
    descricao: string;
    qtd: number;
    valor_unt: number;
    valor_total: number;
    dt_cadastro: string;
}

export interface IFinalizacao {
    id_finalizacao: number;
    id_os: number;
    valor_peca_entrada?: number | null;
    valor_peca_saida?: number | null;
    valor_pago_funcionario?: number | null;
    obs?: string | null;
    dt_cadastro: string;
}
