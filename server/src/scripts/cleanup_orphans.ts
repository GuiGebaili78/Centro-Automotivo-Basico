import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando limpeza de recebíveis órfãos...");

  // 1. Buscar todas as OSs com Recebíveis Pendentes
  const osWithReceivables = await prisma.ordemDeServico.findMany({
    where: {
      recebiveis_cartao: {
        some: { status: "PENDENTE" },
      },
    },
    include: {
      recebiveis_cartao: { where: { status: "PENDENTE" } },
      pagamentos_cliente: {
        where: {
          deleted_at: null,
          metodo_pagamento: { in: ["CREDITO", "DEBITO"] },
        },
      },
    },
  });

  console.log(
    `🔍 Encontradas ${osWithReceivables.length} OSs com recebíveis pendentes.`,
  );

  let deletedCount = 0;

  for (const os of osWithReceivables) {
    // Agrupar Recebíveis por "Operação" (simulada)
    // Como não temos ID de transação, agrupamos por: Operadora + Valor Total Estimado + Data Venda (Dia)

    const activePayments = os.pagamentos_cliente;
    const receivables = os.recebiveis_cartao;

    // Se não tem pagamentos ativos, TUDO é órfão
    if (activePayments.length === 0) {
      console.log(
        `   🚨 OS #${os.id_os}: 0 Pagamentos Ativos, ${receivables.length} Recebíveis. DELETANDO TODOS.`,
      );
      await prisma.recebivelCartao.deleteMany({
        where: { id_os: os.id_os, status: "PENDENTE" },
      });
      deletedCount += receivables.length;
      continue;
    }

    // Se tem pagamentos, tentar casar
    // Estratégia: Para cada recebível, tentar encontrar um pagamento que "possa" ser o pai
    // Isso é difícil pois 1 Pagamento = N Recebíveis (Parcelas)

    // Agrupar Recebíveis p/ tentar reconstruir o valor total
    // Key: id_operadora + total_parcelas + data_venda(YYYY-MM-DD) + valor_bruto (parcela)
    // Se tivermos 3 parcelas de 100, valor total = 300.

    // Simplificação Drástica:
    // Se a SOMA dos Recebíveis >> SOMA dos Pagamentos Ativos (com margem de erro), deletar o excesso?
    // Não, perigoso.

    // Abordagem Segura: Deletar Apenas se encontrar Pagamento DELETADO correspondente exato
    // Buscar Pagamentos Deletados Recentemente
    const deletedPayments = await prisma.pagamentoCliente.findMany({
      where: {
        id_os: os.id_os,
        deleted_at: { not: null },
        metodo_pagamento: { in: ["CREDITO", "DEBITO"] },
      },
    });

    for (const delPay of deletedPayments) {
      // Tentar achar recebíveis que batem com este pagamento deletado
      // Critérios: Operadora Igual, Valor Total Compatível
      if (delPay.id_operadora) {
        const qtdParcelas = delPay.qtd_parcelas || 1;
        const valorParcela = Number(delPay.valor) / qtdParcelas;

        // Buscar recebíveis que batem
        const orphans = receivables.filter(
          (r) =>
            r.id_operadora === delPay.id_operadora &&
            r.total_parcelas === qtdParcelas &&
            Math.abs(Number(r.valor_bruto) - valorParcela) < 0.05, // Float tol
        );

        if (orphans.length > 0) {
          console.log(
            `   🗑️ OS #${os.id_os}: Encontrado Pagamento Deletado #${delPay.id_pagamento_cliente} (R$ ${delPay.valor}). Removendo ${orphans.length} recebíveis órfãos.`,
          );

          // Verificar se NÃO existe um pagamento ATIVO igual
          // (Caso o usuário tenha deletado e criado outro IGUAL, não queremos deletar os novos se forem idênticos)
          // Mas se criou novo, criou NOVOS recebíveis.
          // Então teríamos DUPLICATA de recebíveis.
          // Se tivermos duplicata, devemos deletar um set.
          // Como saber qual? Pelo ID (menor ID = mais antigo = do deletado?)

          // Se orphans.length > qtdParcelas, temos duplicidade.
          // Devemos deletar os mais antigos (IDs menores)? Ou os que batem com a data do deleted?

          // Vamos deletar por ID
          const idsToDelete = orphans.map((r) => r.id_recebivel);

          // Safety Check: Verify active payments match
          // Se houver pagamento ATIVO idêntico, precisamos preservar UM set.
          const activeMatch = activePayments.find(
            (p) =>
              p.id_operadora === delPay.id_operadora &&
              (p.qtd_parcelas || 1) === qtdParcelas &&
              Math.abs(Number(p.valor) - Number(delPay.valor)) < 0.05,
          );

          if (activeMatch) {
            console.log(
              `      ⚠️ Existe Pagamento Ativo idêntico. Deletando apenas EXCEDENTE (Duplicatas).`,
            );
            // Se esperado 3 parcelas, e temos 6 recebíveis. Deletar 3 mais antigos.
            if (orphans.length > qtdParcelas) {
              // Sort by ID asc (oldest first)
              orphans.sort((a, b) => a.id_recebivel - b.id_recebivel);
              const toDelete = orphans.slice(0, orphans.length - qtdParcelas);
              await prisma.recebivelCartao.deleteMany({
                where: {
                  id_recebivel: { in: toDelete.map((x) => x.id_recebivel) },
                },
              });
              deletedCount += toDelete.length;
            }
          } else {
            // Sem correspondente ativo. Pode deletar tudo.
            await prisma.recebivelCartao.deleteMany({
              where: { id_recebivel: { in: idsToDelete } },
            });
            deletedCount += idsToDelete.length;
          }
        }
      }
    }
  }

  console.log(`✅ Limpeza concluída. ${deletedCount} recebíveis removidos.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
