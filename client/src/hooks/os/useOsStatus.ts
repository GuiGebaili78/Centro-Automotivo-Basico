import { useCallback } from "react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import { OsStatus } from "../../types/os.types";

export const useOsStatus = (
  osId: string | undefined,
  onSuccess?: () => void,
) => {
  const finishOS = useCallback(
    async (data: {
      valor_pecas: number;
      valor_mao_de_obra: number;
      valor_total_cliente: number;
      dt_entrega: string;
    }) => {
      if (!osId) return;
      try {
        await api.put(`/ordem-de-servico/${osId}`, {
          ...data,
          status: OsStatus.FINANCEIRO,
        });
        toast.success("OS Finalizada! Enviada para Financeiro.");
        if (onSuccess) onSuccess();
        return true;
      } catch (e) {
        toast.error("Erro ao finalizar OS.");
        return false;
      }
    },
    [osId, onSuccess],
  );

  const openOsNow = useCallback(async () => {
    if (!osId) return;
    try {
      await api.put(`/ordem-de-servico/${osId}`, { status: OsStatus.ABERTA });
      toast.success("OS Aberta com sucesso!");
      if (onSuccess) onSuccess();
      return true;
    } catch (e) {
      toast.error("Erro ao abrir OS.");
      return false;
    }
  }, [osId, onSuccess]);

  const reopenOS = useCallback(
    async (fechamentoId?: number) => {
      if (!osId) return;
      try {
        if (fechamentoId) {
          await api.delete(`/fechamento-financeiro/${fechamentoId}`);
        }
        await api.put(`/ordem-de-servico/${osId}`, { status: OsStatus.ABERTA });
        toast.success("OS Reaberta com sucesso!");
        if (onSuccess) onSuccess();
        return true;
      } catch (e) {
        toast.error("Erro ao reabrir OS.");
        return false;
      }
    },
    [osId, onSuccess],
  );

  const cancelOS = useCallback(async () => {
    if (!osId) return;
    try {
      await api.put(`/ordem-de-servico/${osId}`, {
        status: OsStatus.CANCELADA,
      });
      toast.success("OS Cancelada e Estoque Estornado.");
      if (onSuccess) onSuccess();
      return true;
    } catch (e) {
      toast.error("Erro ao cancelar OS.");
      return false;
    }
  }, [osId, onSuccess]);

  return { finishOS, openOsNow, reopenOS, cancelOS };
};
