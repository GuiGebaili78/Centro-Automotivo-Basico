import { prisma } from "../prisma.js";

export class CategoriaEstoqueRepository {
  async findAll() {
    return await prisma.categoriaEstoque.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
  }

  async create(data: { nome: string }) {
    // Normalizing name slightly, assuming frontend might send whitespace
    const nomeNormalizado = data.nome.trim();
    
    // Check if already exists
    const existente = await prisma.categoriaEstoque.findUnique({
      where: { nome: nomeNormalizado }
    });

    if (existente) {
      if (!existente.ativo) {
        // reactivate
        return await prisma.categoriaEstoque.update({
          where: { id_categoria: existente.id_categoria },
          data: { ativo: true }
        });
      }
      return existente;
    }

    return await prisma.categoriaEstoque.create({
      data: {
        nome: nomeNormalizado,
      },
    });
  }

  async update(id: number, data: { nome: string }) {
    const nomeNormalizado = data.nome.trim();

    // Check if another category with the same name exists
    const existente = await prisma.categoriaEstoque.findFirst({
      where: { 
        nome: nomeNormalizado,
        id_categoria: { not: id }
      }
    });

    if (existente) {
      throw new Error("Já existe uma categoria com este nome.");
    }

    return await prisma.categoriaEstoque.update({
      where: { id_categoria: id },
      data: { nome: nomeNormalizado },
    });
  }

  async delete(id: number, replacementId?: number) {
    // If replacementId is provided, we reassign all parts using this category
    if (replacementId) {
      await prisma.pecasEstoque.updateMany({
        where: { id_categoria: id },
        data: { id_categoria: replacementId }
      });
    } else {
      // Check if there are parts using this category
      const pecasVinculadas = await prisma.pecasEstoque.count({
        where: { id_categoria: id }
      });

      if (pecasVinculadas > 0) {
        throw new Error(`Esta categoria está vinculada a ${pecasVinculadas} peça(s). Escolha uma categoria substituta para poder excluí-la.`);
      }
    }

    return await prisma.categoriaEstoque.delete({
      where: { id_categoria: id },
    });
  }
}
