export class CalculadoraPagamentoService {
  /**
   * Calcula o desmembramento de um pagamento considerando taxa da operadora e parcelamento.
   *
   * REGRAS DE NEGÓCIO:
   *
   * A) tipoParcelamento === 'LOJA' (Lojista assume tudo):
   *    - Cliente paga: Valor da OS (sem acréscimo)
   *    - Lojista desconta: (taxa_base_pct + taxa_juros_pct) sobre o valor bruto
   *
   * B) tipoParcelamento === 'CLIENTE' (Cliente assume os juros):
   *    - Cliente paga: Valor da OS + taxa_juros_pct (juros repassados)
   *    - Lojista desconta: APENAS taxa_base_cliente_pct sobre o valor TOTAL cobrado do cliente
   *      (não usa taxa_base_pct, que é a tarifa para quando a loja absorve os juros)
   *
   * @param valorBrutoOriginal  Valor do serviço antes de qualquer ajuste
   * @param taxaBasePct         Taxa máquina quando LOJA assume (ex: 2.5 para 2.5%)
   * @param taxaJurosPct        Juros do parcelamento (ex: 3.0 para 3.0%)
   * @param tipoParcelamento    'LOJA' | 'CLIENTE'
   * @param taxaBaseClientePct  Taxa máquina quando CLIENTE assume (nullable — fallback para taxaBasePct se null)
   */
  static calcular(
    valorBrutoOriginal: number,
    taxaBasePct: number,
    taxaJurosPct: number,
    tipoParcelamento: 'LOJA' | 'CLIENTE',
    taxaBaseClientePct?: number | null
  ) {
    let valorPagoPeloCliente = valorBrutoOriginal;
    let descontoLojistaTotal = 0;

    if (tipoParcelamento === 'LOJA') {
      // LOJISTA absorve tudo: taxa base + taxa juros.
      // Cliente paga exatamente o valor da OS.
      const taxaTotalPct = taxaBasePct + taxaJurosPct;
      descontoLojistaTotal = (valorBrutoOriginal * taxaTotalPct) / 100;

    } else if (tipoParcelamento === 'CLIENTE') {
      // CLIENTE assume os juros do parcelamento.
      // → Valor cobrado do cliente = Valor OS + juros
      valorPagoPeloCliente = valorBrutoOriginal + ((valorBrutoOriginal * taxaJurosPct) / 100);

      // Lojista paga a tarifa base específica para essa modalidade (taxa_base_cliente_pct).
      // Se não configurada, usa taxa_base_pct como fallback seguro.
      const tarifaLojista = (taxaBaseClientePct != null && taxaBaseClientePct > 0)
        ? taxaBaseClientePct
        : taxaBasePct;

      descontoLojistaTotal = (valorPagoPeloCliente * tarifaLojista) / 100;
    }

    const valorLiquidoLojista = valorPagoPeloCliente - descontoLojistaTotal;

    return {
      valorBrutoOriginal,
      valorPagoPeloCliente,
      descontoLojistaTotal,
      valorLiquidoLojista
    };
  }
}
