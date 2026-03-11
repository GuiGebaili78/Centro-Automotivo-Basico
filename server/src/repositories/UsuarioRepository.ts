import { PrismaClient, Usuario } from "@prisma/client";

const prisma = new PrismaClient();

export class UsuarioRepository {
  async findByEmail(email: string): Promise<Usuario | null> {
    return prisma.usuario.findUnique({
      where: { email },
    });
  }

  async count(): Promise<number> {
    return prisma.usuario.count();
  }

  async create(data: any): Promise<Usuario> {
    return prisma.usuario.create({
      data,
    });
  }
}
