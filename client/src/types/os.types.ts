import type { IOrdemDeServico, IItensOs, IPagamentoPeca } from "./backend";

export const OsStatus = {
  AGENDAMENTO: "AGENDAMENTO",
  ORCAMENTO: "ORCAMENTO",
  ABERTA: "ABERTA",
  FINANCEIRO: "FINANCEIRO",
  FINALIZADA: "FINALIZADA",
  CANCELADA: "CANCELADA",
} as const;

export type OsStatus = (typeof OsStatus)[keyof typeof OsStatus];

export interface IItemOsDetalhado extends IItensOs {
  pecas_estoque?: {
    valor_custo: number;
    nome: string;
  };
  pagamentos_peca?: IPagamentoPeca[];
}

export interface IOrdemDeServicoDetalhada extends IOrdemDeServico {
  itens_os: IItemOsDetalhado[]; // Override with detailed items
  // Add other specific relations used in frontend if not present in generic IOrdemDeServico
}

export interface ILaborService {
  id_servico_mao_de_obra?: number;
  id_temporary?: string; // Para modo draft
  id_funcionario: number | string;
  valor: number | string;
  descricao?: string | null;
  categoria?: string; // 'MECANICA' | 'ELETRICA'
  funcionario?: {
    pessoa_fisica?: {
      pessoa?: {
        nome: string;
      };
    };
  };
}
