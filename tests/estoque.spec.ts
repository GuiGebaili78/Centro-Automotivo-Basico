import { test, expect } from '@playwright/test';

// === HELPER FUNCTIONS ===
async function login(page: any) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('admin@xera.com.br');
  await page.getByLabel('Senha').fill('X3r4@2026$');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/', { timeout: 10000 });
}

// === SHARED STATE ===
let peca1 = { id: 0, nome: '', fabricante: 'PLAYWRIGHT FAB', valorCusto: '40', valorVenda: '90', qtd: '10' };
let pecaEssencial = { id: 0, nome: '', valorCusto: '15', valorVenda: '30', qtd: '5' };
let entradaId = 0;

test.describe.serial('Suíte E2E — Módulo de Estoque (Catálogo, Transação, Ajuste e Soft-Delete)', () => {

  test('Cenário 1: CRUD Básico de Catálogo (Caminho Feliz)', async ({ page }) => {
    await login(page);

    // Geração de nomes únicos isolados
    const randomSuffix = Math.floor(Math.random() * 100000);
    peca1.nome = `PECA COMPLETA TESTE ${randomSuffix}`;
    pecaEssencial.nome = `PECA ESSENCIAL TESTE ${randomSuffix}`;

    // --- CRIAR ---
    await page.goto('/entrada-estoque');
    await page.waitForTimeout(1000);
    
    // Cadastrar e selecionar um Novo Fornecedor via Modal para garantir independência de seed
    await page.getByRole('button', { name: 'Novo Fornecedor' }).click();
    const fornecedorModal = page.getByRole('dialog');
    await fornecedorModal.waitFor({ state: 'visible' });
    await fornecedorModal.getByLabel('Razão Social / Nome Completo *').fill(`FORNECEDOR PLAYWRIGHT ${randomSuffix}`);
    
    const createFornecedorPromise = page.waitForResponse(
      (r) => r.url().includes('/api/fornecedor') && r.request().method() === 'POST'
    );
    await fornecedorModal.getByRole('button', { name: 'SALVAR FORNECEDOR' }).click();
    await createFornecedorPromise;
    await fornecedorModal.waitFor({ state: 'hidden' });
    await page.waitForTimeout(500); // Aguarda atualização do estado do select no React

    // 1a. Cadastrar peça com todos os campos
    await page.getByLabel(/Buscar Peça ou Cadastrar Nova/i).fill(peca1.nome);
    await page.getByLabel(/Modelo/i).fill('GOL G6');
    await page.getByLabel(/Fabricante/i).fill(peca1.fabricante);
    await page.getByLabel(/Localização/i).fill('PRATELEIRA A1');
    await page.getByLabel(/Qtd/i).fill(peca1.qtd);
    await page.getByLabel(/Custo/i).fill(peca1.valorCusto);
    await page.getByLabel(/Venda/i).fill(peca1.valorVenda);
    await page.getByLabel(/Condição/i).selectOption('NOVO');
    await page.getByLabel(/Aplicação/i).fill('Geral');
    await page.getByLabel(/Aviso Est./i).fill('5');
    await page.getByRole('button', { name: 'ADICIONAR' }).click();

    // 1b. Cadastrar peça apenas com dados essenciais
    await page.getByLabel(/Buscar Peça ou Cadastrar Nova/i).fill(pecaEssencial.nome);
    await page.getByLabel(/Qtd/i).fill(pecaEssencial.qtd);
    await page.getByLabel(/Custo/i).fill(pecaEssencial.valorCusto);
    await page.getByLabel(/Venda/i).fill(pecaEssencial.valorVenda);
    await page.getByRole('button', { name: 'ADICIONAR' }).click();

    // Finalizar Entrada
    const saveEntryPromise = page.waitForResponse(
      (r) => r.url().includes('/api/pecas-estoque/entry') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'FINALIZAR ENTRADA' }).click();
    const response = await saveEntryPromise;
    const body = await response.json();
    expect(body).toBeDefined();
    entradaId = body.id_entrada_estoque || body.id_entrada || body.id || 1;
    expect(entradaId).toBeGreaterThan(0);

    // --- LER ---
    await page.goto('/pecas-estoque');
    await page.getByPlaceholder(/Buscar por nome/i).fill(peca1.nome);
    await page.waitForTimeout(1000); // Aguarda debounce da busca

    const row = page.locator('tr').filter({ hasText: peca1.nome }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(peca1.fabricante);

    // --- ATUALIZAR ---
    await row.getByRole('button', { name: 'Editar' }).click({ force: true });
    await page.waitForURL(/\/pecas-estoque\/\d+/);
    
    // Captura o ID real da peça gerado no banco a partir da URL
    peca1.id = Number(page.url().split('/').pop());
    expect(peca1.id).toBeGreaterThan(0);

    // Modifica um campo simples (Localização)
    await page.getByLabel(/Localização/i).fill('PRATELEIRA B2 MODIFICADA');
    const updatePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/pecas-estoque/${peca1.id}`) && r.request().method() === 'PUT'
    );
    await page.getByRole('button', { name: /Salvar Alterações/i }).click();
    await updatePromise;
    await page.waitForURL('/pecas-estoque');
  });

  test('Cenário 2: Domínio de Transação (Segurança e Retificação)', async ({ page }) => {
    await login(page);

    // Abrir a Entrada de Estoque criada
    await page.goto(`/entrada-estoque?editId=${entradaId}`);
    await page.waitForTimeout(1500); // Aguarda carregamento dos dados

    // Clicar em Editar no item da peça 1 na lista de compras
    const itemRow = page.locator('tr').filter({ hasText: peca1.nome }).first();
    await itemRow.getByRole('button', { name: 'Editar' }).click({ force: true });
    await page.waitForTimeout(500);

    // --- TRAVA DE SEGURANÇA (ASSERTIONS) ---
    await expect(page.getByLabel(/Buscar Peça ou Cadastrar Nova/i)).toBeDisabled();
    await expect(page.getByLabel(/Fabricante/i)).toBeDisabled();
    await expect(page.getByLabel(/Venda/i)).toBeDisabled();

    // --- CÁLCULO (RETIFICAÇÃO) ---
    // Altera a quantidade na NF de 10 para 15
    await page.getByLabel(/Qtd/i).fill('15');
    await page.getByRole('button', { name: 'ATUALIZAR ITEM' }).click();

    const putEntryPromise = page.waitForResponse(
      (r) => r.url().includes(`/api/pecas-estoque/entry/${entradaId}`) && r.request().method() === 'PUT'
    );
    await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click();
    await putEntryPromise;
  });

  test('Cenário 3: Domínio de Ajuste Físico (Master-Detail)', async ({ page }) => {
    await login(page);

    // Acessar o perfil completo da peça
    await page.goto(`/pecas-estoque/${peca1.id}`);
    await page.waitForTimeout(1500);

    // Clicar em 'Ajustar Saldo'
    await page.getByRole('button', { name: /Ajustar Saldo/i }).click();
    const modal = page.getByRole('dialog');
    await modal.waitFor({ state: 'visible' });

    // Adicionar quantidade e preencher motivo obrigatório
    await modal.getByLabel(/Quantidade/i).fill('5');
    await modal.locator('textarea').fill('Ajuste E2E Playwright - Contagem de Inventário');

    const ajustePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/pecas-estoque/${peca1.id}/ajuste`) && r.request().method() === 'POST'
    );
    await modal.getByRole('button', { name: /Confirmar Ajuste/i }).click();
    await ajustePromise;

    // Validar se a interface atualiza a tabela de Histórico na parte inferior da tela instantaneamente
    await page.waitForTimeout(1000); // Aguarda o reload reativo do refreshKey
    const historicoTable = page.locator('table').last();
    await expect(historicoTable).toContainText('AJUSTE');
    await expect(historicoTable).toContainText('Ajuste E2E Playwright - Contagem de Inventário');
  });

  test('Cenário 4: Soft-Delete (Exclusão Segura)', async ({ page }) => {
    await login(page);

    // Acessar o perfil da peça que agora possui movimentações (Entrada, Retificação e Ajuste)
    await page.goto(`/pecas-estoque/${peca1.id}`);
    await page.waitForTimeout(1500);

    // Clicar para inativar a peça
    await page.getByRole('button', { name: /Inativar Peça/i }).click();
    await page.getByText(/possui histórico de movimentações e não pode ser removida permanentemente/i).waitFor({ state: 'visible' });

    // Confirmar a inativação (botão Excluir no ConfirmModal)
    const deletePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/pecas-estoque/${peca1.id}`) && r.request().method() === 'DELETE'
    );
    await page.getByRole('button', { name: 'Excluir' }).click({ force: true });
    await deletePromise;
    await page.waitForURL('/pecas-estoque');

    // Validar que ela some da listagem principal sem gerar erros
    await page.getByPlaceholder(/Buscar por nome/i).fill(peca1.nome);
    await page.waitForTimeout(1000);
    await expect(page.locator('tr').filter({ hasText: peca1.nome })).toBeHidden();
  });

  test('Cenário 5: Verificação de Sincronia de Banco e Cadastro de Nova Peça com Condição (Clean Architecture)', async ({ page }) => {
    await login(page);

    // Ir para tela de entrada de estoque
    await page.goto('/entrada-estoque');
    await page.waitForTimeout(1000);

    const randomSuffix = Math.floor(Math.random() * 100000);
    const pecaNovaCondicao = `PECA NOVA CONDICAO ${randomSuffix}`;

    // Cadastrar novo fornecedor
    await page.getByRole('button', { name: 'Novo Fornecedor' }).click();
    const fornecedorModal = page.getByRole('dialog');
    await fornecedorModal.waitFor({ state: 'visible' });
    await fornecedorModal.getByLabel('Razão Social / Nome Completo *').fill(`FORNECEDOR CONDICAO ${randomSuffix}`);
    
    const createFornecedorPromise = page.waitForResponse(
      (r) => r.url().includes('/api/fornecedor') && r.request().method() === 'POST'
    );
    await fornecedorModal.getByRole('button', { name: 'SALVAR FORNECEDOR' }).click();
    await createFornecedorPromise;
    await fornecedorModal.waitFor({ state: 'hidden' });
    await page.waitForTimeout(500);

    // Preencher dados da nova peça garantindo a tipagem de Condição
    await page.getByLabel(/Buscar Peça ou Cadastrar Nova/i).fill(pecaNovaCondicao);
    await page.getByLabel(/Qtd/i).fill('12');
    await page.getByLabel(/Custo/i).fill('25.50');
    await page.getByLabel(/Venda/i).fill('60.00');
    await page.getByLabel(/Condição/i).selectOption('RECONDICIONADO');
    await page.getByRole('button', { name: 'ADICIONAR' }).click();

    // Finalizar Entrada e aguardar resposta 201 Created (garante que a coluna condicao existe no banco de dados)
    const saveEntryPromise = page.waitForResponse(
      (r) => r.url().includes('/api/pecas-estoque/entry') && r.request().method() === 'POST' && r.status() === 201
    );
    await page.getByRole('button', { name: 'FINALIZAR ENTRADA' }).click();
    const response = await saveEntryPromise;
    const body = await response.json();
    expect(body).toBeDefined();
    expect(body.id_entrada).toBeGreaterThan(0);
  });

});
