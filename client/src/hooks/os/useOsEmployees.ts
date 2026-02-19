import { useState, useEffect } from "react";
import { api } from "../../services/api";
import type { IFuncionario } from "../../types/backend";
import { toast } from "react-toastify";

export const useOsEmployees = () => {
  const [employees, setEmployees] = useState<IFuncionario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const response = await api.get("/funcionario");
        setEmployees(response.data);
      } catch (error) {
        console.error("Erro ao carregar funcionários", error);
        toast.error("Erro ao carregar lista de funcionários.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading };
};
