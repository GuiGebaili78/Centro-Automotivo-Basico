import { prisma } from "../prisma.js";

async function main() {
  console.log("=== DB DIAGNOSTIC START ===");

  // 1. Test simulating stock entry insert with a non-existent Pessoa ID (e.g. 34)
  console.log(`\nSimulating stock entry insert with id_pessoa: 34...`);
  try {
    const testEntrada = await prisma.$transaction(async (tx) => {
      return await tx.entradaEstoque.create({
        data: {
          id_pessoa: 34,
          nota_fiscal: "TEST-123",
          data_compra: new Date(),
          valor_total: 100.0,
          obs: "Test transaction",
        }
      });
    });
    console.log("❌ Simulation succeeded! (Should have failed with constraint error)");
    await prisma.entradaEstoque.delete({ where: { id_entrada: testEntrada.id_entrada } });
  } catch (e: any) {
    console.log("Specific DB Error code for id_pessoa 34:", e.code);
    console.log("Error message:", e.message);
  }

  // 2. Test simulating item entry insert with condicao and aplicacao
  console.log(`\nSimulating item entry insert with condicao and aplicacao...`);
  try {
    const testEntrada = await prisma.entradaEstoque.create({
      data: {
        id_pessoa: 1, // Mecânico Padrão exists
        nota_fiscal: "TEST-ITEM",
        data_compra: new Date(),
        valor_total: 100.0,
      }
    });

    const peca = await prisma.pecasEstoque.findFirst();
    if (peca) {
      const item = await prisma.itemEntrada.create({
        data: {
          id_entrada: testEntrada.id_entrada,
          id_pecas_estoque: peca.id_pecas_estoque,
          quantidade: 10,
          valor_custo: 5.0,
          valor_venda: 10.0,
          condicao: "NOVO",
          aplicacao: "GERAL",
        }
      });
      console.log("❌ Simulation succeeded! ItemEntrada has condicao and aplicacao. Item ID:", item.id_item_entrada);
      
      // cleanup
      await prisma.itemEntrada.delete({ where: { id_item_entrada: item.id_item_entrada } });
    }
    await prisma.entradaEstoque.delete({ where: { id_entrada: testEntrada.id_entrada } });
  } catch (e: any) {
    console.log("Specific DB Error for item insert:", e.code);
    console.log("Error message:", e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
