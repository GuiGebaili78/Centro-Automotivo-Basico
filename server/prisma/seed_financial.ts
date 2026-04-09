import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Start seeding financial data... Cleaning up first.");

  // Limpeza (Ordem Inversa de Dependência)
  await prisma.fechamentoFinanceiro.deleteMany();
  await prisma.pagamentoCliente.deleteMany();
  await prisma.pagamentoEquipe.deleteMany();
  await prisma.pagamentoPeca.deleteMany();
  await prisma.recebivelCartao.deleteMany();
  await prisma.itemEntrada.deleteMany(); // Depende de Pecas e Entrada
  await prisma.entradaEstoque.deleteMany();
  await prisma.contasPagar.deleteMany();
  await prisma.livroCaixa.deleteMany();
  await prisma.operadoraCartao.deleteMany();
  await prisma.contaBancaria.deleteMany();

  await prisma.servicoMaoDeObra.deleteMany();
  await prisma.itensOs.deleteMany();
  await prisma.ordemDeServico.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.tipo.deleteMany(); // Limpa Tipos de cliente
  await prisma.funcionario.deleteMany();
  await prisma.pecasEstoque.deleteMany();

  // Limpar Pessoas é delicado pois pode ter outros vinculos, mas vamos limpar os criados pelo seed
  await prisma.pessoaFisica.deleteMany();
  await prisma.pessoa.deleteMany();

  // 1. Criar Pessoa Física para Funcionario Mecanico
  const pMecanico = await prisma.pessoa.create({
    data: {
      nome: "Carlos Mecânico",
      pessoa_fisica: {
        create: {
          cpf: "12345678900",
        },
      },
    },
    include: { pessoa_fisica: true },
  });

  const funcMecanico = await prisma.funcionario.create({
    data: {
      id_pessoa_fisica: pMecanico.pessoa_fisica!.id_pessoa_fisica,
      cargo: "Mecânico",
      especialidade: "Mecânica Geral",
      comissao: 30, // 30%
      ativo: "S",
      dt_cadastro: new Date(),
      dt_admissao: new Date(),
    },
  });

  // 1. Criar Pessoa Física para Funcionario Elétrico
  const pEletrico = await prisma.pessoa.create({
    data: {
      nome: "Eduardo Elétrica",
      pessoa_fisica: {
        create: {
          cpf: "98765432100",
        },
      },
    },
    include: { pessoa_fisica: true },
  });

  const funcEletrico = await prisma.funcionario.create({
    data: {
      id_pessoa_fisica: pEletrico.pessoa_fisica!.id_pessoa_fisica,
      cargo: "Eletricista",
      especialidade: "Elétrica",
      comissao: 40, // 40%
      ativo: "S",
      dt_cadastro: new Date(),
      dt_admissao: new Date(),
    },
  });

  // 2. Criar Peças no Estoque
  const pecaOleo = await prisma.pecasEstoque.create({
    data: {
      nome: "Óleo 5W30 Sintético",
      descricao: "Óleo Motor",
      fabricante: "Lubrax",
      valor_custo: 25.0,
      valor_venda: 60.0,
      estoque_atual: 100, // Requerido no schema
    },
  });

  // 2b. Criar Tipo de Cliente (Se não existir)
  let tipo = await prisma.tipo.findFirst({ where: { funcao: "Varejo" } });
  if (!tipo) {
    tipo = await prisma.tipo.create({ data: { funcao: "Varejo" } });
  }

  // 2c. Criar Cliente e Veiculo Generico para OS
  const pCliente = await prisma.pessoa.create({
    data: { nome: "Cliente Teste" },
  });

  const pfCliente = await prisma.pessoaFisica.create({
    data: { id_pessoa: pCliente.id_pessoa, cpf: "11122233344" },
  });

  const cliente = await prisma.cliente.create({
    data: {
      telefone_1: "1199999999",
      tipo_pessoa: tipo.id_tipo,
      id_pessoa_fisica: pfCliente.id_pessoa_fisica,
    },
  });

  const veiculo = await prisma.veiculo.create({
    data: {
      placa: "TST-" + Math.floor(Math.random() * 1000), // Random placa
      marca: "Fiat",
      modelo: "Uno",
      ano_modelo: "2020",
      cor: "Branco",
      combustivel: "Flex",
      id_cliente: cliente.id_cliente,
    },
  });

  // 3. Fornecedor
  const fornecedor = await prisma.pessoa.create({
    data: {
      nome: "Auto Peças Zé",
      is_fornecedor: true,
      pessoa_juridica: {
        create: {
          cnpj: "00000000000000",
          razao_social: "Auto Peças Zé LTDA"
        }
      }
    },
  });

  const meses = [
    { ano: 2025, mes: 10, nome: "Nov" }, // Nov (JS Month 10)
    { ano: 2025, mes: 11, nome: "Dez" },
    { ano: 2026, mes: 0, nome: "Jan" }, // Jan 26
  ];

  for (const m of meses) {
    const dtEvento = new Date(m.ano, m.mes, 15);

    // A. OS Típica de Mecânica
    const osMec = await prisma.ordemDeServico.create({
      data: {
        id_cliente: cliente.id_cliente,
        id_veiculo: veiculo.id_veiculo,
        status: "FINALIZADO",
        dt_abertura: dtEvento, // Correto (não dt_entrada)
        dt_entrega: dtEvento,
        km_entrada: 50000,
        defeito_relatado: "Revisão Geral", // Correto (não defeito)
        valor_final: 340.0, // Correto (não valor_total)
        parcelas: 1,
      },
    });

    // Itens da OS
    const itemOs = await prisma.itensOs.create({
      data: {
        id_os: osMec.id_os, // Correto (não id_ordem_servico)
        id_pecas_estoque: pecaOleo.id_pecas_estoque,
        descricao: "Óleo 5W30",
        quantidade: 4,
        valor_venda: 60.0,
        valor_total: 240.0,
      },
    });

    await prisma.servicoMaoDeObra.create({
      data: {
        id_os: osMec.id_os,
        descricao: "Troca de Óleo e Filtros",
        valor: 100.0,
        id_funcionario: funcMecanico.id_funcionario,
      },
    });

    // B. OS Típica de Elétrica
    // Como id_veiculo é unico por placa no seed, usar mesmo veiculo ou criar outro se precisar
    // Vamos usar o mesmo veiculo
    const osEle = await prisma.ordemDeServico.create({
      data: {
        id_cliente: cliente.id_cliente,
        id_veiculo: veiculo.id_veiculo,
        status: "FINALIZADO",
        dt_abertura: dtEvento,
        dt_entrega: dtEvento,
        km_entrada: 10000,
        defeito_relatado: "Pane Elétrica",
        valor_final: 700.0,
        parcelas: 1,
      },
    });

    // Peça Compra Direta
    const itemPecaDireta = await prisma.itensOs.create({
      data: {
        id_os: osEle.id_os,
        descricao: "Alternador Recondicionado",
        quantidade: 1,
        valor_venda: 400.0,
        valor_total: 400.0,
      },
    });

    // Simular Pagamento da Peça (Custo)
    await prisma.pagamentoPeca.create({
      data: {
        id_item_os: itemPecaDireta.id_iten, // Note: id_iten based on schema
        id_pessoa: fornecedor.id_pessoa,
        custo_real: 250.0,
        data_compra: dtEvento,
      },
    });

    await prisma.servicoMaoDeObra.create({
      data: {
        id_os: osEle.id_os,
        descricao: "Reparo de Alternador",
        valor: 300.0,
        id_funcionario: funcEletrico.id_funcionario,
      },
    });

    // C. Despesas Fixas do Mês
    await prisma.livroCaixa.create({
      data: {
        descricao: `Aluguel ${m.nome}/${m.ano}`,
        valor: 1200.0,
        tipo_movimentacao: "SAIDA",
        categoria: "ALUGUEL",
        dt_movimentacao: dtEvento,
        origem: "MANUAL",
      },
    });

    await prisma.livroCaixa.create({
      data: {
        descricao: `Energia ${m.nome}/${m.ano}`,
        valor: 350.0,
        tipo_movimentacao: "SAIDA",
        categoria: "LUZ",
        dt_movimentacao: dtEvento,
        origem: "MANUAL",
      },
    });
  }

  // =================================================================================
  // FUTURO
  // =================================================================================

  const futureDates = [
    new Date(2026, 1, 10), // 10 Fev
    new Date(2026, 2, 10), // 10 Mar
    new Date(2026, 3, 10), // 10 Abr
  ];

  // Criar Operadora Mock para Recebivel
  const conta = await prisma.contaBancaria.create({
    data: { nome: "Caixa Geral" },
  });
  const operadora = await prisma.operadoraCartao.create({
    data: {
      nome: "Stone",
      id_conta_destino: conta.id_conta,
    },
  });

  for (const fd of futureDates) {
    // 1. Contas a Pagar Recorrentes
    await prisma.contasPagar.create({
      data: {
        descricao: "Aluguel Oficina",
        valor: 1200.0,
        dt_vencimento: fd,
        status: "PENDENTE",
        categoria: "ALUGUEL",
        credor: "Imobiliária Beta",
      },
    });

    // 2. Recebível de Cartão
    await prisma.recebivelCartao.create({
      data: {
        id_operadora: operadora.id_operadora,
        valor_liquido: 340.0, // simplificado
        valor_bruto: 350.5,
        taxa_aplicada: 10.5,
        num_parcela: futureDates.indexOf(fd) + 1,
        total_parcelas: 3,
        data_prevista: fd,
        status: "PENDENTE",
      },
    });
  }

  console.log("✅ Seeding completed! Financial data populated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
