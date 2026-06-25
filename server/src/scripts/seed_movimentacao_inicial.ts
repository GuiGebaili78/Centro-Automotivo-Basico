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

  const pecas = await prisma.pecasEstoque.findMany({
    where: { ativo: true },
    select: {
      id_pecas_estoque: true,
      nome: true,
      estoque_atual: true,
    },
    orderBy: { id_pecas_estoque: "asc" },
  });

  console.log(`📦 ${pecas.length} peças ativas encontradas.\n`);

  let criados = 0;
  let ignorados = 0;

  for (const peca of pecas) {
    // Verificar idempotência: já existe SALDO_INICIAL para esta peça?
    const jaExiste = await prisma.movimentacaoEstoque.findFirst({
      where: {
        id_pecas_estoque: peca.id_pecas_estoque,
        tipo_movimento: "SALDO_INICIAL",
      },
    });

    if (jaExiste) {
      console.log(
        `  ⏭️  Ignorado (já existe): [${peca.id_pecas_estoque}] ${peca.nome}`
      );
      ignorados++;
      continue;
    }

    // Criar registro de saldo inicial
    await prisma.movimentacaoEstoque.create({
      data: {
        id_pecas_estoque: peca.id_pecas_estoque,
        id_usuario: null, // Operação do sistema — sem usuário associado
        nome_usuario_snapshot: "Sistema (Migração Automática)",
        tipo_movimento: "SALDO_INICIAL",
        quantidade: peca.estoque_atual,
        saldo_anterior: 0,
        saldo_atual: peca.estoque_atual,
        valor_unitario: null,
        origem: "Migração automática — saldo inicial pré-existente",
        obs: `Saldo inicial registrado automaticamente para a peça "${peca.nome}" (ID: ${peca.id_pecas_estoque})`,
      },
    });

    console.log(
      `  ✅ Criado: [${peca.id_pecas_estoque}] ${peca.nome} — saldo: ${peca.estoque_atual}`
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
