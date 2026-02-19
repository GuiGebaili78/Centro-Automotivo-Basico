import { useState, useEffect } from "react";
import { api } from "../../services/api";
import type { IPecasEstoque } from "../../types/backend";

export const useOsParts = () => {
  const [availableParts, setAvailableParts] = useState<IPecasEstoque[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        const response = await api.get("/pecas-estoque");
        setAvailableParts(response.data);
      } catch (error) {
        console.error("Erro ao carregar peças", error);
        // Não mostrar toast aqui para não poluir, pois pode ser algo silencioso
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, []);

  return { availableParts, loading };
};
