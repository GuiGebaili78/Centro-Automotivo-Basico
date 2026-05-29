import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const query = `
    SELECT 
      'man-' || lc.id_livro_caixa as id,
      lc.id_livro_caixa as "rawId",
      lc.dt_movimentacao as date,
      lc.descricao as description,
      CASE WHEN lc.tipo_movimentacao = 'ENTRADA' THEN 'IN' ELSE 'OUT' END as type,
      lc.valor as value,
      lc.categoria as category,
      NULL as vehicle,
      NULL as client,
      NULL as supplier,
      lc.obs as obs,
      CASE WHEN lc.origem = 'AUTOMATICA' THEN 'AUTO' ELSE 'MANUAL' END as source,
      lc.deleted_at,
      cb.nome as conta_bancaria,
      NULL as "paymentMethod",
      NULL::int as os_id
    FROM livro_caixa lc
    LEFT JOIN conta_bancaria cb ON lc.id_conta_bancaria = cb.id_conta
    WHERE (lc.categoria != 'CONCILIACAO_CARTAO' OR lc.categoria IS NULL)

    UNION ALL

    SELECT
      'out-' || pp.id_pagamento_peca as id,
      pp.id_pagamento_peca as "rawId",
      COALESCE(pp.data_pagamento_fornecedor, pp.data_compra) as date,
      'OS Nº ' || os.id_os || ' - ' || COALESCE(v.modelo, 'Veículo') as description,
      'OUT' as type,
      pp.custo_real as value,
      'Auto Peças' as category,
      v.placa || ' - ' || v.modelo as vehicle,
      COALESCE(pf.nome, pj.nome_fantasia, pj.razao_social) as client,
      f.nome as supplier,
      '' as obs,
      'AUTO' as source,
      pp.deleted_at,
      NULL as conta_bancaria,
      NULL as "paymentMethod",
      os.id_os as os_id
    FROM pagamento_peca pp
    JOIN itens_os io ON pp.id_item_os = io.id_iten
    JOIN ordem_de_servico os ON io.id_os = os.id_os
    LEFT JOIN veiculo v ON os.id_veiculo = v.id_veiculo
    LEFT JOIN cliente c ON os.id_cliente = c.id_cliente
    LEFT JOIN pessoa_fisica p_f ON c.id_pessoa_fisica = p_f.id_pessoa_fisica
    LEFT JOIN pessoa pf ON p_f.id_pessoa = pf.id_pessoa
    LEFT JOIN pessoa_juridica p_j ON c.id_pessoa_juridica = p_j.id_pessoa_juridica
    LEFT JOIN pessoa pj ON p_j.id_pessoa = pj.id_pessoa
    LEFT JOIN pessoa f ON pp.id_pessoa = f.id_pessoa
    WHERE pp.id_livro_caixa IS NULL 
      AND ( (pp.pago_ao_fornecedor = true AND pp.data_pagamento_fornecedor IS NOT NULL) OR pp.deleted_at IS NOT NULL )

    UNION ALL

    SELECT
      'in-' || pc.id_pagamento_cliente as id,
      pc.id_pagamento_cliente as "rawId",
      pc.data_pagamento as date,
      'Serviços: OS Nº ' || os.id_os as description,
      'IN' as type,
      pc.valor as value,
      'Receita' as category,
      v.placa || ' - ' || v.modelo as vehicle,
      COALESCE(pf.nome, pj.nome_fantasia, pj.razao_social) as client,
      NULL as supplier,
      pc.obs as obs,
      'AUTO' as source,
      pc.deleted_at,
      COALESCE(cb.nome, op.nome) as conta_bancaria,
      pc.metodo_pagamento as "paymentMethod",
      os.id_os as os_id
    FROM pagamento_cliente pc
    JOIN ordem_de_servico os ON pc.id_os = os.id_os
    LEFT JOIN veiculo v ON os.id_veiculo = v.id_veiculo
    LEFT JOIN cliente c ON os.id_cliente = c.id_cliente
    LEFT JOIN pessoa_fisica p_f ON c.id_pessoa_fisica = p_f.id_pessoa_fisica
    LEFT JOIN pessoa pf ON p_f.id_pessoa = pf.id_pessoa
    LEFT JOIN pessoa_juridica p_j ON c.id_pessoa_juridica = p_j.id_pessoa_juridica
    LEFT JOIN pessoa pj ON p_j.id_pessoa = pj.id_pessoa
    LEFT JOIN conta_bancaria cb ON pc.id_conta_bancaria = cb.id_conta
    LEFT JOIN operadora_cartao op ON pc.id_operadora = op.id_operadora
    WHERE pc.id_livro_caixa IS NULL
    
    LIMIT 10
  `;

  try {
    const res = await prisma.$queryRawUnsafe(query);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
