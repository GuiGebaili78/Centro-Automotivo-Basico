import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const SERVICOS_LISTA = [
  "Troca de Óleo",
  "Alinhamento",
  "Balanceamento",
  "Troca de Pastilha de Freio",
  "Revisão Geral",
  "Troca de Filtros",
  "Limpeza de Bicos",
  "Troca de Amortecedor",
  "Regulagem Eletrônica",
  "Troca de Correia Dentada",
];

const DESCRICOES_CONTAS = [
  "Conta de Luz",
  "Conta de Água",
  "Aluguel do Galpão",
  "Internet e Telefone",
  "Fornecedor de Peças A",
  "Fornecedor de Óleos",
  "Serviço de Limpeza",
  "Manutenção Elevador",
  "Compra de Ferramentas",
  "Impostos Mensais",
];

async function main() {
  console.log("🌱 Iniciando o seed massivo com Faker...");

  // 1. Garantir Dependências Básicas
  // ==========================================

  // 1.1 Tipo de Cliente
  let tipoCliente = await prisma.tipo.findFirst();
  if (!tipoCliente) {
    tipoCliente = await prisma.tipo.create({
      data: { funcao: "Cliente Padrão" },
    });
    console.log("✅ Tipo de cliente criado.");
  }

  // 1.2 Funcionário (Necessário para OS)
  let funcionario = await prisma.funcionario.findFirst();
  if (!funcionario) {
    // Criar toda a cadeia de Pessoa -> PessoaFisica -> Funcionario
    const pessoa = await prisma.pessoa.create({
      data: {
        nome: "Mecânico Chefe Faker",
        genero: "Masculino",
        pessoa_fisica: {
          create: {
            cpf: faker.string.numeric(11),
            funcionario: {
              create: {
                ativo: "S",
                cargo: "Mecânico Líder",
                salario: 3500.0,
                dt_admissao: new Date(),
              },
            },
          },
        },
      },
      include: {
        pessoa_fisica: {
          include: {
            funcionario: true,
          },
        },
      },
    });
    funcionario = pessoa.pessoa_fisica!.funcionario!;
    console.log("✅ Funcionário padrão criado.");
  }

  // 2. Contas a Pagar (50 registros)
  // ==========================================
  console.log("💸 Gerando Contas a Pagar...");
  const contasPromises = Array.from({ length: 50 }).map(() => {
    const dataVencimento = faker.date.between({
      from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 ano atrás
      to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano futuro
    });

    const isPast = dataVencimento < new Date();
    // Se passado, 80% chance de pago, 20% atrasado. Se futuro, Pendente.
    let status = "PENDENTE";
    let dtPagamento = null;

    if (isPast) {
      if (Math.random() > 0.2) {
        status = "PAGO";
        dtPagamento = dataVencimento; // Pagou no dia
      } else {
        status = "ATRASADO";
      }
    }

    return prisma.contasPagar.create({
      data: {
        descricao: faker.helpers.arrayElement(DESCRICOES_CONTAS),
        valor: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
        dt_vencimento: dataVencimento,
        dt_pagamento: dtPagamento,
        status: status,
        categoria: "Despesas Operacionais",
        credor: faker.company.name(),
      },
    });
  });

  await Promise.all(contasPromises);
  console.log("✅ 50 Contas a Pagar geradas.");

  // 3. Ordens de Serviço (50 registros)
  // ==========================================
  console.log("🔧 Gerando Ordens de Serviço...");

  for (let i = 0; i < 50; i++) {
    // 3.1 Criar Cliente
    const sexo = faker.person.sexType();
    const nomeCliente = faker.person.fullName({ sex: sexo });

    const pessoaCliente = await prisma.pessoa.create({
      data: {
        nome: nomeCliente.slice(0, 100),
        genero: sexo,
        pessoa_fisica: {
          create: {
            cpf: faker.string.numeric(11),
            clientes: {
              create: {
                tipo_pessoa: tipoCliente!.id_tipo,
                telefone_1: faker.phone
                  .number({ style: "national" })
                  .slice(0, 15),
                email: faker.internet.email().slice(0, 100),
                logradouro: faker.location.street().slice(0, 150),
                nr_logradouro: faker.location.buildingNumber().slice(0, 10),
                bairro: faker.location.secondaryAddress().slice(0, 100),
                cidade: faker.location.city().slice(0, 100),
                estado: faker.location.state({ abbreviated: true }).slice(0, 2),
              },
            },
          },
        },
      },
      include: {
        pessoa_fisica: {
          include: {
            clientes: true,
          },
        },
      },
    });

    const cliente = pessoaCliente.pessoa_fisica!.clientes[0];

    // 3.2 Criar Veículo
    const veiculo = await prisma.veiculo.create({
      data: {
        id_cliente: cliente.id_cliente,
        placa: faker.vehicle.vrm(), // Gera placa aleatória
        marca: faker.vehicle.manufacturer(),
        modelo: faker.vehicle.model(),
        cor: faker.vehicle.color(),
        ano_modelo: String(faker.date.past({ years: 10 }).getFullYear()),
        combustivel: faker.helpers.arrayElement([
          "Flex",
          "Gasolina",
          "Etanol",
          "Diesel",
        ]),
      },
    });

    // 3.3 Gerar Datas da OS
    const dataAbertura = faker.date.between({
      from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const diasParaEntregar = faker.number.int({ min: 2, max: 5 });
    const dataPrevisao = new Date(dataAbertura);
    dataPrevisao.setDate(dataPrevisao.getDate() + diasParaEntregar);

    // Determinar Status
    const isPast = dataPrevisao < new Date();
    let statusOs = "ORCAMENTO";
    let dataEntrega = null;

    if (isPast) {
      statusOs = "FINALIZADO";
      dataEntrega = dataPrevisao;
    } else if (dataAbertura < new Date() && dataPrevisao > new Date()) {
      statusOs = "EM_ANDAMENTO";
    } else {
      statusOs = "AGENDADO";
    }

    // 3.4 Criar OS
    const os = await prisma.ordemDeServico.create({
      data: {
        id_cliente: cliente.id_cliente,
        id_veiculo: veiculo.id_veiculo,
        id_funcionario: funcionario!.id_funcionario,
        dt_abertura: dataAbertura,
        dt_entrega: dataEntrega,
        km_entrada: faker.number.int({ min: 10000, max: 150000 }),
        status: statusOs,
        defeito_relatado: "Barulho estranho no motor e luz de óleo acesa.",
        diagnostico: "Necessário troca de óleo e filtros.",
        parcelas: 1,
      },
    });

    // 3.5 Inserir Serviços na OS
    const qtdServicos = faker.number.int({ min: 1, max: 3 });
    const servicosEscolhidos = faker.helpers.arrayElements(
      SERVICOS_LISTA,
      qtdServicos,
    );

    let totalMaoDeObra = 0;

    for (const servicoDesc of servicosEscolhidos) {
      const valorServico = faker.number.float({
        min: 50,
        max: 800,
        fractionDigits: 2,
      });
      totalMaoDeObra += valorServico;

      await prisma.servicoMaoDeObra.create({
        data: {
          id_os: os.id_os,
          id_funcionario: funcionario!.id_funcionario,
          descricao: servicoDesc,
          valor: valorServico,
          status_pagamento: "PENDENTE",
        },
      });
    }

    // Atualizar valor total da OS (Simplificado, sem peças por enquanto)
    await prisma.ordemDeServico.update({
      where: { id_os: os.id_os },
      data: {
        valor_mao_de_obra: totalMaoDeObra,
        valor_total_cliente: totalMaoDeObra,
        valor_final: totalMaoDeObra,
      },
    });
  }

  console.log("✅ 50 Ordens de Serviço geradas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
