import { useState, useEffect, useCallback } from "react";
import { OsService } from "../../services/os.service";
import type { IOrdemDeServico } from "../../types/backend";
import { toast } from "react-toastify";

export const useOrdemServico = (id: string | undefined) => {
  const [os, setOs] = useState<IOrdemDeServico | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOsData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await OsService.getById(Number(id));
      setOs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar OS.");
      toast.error("Erro ao carregar OS.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOsData();
  }, [loadOsData]);

  const updateOSField = async (field: keyof IOrdemDeServico, value: any) => {
    if (!os) return;

    // Optimistic update
    setOs((prev) => (prev ? { ...prev, [field]: value } : null));

    try {
      await OsService.update(os.id_os, { [field]: value });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar alteração.");
      // Revert on error would be ideal, but keeping it simple for now as per previous logic
      loadOsData(); // Sync back
    }
  };

  const refetch = loadOsData;

  return { os, loading, error, updateOSField, refetch, setOs };
};
