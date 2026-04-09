export class CalculadoraPagamentoService {
  /**
   * Calcula o desmembramento de um pagamento considerando a taxa da operadora e o parcelamento.
   * 
   * A regra de negócio:
   * A) Se o Lojista assume os juros (tipoParcelamento === 'LOJA'): 
   *    Desconta-se do lojista (taxa_base_pct + taxa_juros_pct). O cliente paga o valor original (bruto).
   * B) Se o Cliente assume os juros (tipoParcelamento === 'CLIENTE'):
   *    Adiciona-se taxa_juros_pct ao valor final do cliente. Do lojista, desconta-se apenas a taxa_base_pct.
   * 
   * @param valorBrutoOriginal Valor do serviço/peça antes de juros
   * @param taxaBasePct A taxa fixa ou base aplicada pela operadora (ex: 2.5 para 2.5%)
   * @param taxaJurosPct A taxa adicional por causa do parcelamento (ex: 3.0 para 3.0%)
   * @param tipoParcelamento 'LOJA' | 'CLIENTE'
   * 
   * @returns objeto contendo valorPagoPeloCliente, descontoLojistaTotal, valorLiquidoLojista
   */
  static calcular(
    valorBrutoOriginal: number,
    taxaBasePct: number,
    taxaJurosPct: number,
    tipoParcelamento: 'LOJA' | 'CLIENTE'
  ) {
    let valorPagoPeloCliente = valorBrutoOriginal;
    let descontoLojistaTotal = 0;
    
    if (tipoParcelamento === 'LOJA') {
      // LOJISTA assume tudo: taxa base + taxa juros.
      // O cliente paga exatamente o valor do produto.
      const taxaTotalPct = taxaBasePct + taxaJurosPct;
      descontoLojistaTotal = (valorBrutoOriginal * taxaTotalPct) / 100;
      
    } else if (tipoParcelamento === 'CLIENTE') {
      // CLIENTE assume apenas os juros do parcelamento.
      // E o LOJISTA assume apenas a taxa base administrativa do meio de pagamento.
      // Primeiro calculamos o montante que o cliente vai pagar (com juros sobre o valor base)
      valorPagoPeloCliente = valorBrutoOriginal + ((valorBrutoOriginal * taxaJurosPct) / 100);
      
      // O lojista paga a taxa administrativa (base) que a operadora cobra sobre o valor total transacionado
      descontoLojistaTotal = (valorPagoPeloCliente * taxaBasePct) / 100;
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
