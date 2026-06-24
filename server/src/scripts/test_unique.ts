import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const nome = 'Peca Teste ' + Date.now();
    const fabricante = 'Fab Teste';
    const ref_cod = 'REF123';
    
    // 1. Create a part
    const part = await prisma.pecasEstoque.create({
      data: {
        nome,
        fabricante,
        descricao: 'Teste',
        ref_cod,
        valor_custo: 10,
        valor_venda: 20,
        estoque_atual: 1,
        estoque_minimo: 0,
      }
    });

    console.log('Created part', part.id_pecas_estoque);

    // 2. Update it with exactly the same unique fields but different value
    try {
      const updated = await prisma.pecasEstoque.update({
        where: { id_pecas_estoque: part.id_pecas_estoque },
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
    await prisma.pecasEstoque.delete({ where: { id_pecas_estoque: part.id_pecas_estoque } });

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
