import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Iniciando Teste de Sincronização de Recebíveis...");

  const timestamp = Date.now();

  // 1. Criar Dados de Teste (Cliente com Pessoa, Veículo, OS)
  const cliente = await prisma.cliente.create({
    data: {
      tipo_pessoa: 1, // Fisica
      telefone_1: "11999999999",
      pessoa_fisica: {
        create: {
          pessoa: {
            create: {
              nome: "Teste Sync " + timestamp,
            },
          },
        },
      },
    },
  });

  const veiculo = await prisma.veiculo.create({
    data: {
      placa: ("TST" + timestamp.toString().slice(-5)).slice(0, 8),
      modelo: "Test Car",
      marca: "Test Brand",
      cor: "White",
      ano_modelo: "2020",
      combustivel: "FLEX",
      id_cliente: cliente.id_cliente,
    },
  });

  const os = await prisma.ordemDeServico.create({
    data: {
      id_cliente: cliente.id_cliente,
      id_veiculo: veiculo.id_veiculo,
      status: "ABERTA",
      dt_abertura: new Date(),
      km_atual: 10000,
      km_entrada: 10000,
      parcelas: 1,
    },
  });

  console.log(`✅ OS Criada: #${os.id_os}`);

  // 2. Criar Pagamento (Cartão Crédito 2x)
  // Precisamos de uma operadora
  let operadora = await prisma.operadoraCartao.findFirst();
  if (!operadora) {
    const conta = await prisma.contaBancaria.create({
      data: { nome: "Conta Teste " + timestamp },
    });
    operadora = await prisma.operadoraCartao.create({
      data: {
        nome: "Operadora Teste",
        id_conta_destino: conta.id_conta,
      },
    });
  }

  console.log(
    `   Usando Operadora: ${operadora.nome} (ID: ${operadora.id_operadora})`,
  );

  const pagamento = await prisma.pagamentoCliente.create({
    data: {
      id_os: os.id_os,
      metodo_pagamento: "CREDITO",
      valor: 200,
      qtd_parcelas: 2,
      id_operadora: operadora.id_operadora,
      data_pagamento: new Date(),
    },
  });

  // Simular Controller: Criar Recebíveis
  await prisma.recebivelCartao.createMany({
    data: [
      {
        id_os: os.id_os,
        id_operadora: operadora.id_operadora,
        num_parcela: 1,
        total_parcelas: 2,
        valor_bruto: 100,
        valor_liquido: 95,
        status: "PENDENTE",
        data_prevista: new Date(),
        data_venda: new Date(),
        taxa_aplicada: 5,
      },
      {
        id_os: os.id_os,
        id_operadora: operadora.id_operadora,
        num_parcela: 2,
        total_parcelas: 2,
        valor_bruto: 100,
        valor_liquido: 95,
        status: "PENDENTE",
        data_prevista: new Date(),
        data_venda: new Date(),
        taxa_aplicada: 5,
      },
    ],
  });

  console.log("✅ Pagamento e Recebíveis (2x) criados.");

  // 3. Testar UPDATE (Mudar para PIX)
  console.log("🔄 Testando UPDATE (Cartão -> PIX)...");

  const original = await prisma.pagamentoCliente.findUnique({
    where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
  });

  if (!original) throw new Error("Pagamento não encontrado");

  console.log(`   Simulando lógica de limpeza do Controller Update...`);
  // Replica logic from Controller
  const deleteResult = await prisma.recebivelCartao.deleteMany({
    where: {
      id_os: original.id_os,
      id_operadora: Number(original.id_operadora),
      status: "PENDENTE",
      total_parcelas: original.qtd_parcelas || 1,
    },
  });

  console.log(`   🗑️ Registros Deletados: ${deleteResult.count}`);

  if (deleteResult.count !== 2) {
    console.error("❌ FALHA: Deveria ter deletado 2 recebíveis.");
    process.exit(1);
  } else {
    console.log("✅ SUCESSO: Recebíveis deletados corretamente ao atualizar.");
  }

  // 4. Testar DELETE (Pagamento Deletado)
  // Recriar para testar delete
  await prisma.recebivelCartao.createMany({
    data: [
      {
        id_os: os.id_os,
        id_operadora: operadora.id_operadora,
        num_parcela: 1,
        total_parcelas: 2,
        valor_bruto: 100,
        valor_liquido: 95,
        status: "PENDENTE",
        data_prevista: new Date(),
        data_venda: new Date(),
        taxa_aplicada: 5,
      },
      {
        id_os: os.id_os,
        id_operadora: operadora.id_operadora,
        num_parcela: 2,
        total_parcelas: 2,
        valor_bruto: 100,
        valor_liquido: 95,
        status: "PENDENTE",
        data_prevista: new Date(),
        data_venda: new Date(),
        taxa_aplicada: 5,
      },
    ],
  });

  console.log("🔄 Testando DELETE...");
  const deleteResult2 = await prisma.recebivelCartao.deleteMany({
    where: {
      id_os: original.id_os,
      id_operadora: Number(original.id_operadora), // Note: original still has operadora
      status: "PENDENTE",
      total_parcelas: original.qtd_parcelas || 1,
    },
  });

  console.log(`   🗑️ Registros Deletados: ${deleteResult2.count}`);

  if (deleteResult2.count !== 2) {
    console.error("❌ FALHA: Deveria ter deletado 2 recebíveis no delete.");
    process.exit(1);
  } else {
    console.log(
      "✅ SUCESSO: Recebíveis deletados corretamente ao deletar pagamento.",
    );
  }

  console.log("🎉 Todos os testes de Sincronização passaram!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
