import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export class PagamentoClienteRepository {
  async create(data: Prisma.PagamentoClienteCreateInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Criar Pagamento
      const pagamento = await tx.pagamentoCliente.create({ data });

      // 2. Processamento Financeiro Imediato
      const p = pagamento as any; // Cast to avoid TS errors
      const metodo = (p.metodo_pagamento || '').toUpperCase();
      const idConta = p.id_conta_bancaria;

      // CASO 1: PIX (Vai pro Banco + Livro Caixa)
      if (metodo === 'PIX' && idConta) {
        const livroCaixa = await tx.livroCaixa.create({
          data: {
            descricao: `Venda PIX - OS #${p.id_os} (Antecipado)`,
            valor: p.valor,
            tipo_movimentacao: 'ENTRADA',
            categoria: 'VENDA',
            dt_movimentacao: new Date(),
            origem: 'AUTOMATICA',
            id_conta_bancaria: idConta // VINCULADO AO BANCO
          }
        });

        await tx.contaBancaria.update({
          where: { id_conta: idConta },
          data: { saldo_atual: { increment: p.valor } }
        });

        await tx.pagamentoCliente.update({
          where: { id_pagamento_cliente: p.id_pagamento_cliente },
          data: { id_livro_caixa: livroCaixa.id_livro_caixa } as any
        });
        console.log(`✅ [LC] PIX Imediato Criado: LC #${livroCaixa.id_livro_caixa} | Conta #${idConta} (+${p.valor})`);
      }

      // CASO 2: DINHEIRO (Vai SÓ pro Livro Caixa, SEM Banco)
      else if (metodo === 'DINHEIRO') {
        const livroCaixa = await tx.livroCaixa.create({
          data: {
            descricao: `Venda DINHEIRO - OS #${p.id_os} (Antecipado)`,
            valor: p.valor,
            tipo_movimentacao: 'ENTRADA',
            categoria: 'VENDA',
            dt_movimentacao: new Date(),
            origem: 'AUTOMATICA',
            id_conta_bancaria: null // NÃO VINCULADO AO BANCO
          }
        });

        // NÃO ATUALIZA SALDO BANCÁRIO

        await tx.pagamentoCliente.update({
          where: { id_pagamento_cliente: p.id_pagamento_cliente },
          data: { id_livro_caixa: livroCaixa.id_livro_caixa } as any
        });
        console.log(`✅ [LC] DINHEIRO Imediato Criado: LC #${livroCaixa.id_livro_caixa} (Sem impacto bancário)`);
      }

      return pagamento;
    });
  }

  async findAll() {
    return await prisma.pagamentoCliente.findMany({
        include: { 
          ordem_de_servico: {
            include: {
              veiculo: true,
              cliente: {
                include: {
                  pessoa_fisica: { include: { pessoa: true } },
                  pessoa_juridica: { include: { pessoa: true } }
                }
              }
            }
          }
        }
    });
  }

  async findById(id: number) {
    return await prisma.pagamentoCliente.findUnique({
      where: { id_pagamento_cliente: id },
      include: { ordem_de_servico: true }
    });
  }

  async update(id: number, data: Prisma.PagamentoClienteUpdateInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar estado anterior
      const oldPayment = await tx.pagamentoCliente.findUnique({ where: { id_pagamento_cliente: id } });
      if (!oldPayment) throw new Error("Pagamento não encontrado");
      const oldP = oldPayment as any;

      // 2. REVERSÃO (Se já tinha processamento financeiro)
      if (oldP.id_livro_caixa) {
        // Estornar saldo conta antiga (SE TIVER)
        if (oldP.id_conta_bancaria) {
            await tx.contaBancaria.update({
                where: { id_conta: oldP.id_conta_bancaria },
                data: { saldo_atual: { decrement: oldP.valor } }
            });
            console.log(`↺ [LC] Reversão Pagamento #${id}: Conta #${oldP.id_conta_bancaria} (-${oldP.valor})`);
        }
        
        // Remover entrada antiga livro caixa (SEMPRE)
        await tx.livroCaixa.delete({
            where: { id_livro_caixa: oldP.id_livro_caixa }
        });
      }

      // 3. Atualizar Pagamento (Desvinculando LC antigo se houver, pois foi deletado acima)
      const updatedPayment = await tx.pagamentoCliente.update({
        where: { id_pagamento_cliente: id },
        data: { ...data, id_livro_caixa: null } as any
      });

      // 4. NOVA APLICAÇÃO
      const newP = updatedPayment as any;
      const metodo = (newP.metodo_pagamento || '').toUpperCase();
      const idConta = newP.id_conta_bancaria;

      // CASO 1: PIX (Banco + LC)
      if (metodo === 'PIX' && idConta) {
         const livroCaixa = await tx.livroCaixa.create({
          data: {
            descricao: `Venda PIX - OS #${newP.id_os} (Atualizado)`,
            valor: newP.valor,
            tipo_movimentacao: 'ENTRADA',
            categoria: 'VENDA',
            dt_movimentacao: new Date(),
            origem: 'AUTOMATICA',
            id_conta_bancaria: idConta
          }
        });

        await tx.contaBancaria.update({
          where: { id_conta: idConta },
          data: { saldo_atual: { increment: newP.valor } }
        });

        await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: id },
            data: { id_livro_caixa: livroCaixa.id_livro_caixa } as any
        });
        console.log(`✅ [LC] PIX Atualizado: LC #${livroCaixa.id_livro_caixa} | Conta #${idConta} (+${newP.valor})`);
      }
      
      // CASO 2: DINHEIRO (Só LC)
      else if (metodo === 'DINHEIRO') {
         const livroCaixa = await tx.livroCaixa.create({
          data: {
            descricao: `Venda DINHEIRO - OS #${newP.id_os} (Atualizado)`,
            valor: newP.valor,
            tipo_movimentacao: 'ENTRADA',
            categoria: 'VENDA',
            dt_movimentacao: new Date(),
            origem: 'AUTOMATICA',
            id_conta_bancaria: null
          }
        });

        await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: id },
            data: { id_livro_caixa: livroCaixa.id_livro_caixa } as any
        });
        console.log(`✅ [LC] DINHEIRO Atualizado: LC #${livroCaixa.id_livro_caixa} (Sem impacto bancário)`);
      }


      return updatedPayment;
    });
  }

  async delete(id: number) {
    return await prisma.$transaction(async (tx) => {
        const payment = await tx.pagamentoCliente.findUnique({ where: { id_pagamento_cliente: id } });
        if (!payment) throw new Error("Pagamento não encontrado");
        const p = payment as any;

        // Estornar se tiver LC
        if (p.id_livro_caixa) {
             if (p.id_conta_bancaria) {
                 await tx.contaBancaria.update({
                     where: { id_conta: p.id_conta_bancaria },
                     data: { saldo_atual: { decrement: p.valor } }
                });
                console.log(`🗑️ [LC] Pagamento Excluído/Estornado #${id}: Conta #${p.id_conta_bancaria} (-${p.valor})`);
             }
             
            await tx.livroCaixa.delete({ where: { id_livro_caixa: p.id_livro_caixa } });
        }

        return await tx.pagamentoCliente.update({
          where: { id_pagamento_cliente: id },
          data: { deleted_at: new Date(), id_livro_caixa: null } as any
        });
    });
  }
}
