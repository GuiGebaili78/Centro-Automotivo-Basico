import { prisma } from "../prisma.js";

async function main() {
  console.log("=== DB DIAGNOSTIC START ===");

  // 1. Test simulating stock entry insert with a non-existent Pessoa ID (e.g. 34)
  console.log(`\nSimulating stock entry insert with id_pessoa: 34...`);
  try {
    const testEntrada = await prisma.$transaction(async (tx) => {
      const p = await tx.produto.findFirst();
      if (!p) throw new Error("No product found");
      return await tx.movimentacaoEstoque.create({
        data: {
          produto_id: p.id_produto,
          tipo: "ENTRADA",
          nota_fiscal_id: 99999, // non-existent NF ID to simulate constraint failure
          quantidade: 1,
          custo_unitario_historico: 100.0,
          preco_venda_historico: 100.0,
          obs: "Test transaction",
        }
      });
    });
    console.log("❌ Simulation succeeded! (Should have failed with constraint error)");
    await prisma.movimentacaoEstoque.delete({ where: { id_movimentacao: testEntrada.id_movimentacao } });
  } catch (e: any) {
    console.log("Specific DB Error code for id_pessoa 34:", e.code);
    console.log("Error message:", e.message);
  }

  // 2. Test simulating item entry insert
  console.log(`\nSimulating item entry insert...`);
  try {
    const peca = await prisma.produto.findFirst();
    if (peca) {
      const item = await prisma.movimentacaoEstoque.create({
        data: {
          produto_id: peca.id_produto,
          tipo: "ENTRADA",
          quantidade: 10,
          custo_unitario_historico: 5.0,
          preco_venda_historico: 10.0,
          obs: "TEST-ITEM",
        }
      });
      console.log("❌ Simulation succeeded! MovimentacaoEstoque created. Item ID:", item.id_movimentacao);
      
      // cleanup
      await prisma.movimentacaoEstoque.delete({ where: { id_movimentacao: item.id_movimentacao } });
    }
  } catch (e: any) {
    console.log("Specific DB Error for item insert:", e.code);
    console.log("Error message:", e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
