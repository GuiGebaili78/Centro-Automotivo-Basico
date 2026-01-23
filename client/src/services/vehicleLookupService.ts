import axios from "axios";

// Configuração de APIs
// Primária: BrasilAPI (FIPE baseado na placa) - Gratuita, sem chave
const API_PRIMARY_URL = "https://brasilapi.com.br/api/fipe/placa/v1";

// Secundária: Placeholder para futura implementação (Ex: Sinesp wrapper público)
// const API_SECONDARY_URL = '...';

export interface VehicleData {
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano: string;
  combustivel: string;
  chassi: string;
  extra?: any;
}

/**
 * Busca informações do veículo pela placa utilizando estratégia de fallback.
 * @param placa Placa do veículo (pode incluir traços)
 * @returns Objeto com dados do veículo ou lança erro se não encontrar
 */
export const fetchVehicleData = async (placa: string): Promise<VehicleData> => {
  // Remove caracteres não alfanuméricos
  const cleanPlate = placa.replace(/[^a-zA-Z0-9]/g, "");

  if (cleanPlate.length !== 7) {
    throw new Error("Placa inválida");
  }

  // Tentativa 1: BrasilAPI
  try {
    const response = await axios.get(`${API_PRIMARY_URL}/${cleanPlate}`, {
      timeout: 5000, // 5 seconds timeout
    });
    const data = response.data;

    // Normalização dos dados da BrasilAPI
    return {
      placa: cleanPlate.toUpperCase(),
      marca: data.marca || "",
      modelo: data.modelo || "",
      ano: data.anoModelo?.toString() || data.ano?.toString() || "",
      cor: data.cor || "", // BrasilAPI FIPE muitas vezes não retorna COR da unidade física
      combustivel: data.combustivel || "Flex",
      chassi: data.chassi || "",
      extra: data,
    };
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.warn(
        `[VehicleLookup] Placa ${placa} não encontrada na base (404).`,
      );
    } else {
      console.error(`[VehicleLookup] Erro de conexão ou API:`, error.message);
    }

    // Tentativa 2: Implementar aqui lógica para API secundária se houver
    // Por enquanto, lançamos erro para acionar o fallback manual na interface

    throw new Error("Veículo não encontrado nas bases de dados automáticas.");
  }
};
