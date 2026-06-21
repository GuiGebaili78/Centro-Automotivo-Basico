import { execSync } from 'child_process';
import path from 'path';

async function globalSetup() {
  console.log('--- Configurando banco de dados de teste ---');
  
  const serverDir = path.resolve(__dirname, '../server');
  const databaseUrlTest = 'postgresql://user:password@localhost:5434/automotivo_test_db';

  try {
    console.log('⏳ [1/2] Garantindo que o banco automotivo_test_db existe no Docker...');
    try {
      execSync('docker compose exec -T centroautomotivo_db psql -U user -d automotivo_db -c "CREATE DATABASE automotivo_test_db;" || true', {
        stdio: 'ignore',
        cwd: path.resolve(__dirname, '../')
      });
      console.log('✅ Banco de testes criado (ou já existia).');
    } catch (e) {
      console.log('✅ Banco de testes pronto (já existia).');
    }

    console.log('⏳ [2/2] Sincronizando o Prisma com o banco de testes (Force Reset)...');
    execSync(`npx prisma db push --accept-data-loss --force-reset --skip-generate`, {
      cwd: serverDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrlTest, CI: '1' }
    });
    console.log('⏳ [3/3] Semeando o banco de testes (Seed) e desbloqueando admin...');
    execSync(`npx prisma db seed`, {
      cwd: serverDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrlTest }
    });

    // Remove a trava de troca obrigatória de senha para não travar os testes E2E
    execSync(`docker compose exec -T centroautomotivo_db psql -U user -d automotivo_test_db -c "UPDATE \\"Usuario\\" SET must_change_password = false;"`, {
      stdio: 'ignore',
      cwd: path.resolve(__dirname, '../')
    });

    console.log('✅ --- Banco de testes configurado com sucesso! ---');
  } catch (error) {
    console.error('Erro ao configurar banco de testes:', error);
    throw error;
  }
}

export default globalSetup;

// Auto-executa se for chamado diretamente pelo tsx
globalSetup();
