import { api } from "./api";
import type { IDashboardData } from "../types/dashboard.types";

export const DashboardService = {
  getDashboardData: async (): Promise<IDashboardData> => {
    const response = await api.get("/dashboard");
    return response.data;
  },
};
