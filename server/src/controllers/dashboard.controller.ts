import { Request, Response } from "express";
import { OrdemDeServicoRepository } from "../repositories/ordemDeServico.repository.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";
import { dayjs, TIMEZONE, getDayBoundsSP, getMonthBoundsSP } from "../utils/date.js";

const osRepository = new OrdemDeServicoRepository();
const dashboardRepository = new DashboardRepository();

export class DashboardController {
  async getDashboardData(req: Request, res: Response) {
    try {
      const now = dayjs().tz(TIMEZONE);
      
      // For exact timestamp based fields (LivroCaixa, PagamentoCliente) we use SP bounds:
      const startOfDaySP = now.startOf("day").toDate();
      const endOfDaySP = now.endOf("day").toDate();

      // For ContasPagar, the dates are stored strictly as UTC midnight (e.g., 2026-06-18T00:00:00Z)
      // So we must compare them using UTC boundaries matching the YYYY-MM-DD string exactly!
      const todayStr = now.format("YYYY-MM-DD");
      const tomorrowStr = now.add(1, 'day').format("YYYY-MM-DD");
      
      const startOfDayUTC = dayjs.utc(todayStr).startOf("day").toDate();
      const endOfDayUTC = dayjs.utc(todayStr).endOf("day").toDate();

      const tomorrowStartUTC = dayjs.utc(tomorrowStr).startOf('day').toDate();
      const tomorrowEndUTC = dayjs.utc(tomorrowStr).endOf('day').toDate();

      const next7DaysStartUTC = dayjs.utc(now.add(2, 'day').format("YYYY-MM-DD")).startOf('day').toDate();
      const next7DaysEndUTC = dayjs.utc(now.add(8, 'day').format("YYYY-MM-DD")).endOf('day').toDate();
      
      const endOfMonthUTC = dayjs.utc(now.endOf('month').format("YYYY-MM-DD")).endOf('day').toDate();

      // --- AGGREGATIONS / COUNTS ---

      // 1. Serviços em Aberto
      const osAberta = await dashboardRepository.getOsAbertas();

      // Overdue: status PENDENTE and date < today (startOfDayUTC)
      const contasPagarOverdue = await dashboardRepository.getContasPagarOverdue(startOfDayUTC);

      // Hoje
      const contasPagarHojeList = await dashboardRepository.getContasPagarPorPeriodo(startOfDayUTC, endOfDayUTC);
      const contasPagarHojeCount = contasPagarHojeList.length;
      const contasPagarHojeValor = contasPagarHojeList.reduce((sum, c) => sum + Number(c.valor), 0);

      // Amanhã
      const contasPagarAmanhaList = await dashboardRepository.getContasPagarPorPeriodo(tomorrowStartUTC, tomorrowEndUTC);
      const contasPagarAmanhaCount = contasPagarAmanhaList.length;
      const contasPagarAmanhaValor = contasPagarAmanhaList.reduce((sum, c) => sum + Number(c.valor), 0);

      // Próximos 7 Dias (Sem Hoje e Amanhã)
      const contasPagar7DiasList = await dashboardRepository.getContasPagarPorPeriodo(next7DaysStartUTC, next7DaysEndUTC);
      const contasPagar7DiasCount = contasPagar7DiasList.length;
      const contasPagar7DiasValor = contasPagar7DiasList.reduce((sum, c) => sum + Number(c.valor), 0);

      // Fim do Mês
      const contasPagarFimMesList = await dashboardRepository.getContasPagarPorPeriodo(startOfDayUTC, endOfMonthUTC);
      const contasPagarFimMesCount = contasPagarFimMesList.length;
      const contasPagarFimMesValor = contasPagarFimMesList.reduce((sum, c) => sum + Number(c.valor), 0);

      // 3. Livro Caixa Entries (Today)
      const libroCaixaEntries = await dashboardRepository.getLivroCaixaEntries(startOfDaySP, endOfDaySP);

      // 4. Livro Caixa Exits (Today)
      const libroCaixaExits = await dashboardRepository.getLivroCaixaExits(startOfDaySP, endOfDaySP);

      // 5. Auto Peças Pendentes
      const autoPecasPendentes = await dashboardRepository.getAutoPecasPendentes();

      // 6. Consolidação
      const consolidacao = await dashboardRepository.getConsolidacao();

      // 7. Alerta de Estoque
      const pecasComAlerta = await dashboardRepository.getPecasComAlerta();
      const alertaEstoque = pecasComAlerta.filter(
        (p) => Number(p.estoque_atual) <= Number(p.estoque_minimo || 0),
      ).length;

      // 8. Recent OSs (Strict Limit, light includes)
      const recentOss = await osRepository.findRecent(30);

      res.json({
        stats: {
          osAberta,
          contasPagarFimMesCount,
          contasPagarFimMesValor,
          contasPagarOverdue,
          contasPagarHojeCount,
          contasPagarHojeValor,
          contasPagarAmanhaCount,
          contasPagarAmanhaValor,
          contasPagar7DiasCount,
          contasPagar7DiasValor,
          livroCaixaEntries: libroCaixaEntries,
          livroCaixaExits: libroCaixaExits,
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
