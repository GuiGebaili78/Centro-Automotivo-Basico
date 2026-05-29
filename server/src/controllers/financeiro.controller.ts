import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export class FinanceiroController {
  async getGeneralSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, source, category, search } = req.query;

      const where: any = {
        deleted_at: null,
      };

      if (startDate && endDate) {
        where.dt_movimentacao = {
          gte: new Date((startDate as string) + "T00:00:00"),
          lte: new Date((endDate as string) + "T23:59:59"),
        };
      }

      if (source && source !== "ALL") {
        where.origem = source === "MANUAL" ? "MANUAL" : "AUTOMATICA";
      }

      if (category && category !== "ALL") {
        where.categoria = category;
      }

      if (search) {
        const searchVal = String(search).toLowerCase();
        // search covers description, category, and id
        where.OR = [
          { descricao: { contains: searchVal, mode: "insensitive" } },
          { categoria: { contains: searchVal, mode: "insensitive" } },
          { obs: { contains: searchVal, mode: "insensitive" } },
        ];
        if (!isNaN(Number(searchVal))) {
          where.OR.push({ id_livro_caixa: Number(searchVal) });
          where.OR.push({ valor: Number(searchVal) });
        }
      }

      // Add "NOT CONCILIACAO" globally as it's filtered in the frontend currently
      where.categoria = { ...where.categoria, not: "CONCILIACAO_CARTAO" };

      // 1. Total Inflows (ENTRADA)
      const inflows = await prisma.livroCaixa.aggregate({
        where: { ...where, tipo_movimentacao: "ENTRADA" },
        _sum: { valor: true },
      });

      // 2. Total Outflows (SAIDA)
      const outflows = await prisma.livroCaixa.aggregate({
        where: { ...where, tipo_movimentacao: "SAIDA" },
        _sum: { valor: true },
      });

      const totalInflow = Number(inflows._sum.valor) || 0;
      const totalOutflow = Number(outflows._sum.valor) || 0;

      res.json({
        totalInflow,
        totalOutflow,
        balance: totalInflow - totalOutflow,
      });
    } catch (error) {
      console.error("Financeiro Summary Error:", error);
      res.status(500).json({ error: "Failed to load financial summary" });
    }
  }

  // Optimized KPI for Relatorios
  async getKPIs(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate
        ? new Date((startDate as string) + "T00:00:00")
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate
        ? new Date((endDate as string) + "T23:59:59")
        : new Date();

      // Sum of all REAL inflows (PagamentoCliente or Manual ENTRADA)
      const totalInflow = await prisma.livroCaixa.aggregate({
        where: {
          tipo_movimentacao: "ENTRADA",
          dt_movimentacao: { gte: start, lte: end },
          deleted_at: null,
          NOT: {
            categoria: {
              in: ["CONCILIACAO_CARTAO", "TRANSFERENCIA", "AJUSTE_SALDO"],
            },
          },
        },
        _sum: { valor: true },
      });

      const totalOutflow = await prisma.livroCaixa.aggregate({
        where: {
          tipo_movimentacao: "SAIDA",
          dt_movimentacao: { gte: start, lte: end },
          deleted_at: null,
        },
        _sum: { valor: true },
      });

      const receita = Number(totalInflow._sum.valor) || 0;
      const despesa = Number(totalOutflow._sum.valor) || 0;
      const lucro = receita - despesa;

      // Count OS for average ticket
      const osCount = await prisma.ordemDeServico.count({
        where: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          dt_entrega: { gte: start, lte: end },
          deleted_at: null,
        },
      });

      res.json({
        receita,
        despesa,
        lucro,
        margem: receita > 0 ? (lucro / receita) * 100 : 0,
        ticket: osCount > 0 ? receita / osCount : 0,
      });
    } catch (error) {
      console.error("Financeiro KPIs Error:", error);
      res.status(500).json({ error: "Failed to load kpis" });
    }
  }

  async getEvolution(req: Request, res: Response) {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;
      const start = new Date((startDate as string) + "T00:00:00");
      const end = new Date((endDate as string) + "T23:59:59");

      const requestedGroupBy = String(groupBy).toLowerCase();
      const validIntervals = ["day", "week", "month", "quarter", "year"];
      const interval = validIntervals.includes(requestedGroupBy)
        ? requestedGroupBy
        : "day";

      // Aggregation using UNION ALL for high performance
      // source tables: ordem_de_servico (revenue), contas_pagar (expense), pagamento_equipe (expense)
      const data: any[] = await prisma.$queryRawUnsafe(
        `
        SELECT 
          DATE_TRUNC('${interval}', combined.dt) as date,
          SUM(combined.receita)::FLOAT as receitas,
          SUM(combined.despesa)::FLOAT as despesas
        FROM (
          /* 1. Receitas de OS Finalizadas */
          SELECT updated_at as dt, CAST(valor_total_cliente AS DECIMAL) as receita, 0 as despesa 
          FROM "ordem_de_servico" 
          WHERE status IN ('FINALIZADA', 'PAGA_CLIENTE', 'FINANCEIRO') 
            AND deleted_at IS NULL
            AND updated_at BETWEEN $1 AND $2

          UNION ALL

          /* 2. Despesas de Contas Pagas */
          SELECT dt_pagamento as dt, 0 as receita, CAST(valor AS DECIMAL) as despesa 
          FROM "contas_pagar" 
          WHERE status = 'PAGO' 
            AND deleted_at IS NULL
            AND dt_pagamento BETWEEN $1 AND $2

          UNION ALL

          /* 3. Despesas de Equipe */
          SELECT dt_pagamento as dt, 0 as receita, CAST(valor_total AS DECIMAL) as despesa 
          FROM "pagamento_equipe" 
          WHERE dt_pagamento BETWEEN $1 AND $2
        ) as combined
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        start,
        end,
      );

      // Simple mapping to match chart expected format (label + values)
      const result = data.map((row) => ({
        date: row.date,
        receita: row.receitas || 0,
        despesa: row.despesas || 0,
        label:
          interval === "month"
            ? new Date(row.date).toLocaleDateString("pt-BR", {
                month: "short",
                year: "2-digit",
              })
            : new Date(row.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }),
      }));
      res.json(result);
    } catch (error) {
      console.error("Financeiro Evolution Error:", error);
      res.status(500).json({ error: "Failed to load evolution data" });
    }
  }

  async getMovimentacoes(req: Request, res: Response) {
    try {
      const { startDate, endDate, search, osId, status } = req.query;

      let params: any[] = [];
      let idx = 1;

      let whereLC = "WHERE (lc.categoria != 'CONCILIACAO_CARTAO' OR lc.categoria IS NULL)";
      let wherePP = "WHERE pp.id_livro_caixa IS NULL AND ((pp.pago_ao_fornecedor = true AND pp.data_pagamento_fornecedor IS NOT NULL) OR pp.deleted_at IS NOT NULL)";
      let wherePC = "WHERE pc.id_livro_caixa IS NULL";

      if (startDate && endDate) {
        params.push(new Date((startDate as string) + "T00:00:00"));
        params.push(new Date((endDate as string) + "T23:59:59"));
        const pStart = `$${idx++}`;
        const pEnd = `$${idx++}`;
        whereLC += ` AND lc.dt_movimentacao BETWEEN ${pStart} AND ${pEnd}`;
        wherePP += ` AND COALESCE(pp.data_pagamento_fornecedor, pp.data_compra) BETWEEN ${pStart} AND ${pEnd}`;
        wherePC += ` AND pc.data_pagamento BETWEEN ${pStart} AND ${pEnd}`;
      }

      if (status && status !== "ALL") {
        if (status === "PAID") {
          whereLC += ` AND lc.tipo_movimentacao = 'ENTRADA'`;
          wherePP += ` AND 1 = 0`; // Peças is always Saída
        } else if (status === "PENDING") {
          whereLC += ` AND lc.tipo_movimentacao = 'SAIDA'`;
          wherePC += ` AND 1 = 0`; // Cliente is always Entrada
        }
      }

      if (osId) {
        params.push(Number(osId));
        const pOs = `$${idx++}`;
        whereLC += ` AND 1 = 0`; // Manual entries don't have direct OS link in this unified view
        wherePP += ` AND os.id_os = ${pOs}`;
        wherePC += ` AND os.id_os = ${pOs}`;
      }

      if (search) {
        params.push(`%${search}%`);
        const pSearch = `$${idx++}`;
        whereLC += ` AND (lc.descricao ILIKE ${pSearch} OR lc.obs ILIKE ${pSearch} OR lc.categoria ILIKE ${pSearch})`;
        wherePP += ` AND (('OS Nº ' || os.id_os || ' - ' || COALESCE(v.modelo, 'Veículo')) ILIKE ${pSearch} OR COALESCE(pf.nome, p_j.nome_fantasia, p_j.razao_social) ILIKE ${pSearch} OR f.nome ILIKE ${pSearch})`;
        wherePC += ` AND (('Serviços: OS Nº ' || os.id_os) ILIKE ${pSearch} OR COALESCE(pf.nome, p_j.nome_fantasia, p_j.razao_social) ILIKE ${pSearch})`;
      }

      const sqlQuery = `
        SELECT * FROM (
          SELECT 
            'man-' || lc.id_livro_caixa as id,
            lc.id_livro_caixa as "rawId",
            lc.dt_movimentacao as date,
            lc.descricao as description,
            CASE WHEN lc.tipo_movimentacao = 'ENTRADA' THEN 'IN' ELSE 'OUT' END as type,
            lc.valor as value,
            lc.categoria as category,
            NULL as vehicle,
            NULL as client,
            NULL as supplier,
            lc.obs as obs,
            CASE WHEN lc.origem = 'AUTOMATICA' THEN 'AUTO' ELSE 'MANUAL' END as source,
            lc.deleted_at,
            cb.nome as conta_bancaria,
            NULL as "paymentMethod",
            NULL::int as os_id
          FROM livro_caixa lc
          LEFT JOIN conta_bancaria cb ON lc.id_conta_bancaria = cb.id_conta
          ${whereLC}

          UNION ALL

          SELECT
            'out-' || pp.id_pagamento_peca as id,
            pp.id_pagamento_peca as "rawId",
            COALESCE(pp.data_pagamento_fornecedor, pp.data_compra) as date,
            'OS Nº ' || os.id_os || ' - ' || COALESCE(v.modelo, 'Veículo') as description,
            'OUT' as type,
            pp.custo_real as value,
            'Auto Peças' as category,
            v.placa || ' - ' || v.modelo as vehicle,
            COALESCE(pf.nome, p_j.nome_fantasia, p_j.razao_social) as client,
            f.nome as supplier,
            '' as obs,
            'AUTO' as source,
            pp.deleted_at,
            NULL as conta_bancaria,
            NULL as "paymentMethod",
            os.id_os as os_id
          FROM pagamento_peca pp
          JOIN itens_os io ON pp.id_item_os = io.id_iten
          JOIN ordem_de_servico os ON io.id_os = os.id_os
          LEFT JOIN veiculo v ON os.id_veiculo = v.id_veiculo
          LEFT JOIN cliente c ON os.id_cliente = c.id_cliente
          LEFT JOIN pessoa_fisica p_f ON c.id_pessoa_fisica = p_f.id_pessoa_fisica
          LEFT JOIN pessoa pf ON p_f.id_pessoa = pf.id_pessoa
          LEFT JOIN pessoa_juridica p_j ON c.id_pessoa_juridica = p_j.id_pessoa_juridica
          LEFT JOIN pessoa pj ON p_j.id_pessoa = pj.id_pessoa
          LEFT JOIN pessoa f ON pp.id_pessoa = f.id_pessoa
          ${wherePP}

          UNION ALL

          SELECT
            'in-' || pc.id_pagamento_cliente as id,
            pc.id_pagamento_cliente as "rawId",
            pc.data_pagamento as date,
            'Serviços: OS Nº ' || os.id_os as description,
            'IN' as type,
            pc.valor as value,
            'Receita' as category,
            v.placa || ' - ' || v.modelo as vehicle,
            COALESCE(pf.nome, p_j.nome_fantasia, p_j.razao_social) as client,
            NULL as supplier,
            pc.obs as obs,
            'AUTO' as source,
            pc.deleted_at,
            COALESCE(cb.nome, op.nome) as conta_bancaria,
            pc.metodo_pagamento as "paymentMethod",
            os.id_os as os_id
          FROM pagamento_cliente pc
          JOIN ordem_de_servico os ON pc.id_os = os.id_os
          LEFT JOIN veiculo v ON os.id_veiculo = v.id_veiculo
          LEFT JOIN cliente c ON os.id_cliente = c.id_cliente
          LEFT JOIN pessoa_fisica p_f ON c.id_pessoa_fisica = p_f.id_pessoa_fisica
          LEFT JOIN pessoa pf ON p_f.id_pessoa = pf.id_pessoa
          LEFT JOIN pessoa_juridica p_j ON c.id_pessoa_juridica = p_j.id_pessoa_juridica
          LEFT JOIN pessoa pj ON p_j.id_pessoa = pj.id_pessoa
          LEFT JOIN conta_bancaria cb ON pc.id_conta_bancaria = cb.id_conta
          LEFT JOIN operadora_cartao op ON pc.id_operadora = op.id_operadora
          ${wherePC}
        ) as combined
        ORDER BY date DESC
      `;

      const rows: any[] = await prisma.$queryRawUnsafe(sqlQuery, ...params);

      // Calculate totals
      let totalInflow = 0;
      let totalOutflow = 0;
      let balance = 0;
      
      const filteredRows = rows.map(r => {
        const val = Number(r.value);
        if (r.deleted_at === null) {
          if (r.type === 'IN') {
            totalInflow += val;
            balance += val;
          } else {
            totalOutflow += val;
            balance -= val;
          }
        }
        return {
          ...r,
          value: val,
        };
      });

      res.json({
        data: filteredRows, // Add pagination later if required, for now just returns all matched which shouldn't be much given date range
        totalInflow,
        totalOutflow,
        balance
      });
    } catch (error: any) {
      console.error("Financeiro Movimentacoes Error:", error);
      res.status(500).json({ error: "Failed to load movimentacoes", detail: error.message });
    }
  }
}
