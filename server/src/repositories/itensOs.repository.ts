import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AuditLogRepository } from './auditLog.repository.js';
import { OrdemDeServicoRepository } from './ordemDeServico.repository.js';

const auditRepo = new AuditLogRepository();
const osRepo = new OrdemDeServicoRepository();

function mapProdutoToPecasEstoque(p: any): any {
  if (!p) return null;
  return {
    id_pecas_estoque: p.id_produto,
    nome: p.nome,
    fabricante: p.fabricante || null,
    descricao: p.descricao || p.nome,
    valor_custo: p.preco_custo_atual,
    valor_venda: p.preco_venda_atual,
    estoque_atual: p.saldo_atual,
    estoque_minimo: p.estoque_minimo,
    unidade_medida: p.unidade_medida || null,
    custo_unitario_padrao: p.custo_unitario_padrao,
    dt_ultima_compra: p.data_ultima_compra || null,
    dt_cadastro: p.dt_cadastro,
    ref_cod: p.ref_cod || null,
    localizacao: p.localizacao || null,
    aplicacao: p.aplicacao_equivalencia || null,
    modelo: p.modelo || null,
    id_categoria: p.id_categoria || null,
    categoria: p.categoria || null,
    ativo: p.ativo,
    itens_entrada: [],
    _count: p._count,
  };
}

function mapInputData(data: any): any {
  if (!data) return data;
  const mapped = { ...data };
  if (mapped.id_pecas_estoque !== undefined) {
    if (mapped.id_pecas_estoque) {
      mapped.id_produto = mapped.id_pecas_estoque;
    }
    delete mapped.id_pecas_estoque;
  }
  if (mapped.pecas_estoque !== undefined) {
    if (mapped.pecas_estoque) {
      mapped.produto = mapped.pecas_estoque;
    }
    delete mapped.pecas_estoque;
  }
  return mapped;
}

function mapItemOsToLegacy(item: any): any {
  if (!item) return item;
  const mapped = { ...item };
  if (mapped.id_produto !== undefined) {
    mapped.id_pecas_estoque = mapped.id_produto;
  }
  if (mapped.produto !== undefined) {
    mapped.pecas_estoque = mapProdutoToPecasEstoque(mapped.produto);
  }
  return mapped;
}

export class ItensOsRepository {
  async create(data: Prisma.ItensOsCreateInput, extraData?: { id_fornecedor?: number | null, custo_real?: number }) {
    const mappedData = mapInputData(data);
    return await prisma.$transaction(async (tx) => {
      const created = await tx.itensOs.create({
        data: mappedData,
        include: { ordem_de_servico: true, produto: true, pagamentos_peca: true }
      });
      
      await auditRepo.create({
          tabela: 'itens_os',
          registro_id: created.id_iten,
          acao: 'CREATE',
          valor_novo: created
      });

      // Se for uma peça externa (não vinda do estoque e não interna), cria registro de PagamentoPeca imediatamente
      const isFromStock = !!(mappedData.produto?.connect || mappedData.id_produto || (data as any).pecas_estoque?.connect || (data as any).id_pecas_estoque);
      if (!isFromStock && !data.is_interno) {
        await tx.pagamentoPeca.create({
          data: {
            id_item_os: created.id_iten,
            id_pessoa: extraData?.id_fornecedor || null,
            custo_real: extraData?.custo_real || 0,
            data_compra: new Date(),
            pago_ao_fornecedor: false,
          }
        });
      }

      // NOVO: Baixa imediata de estoque
      if (isFromStock && !data.is_interno && created.id_produto) {
        const produto = await tx.produto.findUnique({ where: { id_produto: created.id_produto } });
        if (!produto) throw new Error("Produto não encontrado no estoque.");
        if (produto.saldo_atual - created.quantidade < 0) {
           throw new Error(`Estoque insuficiente. Saldo atual: ${produto.saldo_atual}. Solicitado: ${created.quantidade}.`);
        }
        
        const produtoAtualizado = await tx.produto.update({
          where: { id_produto: created.id_produto },
          data: { saldo_atual: { decrement: created.quantidade } }
        });

        await tx.movimentacaoEstoque.create({
          data: {
             produto_id: created.id_produto,
             id_usuario: null,
             nome_usuario_snapshot: 'Sistema (OS)',
             tipo: 'SAIDA', // TipoMovimentacao.SAIDA
             quantidade: -created.quantidade,
             saldo_anterior: produto.saldo_atual,
             saldo_atual: produtoAtualizado.saldo_atual,
             custo_unitario_historico: produto.preco_custo_atual,
             preco_venda_historico: created.valor_venda,
             condicao: produto.condicao,
             origem: `OS #${created.id_os}`,
             obs: `Baixa imediata na inserção da OS #${created.id_os}`,
             id_os: created.id_os
          }
        });
      }

      // Recalculate OS totals
      await osRepo.recalculateTotals(created.id_os, tx);
      
      return mapItemOsToLegacy(created);
    });
  }

  async findAll(includeInternal: boolean = false) {
    const items = await prisma.itensOs.findMany({
        where: { 
          deleted_at: null,
          ...(includeInternal ? {} : { is_interno: false })
        },
        include: { ordem_de_servico: true, produto: true, pagamentos_peca: true }
    });
    return items.map(mapItemOsToLegacy);
  }

  async findById(id: number) {
    const item = await prisma.itensOs.findUnique({
      where: { id_iten: id },
      include: { ordem_de_servico: true, produto: true, pagamentos_peca: true }
    });
    return mapItemOsToLegacy(item);
  }

  async findByOsId(idOs: number, includeInternal: boolean = false) {
    const items = await prisma.itensOs.findMany({
      where: { 
        id_os: idOs, 
        deleted_at: null,
        ...(includeInternal ? {} : { is_interno: false })
      },
      include: { produto: true, pagamentos_peca: true }
    });
    return items.map(mapItemOsToLegacy);
  }

  async update(id: number, data: Prisma.ItensOsUpdateInput, extraData?: { id_fornecedor?: number | null, custo_real?: number }) {
    const mappedData = mapInputData(data);
    return await prisma.$transaction(async (tx) => {
      const current = await this.findById(id); // Using global prisma for find is ok here since it's just reading
      const updated = await tx.itensOs.update({
        where: { id_iten: id },
        data: mappedData,
        include: { ordem_de_servico: true, produto: true, pagamentos_peca: true }
      });

      await auditRepo.create({
          tabela: 'itens_os',
          registro_id: id,
          acao: 'UPDATE',
          valor_antigo: current,
          valor_novo: updated
      });

      if (extraData && extraData.id_fornecedor !== undefined) {
          const existingPayments = await tx.pagamentoPeca.findMany({ where: { id_item_os: id } });
          
          if (existingPayments && existingPayments.length > 0) {
              if (extraData.id_fornecedor) {
                  const updateData: any = { id_pessoa: extraData.id_fornecedor };
                  if (extraData.custo_real !== undefined) updateData.custo_real = extraData.custo_real;
                  
                  await tx.pagamentoPeca.update({
                      where: { id_pagamento_peca: existingPayments[0]!.id_pagamento_peca },
                      data: updateData
                  });
              } else {
                  await tx.pagamentoPeca.update({
                      where: { id_pagamento_peca: existingPayments[0]!.id_pagamento_peca },
                      data: { id_pessoa: null }
                  });
              }
          } else if (extraData.id_fornecedor) {
              await tx.pagamentoPeca.create({
                data: {
                  id_item_os: id,
                  id_pessoa: extraData.id_fornecedor,
                  custo_real: extraData.custo_real || 0,
                  data_compra: new Date(),
                  pago_ao_fornecedor: false,
                }
              });
          }
      }

      // Recalculate OS totals
      await osRepo.recalculateTotals(updated.id_os, tx);

      return mapItemOsToLegacy(updated);
    });
  }

  async delete(id: number) {
    const current = await this.findById(id);
    if (!current) throw new Error('Item not found');

    const hasPaidPayment = current.pagamentos_peca?.some((p: any) => p.pago_ao_fornecedor && !p.deleted_at);
    if (hasPaidPayment) {
      throw new Error("A peça já foi paga ao fornecedor. Estorne o pagamento antes de removê-la da OS.");
    }

    return await prisma.$transaction(async (tx) => {
      // Soft-delete unpaid payments associated with this item to prevent orphans
      await tx.pagamentoPeca.updateMany({
        where: { id_item_os: id, pago_ao_fornecedor: false, deleted_at: null },
        data: { deleted_at: new Date() }
      });

      const updated = await tx.itensOs.update({
        where: { id_iten: id },
        data: { deleted_at: new Date() },
        include: { ordem_de_servico: true, produto: true, pagamentos_peca: true }
      });

      await auditRepo.create({
          tabela: 'itens_os',
          registro_id: id,
          acao: 'SOFT_DELETE',
          valor_antigo: current
      });
      
      // ESTORNO imediato
      if (current.id_pecas_estoque && !current.is_interno) {
         const produto = await tx.produto.findUnique({ where: { id_produto: current.id_pecas_estoque } });
         if (produto) {
            const produtoAtualizado = await tx.produto.update({
               where: { id_produto: current.id_pecas_estoque },
               data: { saldo_atual: { increment: current.quantidade } }
            });

            await tx.movimentacaoEstoque.create({
              data: {
                 produto_id: current.id_pecas_estoque,
                 id_usuario: null,
                 nome_usuario_snapshot: 'Sistema (OS)',
                 tipo: 'ESTORNO', // TipoMovimentacao.ESTORNO
                 quantidade: current.quantidade,
                 saldo_anterior: produto.saldo_atual,
                 saldo_atual: produtoAtualizado.saldo_atual,
                 custo_unitario_historico: produto.preco_custo_atual,
                 preco_venda_historico: current.valor_venda,
                 condicao: produto.condicao,
                 origem: `Remoção do item #${current.id_iten} da OS #${current.id_os}`,
                 obs: `Estorno por remoção da OS #${current.id_os}`,
                 id_os: current.id_os
              }
            });
         }
      }

      // Recalculate OS totals
      await osRepo.recalculateTotals(current.id_os, tx);

      return mapItemOsToLegacy(updated);
    });
  }

  async search(query: string) {
    // Busca descrições únicas na tabela de itens já usados
    const items = await prisma.itensOs.findMany({
      where: {
        descricao: { contains: query, mode: 'insensitive' },
        deleted_at: null
      },
      distinct: ['descricao'],
      take: 10
    });
    return items.map(mapItemOsToLegacy);
  }
}
