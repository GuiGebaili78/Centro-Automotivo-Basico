import { PrismaClient, Usuario } from "@prisma/client";

const prisma = new PrismaClient();

export class UsuarioRepository {
  async findByEmail(email: string): Promise<Usuario | null> {
    return prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findById(id_usuario: number): Promise<Usuario | null> {
    return prisma.usuario.findUnique({
      where: { id_usuario },
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

  async updatePassword(id_usuario: number, senha_hash: string): Promise<Usuario> {
    return prisma.usuario.update({
      where: { id_usuario },
      data: {
        senha_hash,
        must_change_password: false,
      },
    });
  }
}
