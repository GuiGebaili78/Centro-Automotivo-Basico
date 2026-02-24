import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export class DashboardController {
  async getDashboardData(req: Request, res: Response) {
    try {
      // Dates for "Today" filter (Server Time)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Serviços em Aberto
      const osAberta = await prisma.ordemDeServico.count({
        where: {
          status: { in: ["ABERTA", "EM_ANDAMENTO"] },
          deleted_at: null,
        },
      });

      // 2. Contas a Pagar (Geral) -> Status PENDENTE
      const contasPagar = await prisma.contasPagar.count({
        where: {
          status: "PENDENTE",
          deleted_at: null,
        },
      });

      // 3. Livro Caixa Entries (PagamentoCliente Today)
      const livroCaixaEntries = await prisma.pagamentoCliente.count({
        where: {
          data_pagamento: { gte: startOfDay, lte: endOfDay },
          deleted_at: null,
        },
      });

      // 4. Livro Caixa Exits (PagamentoPeca Today - Real Only)
      const livroCaixaExits = await prisma.pagamentoPeca.count({
        where: {
          pago_ao_fornecedor: true,
          data_pagamento_fornecedor: { gte: startOfDay, lte: endOfDay },
          deleted_at: null,
        },
      });

      // 5. Auto Peças Pendentes
      // A. Items without payment record
      const itemsUnpaid = await prisma.itensOs.count({
        where: {
          pagamentos_peca: { none: {} },
          ordem_de_servico: { status: { not: "CANCELADA" } },
          deleted_at: null,
        },
      });
      // B. Payment records pending
      const paymentsPending = await prisma.pagamentoPeca.count({
        where: {
          pago_ao_fornecedor: false,
          deleted_at: null,
        },
      });
      const autoPecasPendentes = itemsUnpaid + paymentsPending;

      // 6. Consolidação (OS Pronta para Financeiro E SEM Fechamento)
      const consolidacao = await prisma.ordemDeServico.count({
        where: {
          status: "PRONTO PARA FINANCEIRO",
          fechamento_financeiro: null,
          deleted_at: null,
        },
      });

      // 7. Alerta de Estoque (Peças com estoque atual <= estoque mínimo)
      // Como o Prisma não suporta comparação de colunas diretamente no count de forma simples,
      // vamos buscar todos os itens e filtrar, ou usar uma query bruta se for muito volumoso.
      // Para o contexto de um centro automotivo, findMany é aceitável.
      const pecasComAlerta = await prisma.pecasEstoque.findMany({
        select: {
          id_pecas_estoque: true,
          estoque_atual: true,
          estoque_minimo: true,
        },
      });
      const alertaEstoque = pecasComAlerta.filter(
        (p) => Number(p.estoque_atual) <= Number(p.estoque_minimo),
      ).length;

      // 8. Recent OSs (Limit to 100 for performance)
      const recentOss = await prisma.ordemDeServico.findMany({
        take: 100,
        orderBy: { updated_at: "desc" },
        include: {
          veiculo: true,
          cliente: {
            include: {
              pessoa_fisica: { include: { pessoa: true } },
              pessoa_juridica: { include: { pessoa: true } },
            },
          },
          servicos_mao_de_obra: {
            include: {
              funcionario: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                },
              },
            },
          },
        },
      });

      res.json({
        stats: {
          osAberta,
          contasPagar,
          livroCaixaEntries,
          livroCaixaExits,
          autoPecasPendentes,
          consolidacao,
          alertaEstoque,
        },
        recentOss,
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
      res.status(500).json({ error: "Failed to load dashboard data" });
    }
  }
}
