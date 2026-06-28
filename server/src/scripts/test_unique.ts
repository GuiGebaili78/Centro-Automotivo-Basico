import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const nome = 'Peca Teste ' + Date.now();
    const fabricante = 'Fab Teste';
    const ref_cod = 'REF123';
    
    // 1. Create a part
    const part = await prisma.produto.create({
      data: {
        nome,
        fabricante,
        modelo: 'Geral',
        descricao: 'Teste',
        ref_cod,
        preco_custo_atual: 10,
        preco_venda_atual: 20,
        saldo_atual: 1,
        estoque_minimo: 0,
      }
    });

    console.log('Created part', part.id_produto);

    // 2. Update it with exactly the same unique fields but different value
    try {
      const updated = await prisma.produto.update({
        where: { id_produto: part.id_produto },
        data: {
          nome,
          fabricante,
          estoque_minimo: 5 // changed
        }
      });
      console.log('Updated successfully', updated.estoque_minimo);
    } catch (e: any) {
      console.log('Update Error Code:', e.code);
      throw e;
    }

    // 3. Clean up
    await prisma.produto.delete({ where: { id_produto: part.id_produto } });

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
