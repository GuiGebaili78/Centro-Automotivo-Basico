import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { FinanceiroService } from "../services/financeiro.service";
import { api } from "../services/api";
import { toast } from "react-toastify";

interface AlertsContextType {
  isContasModalOpen: boolean;
  setIsContasModalOpen: (open: boolean) => void;
  isClosingModalOpen: boolean;
  setIsClosingModalOpen: (open: boolean) => void;
  showWarningIcon: boolean;
  pendingContasCount: number;
  pendingRecebiveisCount: number;
  isLoading: boolean;
  checkPendingContasAndRecebiveis: () => Promise<void>;
  triggerClosingModal: () => void;
  serverTimeOffset: number;
  getSyncedDate: () => Date;
}

const AlertsContext = createContext<AlertsContextType>({} as AlertsContextType);

export const AlertsProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [isContasModalOpen, setIsContasModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [showWarningIcon, setShowWarningIcon] = useState(false);
  const [pendingContasCount, setPendingContasCount] = useState(0);
  const [pendingRecebiveisCount, setPendingRecebiveisCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sincronização de horário
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  // Timeouts refs para cancelamento seguro no unmount
  const timeout1430Ref = useRef<any>(null);
  const timeout1500Ref = useRef<any>(null);
  const timeout1730Ref = useRef<any>(null);
  const timeoutRolloverRef = useRef<any>(null);

  // Retorna a data sincronizada com o horário do servidor
  const getSyncedDate = useCallback(() => {
    return new Date(Date.now() + offsetRef.current);
  }, []);

  // Formata data em YYYY-MM-DD
  const getYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Função para deletar chaves antigas de dias anteriores
  const cleanupLocalStorageCache = useCallback((todayStr: string) => {
    const keys = [
      "@CentroAutomotivo:alert_recebiveis_date",
      "@CentroAutomotivo:alert_contas_preventivo_date",
      "@CentroAutomotivo:alert_encerramento_turno_date"
    ];
    keys.forEach(key => {
      const savedDate = localStorage.getItem(key);
      if (savedDate && savedDate !== todayStr) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Limpa todos os agendamentos pendentes
  const clearAllScheduledAlerts = () => {
    if (timeout1430Ref.current) clearTimeout(timeout1430Ref.current);
    if (timeout1500Ref.current) clearTimeout(timeout1500Ref.current);
    if (timeout1730Ref.current) clearTimeout(timeout1730Ref.current);
    if (timeoutRolloverRef.current) clearTimeout(timeoutRolloverRef.current);
  };

  // Faz a verificação no banco sobre contas e recebíveis do dia
  const checkPendingContasAndRecebiveis = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const todayStr = getYYYYMMDD(getSyncedDate());
      
      const [contas, recebiveis] = await Promise.all([
        FinanceiroService.getContasPagar(),
        FinanceiroService.getRecebiveisCartao()
      ]);

      const pendingContas = contas.filter(c => {
        const vencDate = c.dt_vencimento.split("T")[0];
        return vencDate === todayStr && c.status === "PENDENTE";
      });

      const pendingRecebiveis = recebiveis.filter(r => {
        const prevDate = r.data_prevista.split("T")[0];
        return prevDate === todayStr && r.status === "PENDENTE";
      });

      setPendingContasCount(pendingContas.length);
      setPendingRecebiveisCount(pendingRecebiveis.length);

      // Ícone estático discreto no Header é renderizado até que as contas de hoje sejam pagas
      if (pendingContas.length > 0) {
        setShowWarningIcon(true);
      } else {
        setShowWarningIcon(false);
      }
    } catch (error) {
      console.error("[AlertsContext] Erro ao verificar pendências financeiras:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getSyncedDate]);

  // Executa o agendamento de timeouts baseado no horário do servidor (Zero Polling)
  const scheduleDailyAlerts = useCallback(async () => {
    if (!isAuthenticated) return;

    clearAllScheduledAlerts();

    try {
      // 1. Sincroniza a hora do servidor
      const response = await api.get("/auth/time");
      const serverTimeStr = response.data.serverTime;
      const serverDate = new Date(serverTimeStr);
      const localTime = Date.now();
      const newOffset = serverDate.getTime() - localTime;
      
      setOffset(newOffset);
      offsetRef.current = newOffset;

      const syncedNow = new Date(Date.now() + newOffset);
      const todayStr = getYYYYMMDD(syncedNow);

      // 2. Limpeza automática de chaves do localStorage de dias anteriores
      cleanupLocalStorageCache(todayStr);

      // 3. Verifica pendências no mount para atualizar o estado do Header imediatamente
      await checkPendingContasAndRecebiveis();

      // 4. Criando os instantes dos alertas para hoje
      const t1430 = new Date(syncedNow);
      t1430.setHours(14, 30, 0, 0);

      const t1500 = new Date(syncedNow);
      t1500.setHours(15, 0, 0, 0);

      const t1730 = new Date(syncedNow);
      t1730.setHours(17, 30, 0, 0);

      const nowMs = syncedNow.getTime();

      // --- Alerta 14h30 (Preventivo de Contas a Pagar) ---
      if (t1430.getTime() > nowMs) {
        const delay1430 = t1430.getTime() - nowMs;
        timeout1430Ref.current = setTimeout(async () => {
          const fired = localStorage.getItem("@CentroAutomotivo:alert_contas_preventivo_date") === todayStr;
          if (!fired) {
            // Re-checa se realmente existem contas pendentes antes de abrir o modal
            const contas = await FinanceiroService.getContasPagar();
            const pendingContas = contas.filter(c => {
              const vencDate = c.dt_vencimento.split("T")[0];
              return vencDate === todayStr && c.status === "PENDENTE";
            });

            if (pendingContas.length > 0) {
              setPendingContasCount(pendingContas.length);
              setShowWarningIcon(true);
              setIsContasModalOpen(true);
            }
            localStorage.setItem("@CentroAutomotivo:alert_contas_preventivo_date", todayStr);
          }
        }, delay1430);
      }

      // --- Alerta 15h00 (Recebíveis - Toast) ---
      if (t1500.getTime() > nowMs) {
        const delay1500 = t1500.getTime() - nowMs;
        timeout1500Ref.current = setTimeout(() => {
          const fired = localStorage.getItem("@CentroAutomotivo:alert_recebiveis_date") === todayStr;
          if (!fired) {
            toast.info(
              <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-900 text-sm">Atenção Operacional</span>
                <span className="text-xs text-slate-700">Horário recomendado para conferência e baixa dos recebíveis do dia.</span>
              </div>,
              {
                autoClose: 10000,
                closeOnClick: true,
                draggable: true,
                position: "top-right"
              }
            );
            localStorage.setItem("@CentroAutomotivo:alert_recebiveis_date", todayStr);
          }
        }, delay1500);
      }

      // --- Alerta 17h30 (Encerramento de Turno - Modal) ---
      if (t1730.getTime() > nowMs) {
        const delay1730 = t1730.getTime() - nowMs;
        timeout1730Ref.current = setTimeout(async () => {
          const fired = localStorage.getItem("@CentroAutomotivo:alert_encerramento_turno_date") === todayStr;
          if (!fired) {
            await checkPendingContasAndRecebiveis();
            setIsClosingModalOpen(true);
            localStorage.setItem("@CentroAutomotivo:alert_encerramento_turno_date", todayStr);
          }
        }, delay1730);
      }

      // --- Agendamento de Rollover de Meia-Noite ---
      const rolloverTime = new Date(syncedNow);
      rolloverTime.setHours(24, 0, 5, 0); // 00:00:05 do dia seguinte
      const delayRollover = rolloverTime.getTime() - nowMs;
      
      timeoutRolloverRef.current = setTimeout(() => {
        scheduleDailyAlerts();
      }, delayRollover);

    } catch (err) {
      console.error("[AlertsContext] Falha ao sincronizar e agendar alertas do dia:", err);
      // Fallback em caso de erro na API: tenta novamente em 10 segundos
      timeoutRolloverRef.current = setTimeout(() => {
        scheduleDailyAlerts();
      }, 10000);
    }
  }, [isAuthenticated, checkPendingContasAndRecebiveis, cleanupLocalStorageCache]);

  // Inicia e reinicia agendamentos conforme status de autenticação
  useEffect(() => {
    if (isAuthenticated) {
      scheduleDailyAlerts();
    } else {
      clearAllScheduledAlerts();
      setIsContasModalOpen(false);
      setIsClosingModalOpen(false);
      setShowWarningIcon(false);
      setPendingContasCount(0);
      setPendingRecebiveisCount(0);
    }

    return () => clearAllScheduledAlerts();
  }, [isAuthenticated, scheduleDailyAlerts]);

  // Função manual para abrir o modal de Encerramento de Turno
  const triggerClosingModal = () => {
    checkPendingContasAndRecebiveis().then(() => {
      setIsClosingModalOpen(true);
    });
  };

  return (
    <AlertsContext.Provider
      value={{
        isContasModalOpen,
        setIsContasModalOpen,
        isClosingModalOpen,
        setIsClosingModalOpen,
        showWarningIcon,
        pendingContasCount,
        pendingRecebiveisCount,
        isLoading,
        checkPendingContasAndRecebiveis,
        triggerClosingModal,
        serverTimeOffset: offset,
        getSyncedDate
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error("useAlerts deve ser usado dentro de um AlertsProvider");
  }
  return context;
};
