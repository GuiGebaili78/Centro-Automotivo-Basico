import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@xera.com.br';
const DEFAULT_ADMIN_SENHA = 'X3r4@2026$';

async function main() {
  console.log('🌱 Starting seed...');

  // 0. Admin inicial (apenas no primeiro run, quando não existe nenhum usuário)
  const totalUsuarios = await prisma.usuario.count();
  if (totalUsuarios === 0) {
    console.log('👑 Criando usuário admin inicial...');
    const senha_hash = await bcrypt.hash(DEFAULT_ADMIN_SENHA, 10);
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: DEFAULT_ADMIN_EMAIL,
        senha_hash,
        perfil: 'ADMIN',
        must_change_password: true,
      },
    });
    console.log(`✅ Admin criado: ${DEFAULT_ADMIN_EMAIL} (senha temporária — troca obrigatória no primeiro login).`);
  }

  // 1. Seed Tipos
  const tipos = [
    { id_tipo: 1, funcao: 'Cliente' },
    { id_tipo: 2, funcao: 'Funcionário' },
    { id_tipo: 3, funcao: 'Fornecedor' },
  ];

  for (const t of tipos) {
    const tipo = await prisma.tipo.upsert({
      where: { id_tipo: t.id_tipo },
      update: {},
      create: t,
    });
    console.log(`Created Tipo: ${tipo.funcao} (ID: ${tipo.id_tipo})`);
  }

  // 2. Seed a default Employee (Funcionario)
  const existingFunc = await prisma.funcionario.findFirst();
  if (!existingFunc) {
      console.log('👷 Creating default employee...');
      const pessoa = await prisma.pessoa.create({
          data: {
              nome: 'Mecânico Padrão',
              genero: 'Masculino'
          }
      });

      const pessoaFisica = await prisma.pessoaFisica.create({
          data: {
              id_pessoa: pessoa.id_pessoa,
              cpf: '00000000000'
          }
      });

      await prisma.funcionario.create({
          data: {
              id_pessoa_fisica: pessoaFisica.id_pessoa_fisica,
              ativo: 'S',
              cargo: 'Mecânico',
              dt_admissao: new Date()
          }
      });
      console.log('✅ Default employee created.');
  }

  console.log('✅ Seed finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
