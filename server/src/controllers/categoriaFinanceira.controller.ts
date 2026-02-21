import { Request, Response } from "express";
import { prisma } from "../prisma.js";

// ── Corrige encoding UTF-8 mal interpretado (Latin-1 → UTF-8) ─────────────────
const fixEncoding = (str: string | null | undefined): string => {
  if (!str) return "";
  return (
    str
      // ── minúsculas ────────────────────────────────────────────────────────────
      .replace(/├º/g, "ç")
      .replace(/├ú/g, "ã")
      .replace(/├á/g, "à")
      .replace(/├í/g, "á")
      .replace(/├®/g, "é")
      .replace(/├¬/g, "ê")
      .replace(/├¡/g, "í")
      .replace(/├ó/g, "â")
      .replace(/├│/g, "ó")
      .replace(/├╡/g, "õ")
      .replace(/├╣/g, "ú")
      .replace(/├┤/g, "ô")
      .replace(/├«/g, "î")
      .replace(/├»/g, "ï")
      .replace(/├╕/g, "û")
      .replace(/├▒/g, "ñ")
      // ── maiúsculas ───────────────────────────────────────────────────────────
      .replace(/├ü/g, "Á")
      .replace(/├â/g, "Â")
      .replace(/├Ç/g, "À")
      .replace(/├É/g, "É")
      .replace(/├ê/g, "Ê")
      .replace(/├Í/g, "Í")
      .replace(/├Ó/g, "Ó")
      .replace(/├ô/g, "Ô")
      .replace(/├Ú/g, "Ú")
      .replace(/├ç/g, "Ç")
      .replace(/├Ñ/g, "Ñ")
      // ── compostos ────────────────────────────────────────────────────────────
      .replace(/├úo/g, "ão")
      .replace(/├╡es/g, "ões")
  );
};

export const getAll = async (req: Request, res: Response) => {
  try {
    // Sync: Fetch distinct categories from LivroCaixa that are NOT in CategoriaFinanceira
    const existingCats = await prisma.categoriaFinanceira.findMany({
      select: { nome: true },
    });
    const existingNames = new Set(
      existingCats.map((c) => c.nome.toUpperCase()),
    );

    // Get distinct categories used in LivroCaixa
    const usedCategories = await prisma.livroCaixa.groupBy({
      by: ["categoria"],
    });

    const newCategories = usedCategories
      .map((uc) => uc.categoria)
      .filter((name) => name && !existingNames.has(name.toUpperCase()));

    // Create missing categories
    if (newCategories.length > 0) {
      await prisma.categoriaFinanceira.createMany({
        data: newCategories.map((name) => ({
          nome: name,
          tipo: "AMBOS", // Default to AMBOS as we don't know for sure
        })),
        skipDuplicates: true,
      });
    }

    const categorias = await prisma.categoriaFinanceira.findMany({
      orderBy: { nome: "asc" },
    });

    // Aplicar fixEncoding em TODOS os nomes antes de enviar ao frontend
    const categoriasHigienizadas = categorias.map((c) => ({
      ...c,
      nome: fixEncoding(c.nome),
    }));

    res.json(categoriasHigienizadas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { nome, tipo, parentId } = req.body;
    const categoria = await prisma.categoriaFinanceira.create({
      data: {
        nome,
        tipo,
        parentId: parentId ? Number(parentId) : null,
      },
    });
    res.status(201).json(categoria);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar categoria" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, tipo, parentId } = req.body;

    // Also update name in LivroCaixa if name changed?
    // Sync: If name changed, we should update LivroCaixa to keep consistency?
    // Or keep old name in history?
    // User asked for "sync everything". Updating history seems correct if it's a rename.

    const oldCat = await prisma.categoriaFinanceira.findUnique({
      where: { id_categoria: Number(id) },
    });

    if (oldCat && oldCat.nome !== nome) {
      // Update references first
      await prisma.livroCaixa.updateMany({
        where: { categoria: oldCat.nome },
        data: { categoria: nome },
      });
    }

    const categoria = await prisma.categoriaFinanceira.update({
      where: { id_categoria: Number(id) },
      data: {
        nome,
        tipo,
        parentId: parentId ? Number(parentId) : null,
      },
    });
    res.json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar categoria" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { replacementCategory } = req.body;

    const categoryToDelete = await prisma.categoriaFinanceira.findUnique({
      where: { id_categoria: Number(id) },
    });

    if (!categoryToDelete)
      return res.status(404).json({ error: "Cat not found" });

    // Check compatibility if usage exists
    const usageCount = await prisma.livroCaixa.count({
      where: { categoria: categoryToDelete.nome },
    });

    if (usageCount > 0) {
      if (!replacementCategory) {
        const subcategoryCount = await prisma.categoriaFinanceira.count({
          where: { parentId: Number(id) },
        });

        if (subcategoryCount > 0) {
          return res.status(409).json({
            error: "Categoria possui subcategorias",
            message: `Esta categoria possui ${subcategoryCount} subcategorias. Exclua ou mova as subcategorias antes de excluir a categoria pai.`,
            usageCount: usageCount + subcategoryCount, // Just a rough indicator
          });
        }

        return res.status(409).json({
          error: "Categoria em uso",
          message: `Esta categoria possui ${usageCount} lançamentos vinculados. Selecione uma categoria substituta para prosseguir.`,
          usageCount,
        });
      }

      // Migrar lançamentos
      const newCat = await prisma.categoriaFinanceira.findFirst({
        where: { nome: replacementCategory },
      });

      if (!newCat)
        return res.status(400).json({ error: "Categoria substituta inválida" });

      await prisma.livroCaixa.updateMany({
        where: { categoria: categoryToDelete.nome },
        data: {
          categoria: newCat.nome,
          id_categoria: newCat.id_categoria,
        },
      });

      await prisma.contasPagar.updateMany({
        where: { categoria: categoryToDelete.nome },
        data: {
          categoria: newCat.nome,
          id_categoria: newCat.id_categoria,
        },
      });
    }

    // Also check for subcategories regardless of usage
    const subcategoryCount = await prisma.categoriaFinanceira.count({
      where: { parentId: Number(id) },
    });

    if (subcategoryCount > 0) {
      return res.status(409).json({
        error: "Categoria possui subcategorias",
        message: `Esta categoria possui ${subcategoryCount} subcategorias.`,
        usageCount: subcategoryCount,
      });
    }

    await prisma.categoriaFinanceira.delete({
      where: { id_categoria: Number(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir categoria" });
  }
};
