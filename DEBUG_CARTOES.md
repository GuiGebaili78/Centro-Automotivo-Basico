# 🔍 CHECKLIST DE DEBUG - CARTÕES NO CAIXA

## TESTE PASSO A PASSO:

### 1. Criar OS com Cartão de Crédito 3x

1. Criar nova OS
2. Adicionar pagamento Crédito 3x de R$ 300,00
3. **IMPORTANTE**: Selecionar operadora (ex: Stone, Cielo)
4. Salvar pagamento
5. Ir em Fechamento Financeiro
6. Clicar em "Salvar e Finalizar"

### 2. Verificar Console do Navegador (F12)

Procurar por erros ou mensagens

### 3. Verificar Banco de Dados

Execute no PostgreSQL:

```sql
-- Verificar se pagamento tem id_operadora
SELECT 
  id_pagamento_cliente,
  metodo_pagamento,
  valor,
  id_operadora,
  id_conta_bancaria
FROM pagamento_cliente
ORDER BY id_pagamento_cliente DESC
LIMIT 5;

-- Verificar se lançamento foi criado no caixa
SELECT 
  id_livro_caixa,
  descricao,
  valor,
  tipo_movimentacao,
  categoria,
  dt_movimentacao
FROM livro_caixa
ORDER BY id_livro_caixa DESC
LIMIT 10;

-- Verificar se recebíveis foram criados
SELECT 
  id_recebivel,
  id_os,
  id_operadora,
  num_parcela,
  total_parcelas,
  valor_bruto,
  valor_liquido,
  status
FROM recebivel_cartao
ORDER BY id_recebivel DESC
LIMIT 10;
```

### 4. Resultados Esperados:

✅ `pagamento_cliente.id_operadora` deve ter um valor (não null)
✅ Deve existir 1 lançamento no `livro_caixa` com descrição "Faturamento CREDITO - OS #X"
✅ Devem existir 3 registros em `recebivel_cartao` (uma para cada parcela)

### 5. Se `id_operadora` for NULL:

**Problema**: Frontend não está enviando a operadora
**Solução**: Verificar se o select de operadora está funcionando no formulário verde

### 6. Se `id_operadora` existe mas não tem lançamento no caixa:

**Problema**: Consolidação não está executando ou está falhando
**Solução**: Verificar logs do servidor Docker

```bash
docker compose logs api --tail=100
```

---

## PRÓXIMO PASSO:

Execute o teste acima e me informe:
1. O valor de `id_operadora` no banco
2. Se existe lançamento no caixa
3. Se existem recebíveis
4. Qualquer erro no console ou logs
