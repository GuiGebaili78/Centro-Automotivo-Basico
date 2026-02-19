import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fornecedores = await prisma.fornecedor.count();
  const funcionarios = await prisma.funcionario.count();
  const bancos = await prisma.contaBancaria.count();
  const operadoras = await prisma.operadora.count();
  const os = await prisma.ordemDeServico.count();
  const osFinalizadas = await prisma.ordemDeServico.count({
    where: { status: "FINALIZADA" },
  });

  console.log(`Fornecedores: ${fornecedores}`);
  console.log(`Funcionarios: ${funcionarios}`);
  console.log(`Bancos: ${bancos}`);
  console.log(`Operadoras: ${operadoras}`);
  console.log(`OS Total: ${os}`);
  console.log(`OS Finalizadas: ${osFinalizadas}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
