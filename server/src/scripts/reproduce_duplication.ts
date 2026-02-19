import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando teste de reprodução de duplicidade...");

  // 1. Criar Dados Básicos (Cliente, Veículo, OS)
  // Use unique identifiers to avoid unique constraint violations
  const uniqueId = Date.now().toString().slice(-6);
  const placa = `TST${uniqueId.slice(-4)}`;

  // Create dependencies individually to be safe
  const pessoa = await prisma.pessoa.create({
    data: { nome: `Teste Duplicidade ${uniqueId}` },
  });

  const pessoaFisica = await prisma.pessoaFisica.create({
    data: { id_pessoa: pessoa.id_pessoa, cpf: uniqueId.padEnd(11, "0") },
  });

  const cliente = await prisma.cliente.create({
    data: {
      id_pessoa_fisica: pessoaFisica.id_pessoa_fisica,
      tipo_pessoa: 1,
      telefone_1: "11999999999",
    },
  });

  const veiculo = await prisma.veiculo.create({
    data: {
      id_cliente: cliente.id_cliente,
      placa: placa,
      modelo: "Fusca",
      marca: "VW",
      cor: "Azul",
      ano_modelo: "1980",
      combustivel: "GASOLINA",
    },
  });

  const os = await prisma.ordemDeServico.create({
    data: {
      status: "PRONTO PARA FINANCEIRO", // Simulate ready state
      id_cliente: cliente.id_cliente,
      id_veiculo: veiculo.id_veiculo,
      km_entrada: 1000,
      defeito_relatado: "Teste",
      parcelas: 1,
    },
  });

  console.log(`✅ OS Criada: ${os.id_os}`);

  // 2. Simular PagamentoClienteController.create
  console.log("--- Criando Pagamento (Controller Simulation) ---");

  // 2.1 Criar LivroCaixa
  const lcOriginal = await prisma.livroCaixa.create({
    data: {
      descricao: `OS Nº ${os.id_os} - Teste (Auto)`,
      valor: 100.0,
      tipo_movimentacao: "ENTRADA",
      categoria: "Serviços",
      dt_movimentacao: new Date(),
      origem: "AUTOMATICA",
    },
  });

  // 2.2 Criar Pagamento vinculado
  const pagamento = await prisma.pagamentoCliente.create({
    data: {
      id_os: os.id_os,
      metodo_pagamento: "PIX",
      valor: 100.0,
      data_pagamento: new Date(),
      id_livro_caixa: lcOriginal.id_livro_caixa,
    },
  });

  console.log(
    `✅ Pagamento Criado: ${pagamento.id_pagamento_cliente} | Linked LC: ${pagamento.id_livro_caixa}`,
  );

  // 3. Executar ConsolidarOS (Simulação Repository)
  console.log("--- Executando ConsolidarOS (1ª vez) ---");
  await runConsolidationLogic(os.id_os);

  // 4. Edição do Pagamento
  console.log("--- Editando Pagamento (Simulação Update) ---");
  // Update value
  await prisma.pagamentoCliente.update({
    where: { id_pagamento_cliente: pagamento.id_pagamento_cliente },
    data: { valor: 150.0 },
  });
  // Update LC
  await prisma.livroCaixa.update({
    where: { id_livro_caixa: lcOriginal.id_livro_caixa },
    data: { valor: 150.0 },
  });

  // 5. Consolidar Novamente
  console.log("--- Executando ConsolidarOS (2ª vez) ---");
  await runConsolidationLogic(os.id_os);
}

async function runConsolidationLogic(idOs: number) {
  // Buscar OS com pagamentos - EXACTLY AS REPOSITORY
  const osWithPay = await prisma.ordemDeServico.findUnique({
    where: { id_os: idOs },
    include: {
      pagamentos_cliente: { where: { deleted_at: null } },
      cliente: {
        include: {
          pessoa_fisica: { include: { pessoa: true } },
          pessoa_juridica: true,
        },
      },
      veiculo: true,
    },
  });

  if (!osWithPay) throw new Error("OS not found");

  console.log(
    `🔍 [CONSOLIDAÇÃO] Processando ${osWithPay.pagamentos_cliente.length} pagamentos...`,
  );

  for (const pagamento of osWithPay.pagamentos_cliente) {
    console.log(
      `   🔸 Pagamento ${pagamento.id_pagamento_cliente}: ${pagamento.metodo_pagamento} | R$ ${pagamento.valor}`,
    );

    // CHECK LOGIC
    if ((pagamento as any).id_livro_caixa) {
      console.log(
        `      ⚠️ Pagamento #${pagamento.id_pagamento_cliente} já possui Livro Caixa (#${(pagamento as any).id_livro_caixa}). Pulando criação.`,
      );
    } else {
      console.log(`      FAIL: Creating DUPLICATE LivroCaixa!`);
      // Simulate creation
      await prisma.livroCaixa.create({
        data: {
          descricao: `DUPLICATA - OS ${idOs}`,
          valor: Number(pagamento.valor),
          tipo_movimentacao: "ENTRADA",
          categoria: "Serviços",
          origem: "AUTOMATICA",
        },
      });
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
