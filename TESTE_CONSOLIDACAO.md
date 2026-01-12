# 🔍 DIAGNÓSTICO - PROBLEMAS DE CONSOLIDAÇÃO

## PROBLEMAS REPORTADOS:

1. ❌ PIX aparece no caixa mas NÃO na conta bancária
2. ❌ Crédito aparece em recebíveis mas NÃO no caixa
3. ❌ Extrato não mostra movimentações (só saldo)

## POSSÍVEIS CAUSAS:

### Problema 1: PIX não atualiza conta
**Causa provável**: `id_conta_bancaria` não está sendo salvo no `PagamentoCliente`
**Solução**: Verificar se o campo está sendo enviado do frontend

### Problema 2: Crédito não aparece no caixa
**Causa provável**: Lançamento no caixa não está sendo criado para cartões
**Solução**: Verificar lógica de consolidação (linhas 148-185 do repository)

### Problema 3: Extrato não mostra movimentações
**Causa provável**: Movimentações não têm `id_conta_bancaria` vinculado
**Solução**: Verificar se consolidação está criando lançamentos com `id_conta_bancaria`

## CHECKLIST DE VERIFICAÇÃO:

- [ ] Frontend está enviando `id_conta_bancaria` para PIX/Dinheiro?
- [ ] Frontend está enviando `id_operadora` para Cartões?
- [ ] Backend está recebendo esses campos?
- [ ] Consolidação está criando lançamentos no caixa?
- [ ] Consolidação está vinculando `id_conta_bancaria` aos lançamentos?
- [ ] Consolidação está atualizando saldo bancário?

## PRÓXIMOS PASSOS:

1. Testar novamente após correção do status (mudança para PRONTO PARA FINANCEIRO antes de consolidar)
2. Verificar logs do servidor para erros
3. Verificar banco de dados diretamente se necessário
