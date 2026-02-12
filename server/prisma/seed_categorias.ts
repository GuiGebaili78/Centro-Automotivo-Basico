import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Financial Categories...");

  const categories = [
    // --- RECEITAS ---
    {
      nome: "Receita",
      tipo: "RECEITA",
      children: ["Serviços", "Peças", "Sucatas", "Outros"],
    },
    // --- DESPESAS ---
    {
      nome: "Consumo",
      tipo: "DESPESA",
      children: [
        "Água",
        "Luz",
        "Internet",
        "Telefone",
        "Gás",
        "Ferramentas e Insumos",
        "Alimentação",
      ],
    },
    {
      nome: "Auto Peças",
      tipo: "DESPESA",
      children: ["Pg. Fornecedor"],
    },
    {
      nome: "Ocupação",
      tipo: "DESPESA",
      children: ["Aluguel", "IPTU", "Manutenção / Obras"],
    },
    {
      nome: "Investimento",
      tipo: "DESPESA",
      children: ["Compra de Estoque"],
    },
    {
      nome: "Impostos",
      tipo: "DESPESA",
      children: ["Simples Nacional", "ISS", "DAS", "Notas Fiscais", "IR"],
    },
    {
      nome: "Taxas e Tarifas",
      tipo: "DESPESA",
      children: [
        "Processamento de Operadoras",
        "Manutenção de Conta",
        "Multas",
        "Juros Bancários",
      ],
    },
    {
      nome: "Pessoal",
      tipo: "DESPESA",
      children: ["Comissão", "Vale", "Salário", "Prêmio"],
    },
  ];

  for (const group of categories) {
    // 1. Find or Create Parent
    let parent = await prisma.categoriaFinanceira.findFirst({
      where: {
        nome: group.nome,
        parentId: null,
      },
    });

    if (!parent) {
      parent = await prisma.categoriaFinanceira.create({
        data: {
          nome: group.nome,
          tipo: group.tipo,
          parentId: null,
        },
      });
      console.log(`Created Parent: ${group.nome} (ID: ${parent.id_categoria})`);
    } else {
      console.log(`Parent exists: ${group.nome} (ID: ${parent.id_categoria})`);
    }

    // 2. Create Children
    for (const childName of group.children) {
      const child = await prisma.categoriaFinanceira.findFirst({
        where: {
          nome: childName,
          parentId: parent.id_categoria,
        },
      });

      if (!child) {
        await prisma.categoriaFinanceira.create({
          data: {
            nome: childName,
            tipo: group.tipo,
            parentId: parent.id_categoria,
          },
        });
        console.log(`  > Created Child: ${childName}`);
      } else {
        console.log(`  > Child exists: ${childName}`);
      }
    }
  }

  console.log("✅ Categories Seeded Successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
