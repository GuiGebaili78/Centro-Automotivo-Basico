import type { IPagamentoPeca, IPagamentoCliente } from "../types/backend";
import type { ICashBookEntry } from "../types/financeiro.types";

export const calculateCashBookEntries = (
  payments: IPagamentoPeca[],
  inflows: IPagamentoCliente[],
): ICashBookEntry[] => {
  // Map Outflows (Payments to Suppliers)
  const outflows: ICashBookEntry[] = payments
    .filter((p) => p.pago_ao_fornecedor && p.data_pagamento_fornecedor)
    .map((p) => ({
      id: `out-${p.id_pagamento_peca}`,
      date: p.data_pagamento_fornecedor || p.data_compra,
      description: `Pagamento Fornecedor - ${p.item_os?.descricao || "Peça"}`,
      type: "OUT",
      value: Number(p.custo_real),
      details: `OS Nº ${p.item_os?.id_os || "?"} - ${p.fornecedor?.nome || "Fornecedor"}`,
    }));

  // Map Inflows (Payments from Clients)
  const inflowsMapped: ICashBookEntry[] = (inflows || []).map((p) => ({
    id: `in-${p.id_pagamento_cliente}`,
    date: p.data_pagamento,
    description: `Recebimento OS Nº ${p.id_os || "?"}`,
    type: "IN",
    value: Number(p.valor),
    details: `Forma: ${p.metodo_pagamento}`,
  }));

  return [...outflows, ...inflowsMapped].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};
