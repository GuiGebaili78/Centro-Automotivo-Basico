/**
 * Script: seed_movimentacao_inicial.ts
 *
 * Propósito: Gerar registros de 'SALDO_INICIAL' na tabela movimentacao_estoque
 * para todas as peças ativas que já possuem estoque no banco, sem jamais
 * duplicar registros.
 *
 * Idempotente: pode ser executado múltiplas vezes com segurança.
 * Se um SALDO_INICIAL já existir para uma peça, ela é ignorada.
 *
 * Execução:
 *   npx tsx src/scripts/seed_movimentacao_inicial.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed de movimentação inicial de estoque...\n");

  const pecas = await prisma.produto.findMany({
    where: { ativo: true },
    select: {
      id_produto: true,
      nome: true,
      saldo_atual: true,
    },
    orderBy: { id_produto: "asc" },
  });

  console.log(`📦 ${pecas.length} peças ativas encontradas.\n`);

  let criados = 0;
  let ignorados = 0;

  for (const peca of pecas) {
    // Verificar idempotência: já existe SALDO_INICIAL para esta peça?
    const jaExiste = await prisma.movimentacaoEstoque.findFirst({
      where: {
        produto_id: peca.id_produto,
        tipo: "AJUSTE",
        obs: { contains: "SALDO_INICIAL" }
      },
    });

    if (jaExiste) {
      console.log(
        `  ⏭️  Ignorado (já existe): [${peca.id_produto}] ${peca.nome}`
      );
      ignorados++;
      continue;
    }

    // Criar registro de saldo inicial
    await prisma.movimentacaoEstoque.create({
      data: {
        produto_id: peca.id_produto,
        tipo: "AJUSTE",
        quantidade: peca.saldo_atual,
        custo_unitario_historico: 0,
        preco_venda_historico: 0,
        obs: `SALDO_INICIAL - Saldo inicial registrado automaticamente para a peça "${peca.nome}" (ID: ${peca.id_produto})`,
      },
    });

    console.log(
      `  ✅ Criado: [${peca.id_produto}] ${peca.nome} — saldo: ${peca.saldo_atual}`
    );
    criados++;
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Registros criados : ${criados}`);
  console.log(`   ⏭️  Ignorados (já ok) : ${ignorados}`);
  console.log(`   📦 Total de peças    : ${pecas.length}`);
  console.log(`\n✔ Seed concluído com sucesso.`);
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
