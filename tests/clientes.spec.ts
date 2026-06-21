import { test, expect } from '@playwright/test';

// ─── CPF Válido ───────────────────────────────────────────────────────────────
function generateValidCPF() {
  const randomDigit = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 9 }, randomDigit);

  let d1 = 0;
  for (let i = 0; i < 9; i++) d1 += n[i] * (10 - i);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 = 0;
  for (let i = 0; i < 9; i++) d2 += n[i] * (11 - i);
  d2 += d1 * 2;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  return `${n[0]}${n[1]}${n[2]}.${n[3]}${n[4]}${n[5]}.${n[6]}${n[7]}${n[8]}-${d1}${d2}`;
}

// ─── Dados compartilhados entre cenários encadeados ───────────────────────────
// Os cenários 2 e 3 dependem dos dados criados no Cenário 1.
// Usando um objeto mutável no escopo do describe para compartilhar estado.
const testData = {
  cpf: generateValidCPF(),
  telefone: `(11) 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
  placa: `TST${Math.floor(Math.random() * 9000 + 1000)}`,
  nome: `Cliente E2E Master ${Math.floor(Math.random() * 10000)}`,
  peca: 'Alternador Bosch E2E',
};

// ─── Helper: Login ────────────────────────────────────────────────────────────
async function login(page: any) {
  await page.goto('/login');
  await page.getByPlaceholder('seuemail@oficina.com').fill('admin@xera.com.br');
  await page.getByPlaceholder('Sua senha de acesso').fill('X3r4@2026$');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/');
}

// ─── Suíte Principal ─────────────────────────────────────────────────────────
test.describe.serial('Módulo de Clientes — Integridade de Dados', () => {

  // ─── Cenário 1: Cadastro Completo (Caminho Feliz) ─────────────────────────
  test('Cenário 1: Fluxo Mestre — Cadastro Completo e Lazy Loading', async ({ page }) => {
    test.setTimeout(60_000); // o fluxo completo (cadastro + modal + listagem) precisa de mais tempo
    await login(page);
    await page.goto('/novo-cadastro');
    await page.waitForURL('**/novo-cadastro', { timeout: 10000 });

    // ── Preencher dados do Cliente ──────────────────────────────────────────
    await page.getByLabel('Nome Completo *').fill(testData.nome);
    await page.getByLabel('CPF').fill(testData.cpf);
    await page.getByLabel('Telefone Principal *').fill(testData.telefone);

    // ── Vincular Veículo ────────────────────────────────────────────────
    // Preencher a placa e aguardar autocomplete
    await page.getByPlaceholder('ABC1234').fill(testData.placa);
    
    await page.getByLabel('Marca *').fill('Honda');
    await page.waitForTimeout(400);
    const marcaSugestao = page.getByRole('option', { name: /Honda/i }).first();
    if (await marcaSugestao.isVisible({ timeout: 1000 }).catch(() => false)) {
      await marcaSugestao.click();
    }

    await page.getByLabel('Modelo *').fill('Civic');
    await page.waitForTimeout(400);
    const modeloSugestao = page.getByRole('option', { name: /Civic/i }).first();
    if (await modeloSugestao.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modeloSugestao.click();
    }

    await page.getByLabel('Cor *').fill('Preto');
    await page.waitForTimeout(400);
    const corSugestao = page.getByRole('option', { name: /Preto/i }).first();
    if (await corSugestao.isVisible({ timeout: 1000 }).catch(() => false)) {
      await corSugestao.click();
    }

    // ── Submeter e aguardar resposta da API ─────────────────────────────────
    const saveClientePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/cliente') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.getByRole('button', { name: 'SALVAR NOVO CADASTRO' }).click();
    const clienteResponse = await saveClientePromise;
    expect(clienteResponse.status()).toBe(201);

    // ── Validar modal de decisão pós-cadastro (OsCreationModal) ─────────────
    // O título do modal é "Nova Ordem de Serviço".
    // O componente Modal.tsx NÃO usa role="dialog" — é um div simples renderizado via portal.
    // Localizamos o container do modal pelo h2 com o título e subimos para o wrapper.
    const modalTitle = page.getByRole('heading', { name: 'Nova Ordem de Serviço', level: 2 });
    await expect(modalTitle).toBeVisible({ timeout: 8000 });

    // O botão "Cancelar" é o único com esse texto fora dos botões do formulário principal
    // (que usa "SALVAR NOVO CADASTRO" e "CANCELAR" em maiúsculas). Usamos exact+case.
    // O modal é renderizado via createPortal em document.body — usamos page diretamente,
    // mas filtrando pelo container do modal (pai do h2 título).
    const modalContainer = modalTitle.locator('xpath=ancestor::div[contains(@class,"bg-white") and contains(@class,"rounded-xl") and contains(@class,"shadow-2xl")]');
    await modalContainer.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modalTitle).not.toBeVisible({ timeout: 3000 });

    // ── Navegar para a listagem e buscar o cliente criado ───────────────────
    await page.goto('/cliente');
    await page.waitForURL('**/cliente', { timeout: 10000 });

    // O campo de busca é um <input> comum (role=textbox), localizado pelo placeholder.
    // O ClientePage tem debounce de 500ms antes de disparar a request de busca.
    const searchInput = page.getByPlaceholder('Buscar por nome, email ou localização...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Criar o listener ANTES de digitar para não perder a resposta com o search param.
    // O ClientePage tem debounce de 500ms — o timeout deve acomodar isso.
    const searchPromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/cliente') && r.request().method() === 'GET',
      { timeout: 15000 }
    );
    await searchInput.fill(testData.nome);
    await searchPromise;

    // Confirmar que o cliente aparece na tabela
    const clientRow = page.locator('tbody tr').filter({ hasText: testData.nome }).first();
    await expect(clientRow).toBeVisible({ timeout: 5000 });

    // ── Lazy Loading: expandir linha e validar peça ─────────────────────────
    const ativosPromise = page.waitForResponse(
      (r: any) => r.url().includes('/ativos'),
      { timeout: 10000 }
    );
    await clientRow.click();
    await ativosPromise;

    // A peça cadastrada deve aparecer no painel expandido
    await expect(page.getByText(testData.placa)).toBeVisible({ timeout: 5000 });
  });

  // ─── Cenário 2: Integridade — CPF Duplicado ───────────────────────────────
  test('Cenário 2: Integridade de Dados — CPF Duplicado é Bloqueado', async ({ page }) => {
    await login(page);
    await page.goto('/novo-cadastro');
    // Aguardar confirmação que estamos na página correta (evita race com PrivateRoute)
    await page.waitForURL('**/novo-cadastro', { timeout: 10000 });

    // Preencher com o MESMO CPF do Cenário 1 (criado antes)
    // IMPORTANTE: mudar para modo "Equipamento" primeiro para desativar a validação
    // nativa HTML5 do campo "Placa *" (required), que bloqueava o submit silenciosamente.
    await page.getByRole('button', { name: 'Vincular Peça Avulsa' }).click();

    await page.getByLabel('Nome Completo *').fill('Cliente Duplicado Teste');
    await page.getByLabel('CPF').fill(testData.cpf);
    await page.getByLabel('Telefone Principal *').fill('(11) 98888-0001');

    // Submeter e aguardar o toast de erro de duplicidade
    await page.getByRole('button', { name: 'SALVAR NOVO CADASTRO' }).click();

    // O frontend deve exibir o toast de erro. O toast mostra:
    // "Erro ao salvar cadastro: CPF/CNPJ/IE/Placa já cadastrado em outro registro."
    const errorToast = page.getByText(/Erro ao salvar cadastro/i);
    await expect(errorToast).toBeVisible({ timeout: 15000 });
  });

  // ─── Cenário 3: Integridade — Placa Duplicada ────────────────────────────
  test('Cenário 3: Integridade de Dados — Placa Duplicada é Bloqueada', async ({ page }) => {
    await login(page);
    await page.goto('/novo-cadastro');

    // Preencher um novo cliente com CPF diferente para não bloquear antes
    const novoCpf = generateValidCPF();
    await page.getByLabel('Nome Completo *').fill('Cliente Placa Duplicada Teste');
    await page.getByLabel('CPF').fill(novoCpf);
    await page.getByLabel('Telefone Principal *').fill('(11) 97777-0002');

    // Garantir que o toggle está em "Vincular Veículo"
    await page.getByRole('button', { name: 'Vincular Veículo' }).click();

    // Preencher a MESMA placa do Cenário 1
    await page.getByPlaceholder('ABC1234').fill(testData.placa);
    await page.getByLabel('Marca *').fill('Honda');

    // Aguardar sugestão do autocomplete e selecionar (se aparecer)
    await page.waitForTimeout(400);
    const marcaSugestao = page.getByRole('option', { name: /Honda/i }).first();
    if (await marcaSugestao.isVisible({ timeout: 1000 }).catch(() => false)) {
      await marcaSugestao.click();
    }

    await page.getByLabel('Modelo *').fill('Civic');
    await page.waitForTimeout(400);
    const modeloSugestao = page.getByRole('option', { name: /Civic/i }).first();
    if (await modeloSugestao.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modeloSugestao.click();
    }

    await page.getByLabel('Cor *').fill('Preto');
    await page.waitForTimeout(300);
    const corSugestao = page.getByRole('option', { name: /Preto/i }).first();
    if (await corSugestao.isVisible({ timeout: 1000 }).catch(() => false)) {
      await corSugestao.click();
    }

    // Submeter
    await page.getByRole('button', { name: 'SALVAR NOVO CADASTRO' }).click();

    // O cliente vai ser criado com sucesso (201), mas o veículo com placa duplicada
    // será rejeitado. O frontend exibe um toast de erro.
    // Aguardamos por qualquer resposta à API de cliente primeiro
    const clienteOkPromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/cliente') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    const clienteRes = await clienteOkPromise;
    expect(clienteRes.status()).toBe(201); // Cliente é criado

    // Aguardar resposta do endpoint de veículo (que deve falhar)
    const veiculoPromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/veiculo') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    const veiculoRes = await veiculoPromise;
    expect(veiculoRes.status()).toBe(400); // Veículo rejeitado

    // Confirmar que o feedback visual de erro aparece no toast
    const errorToast = page.getByText(/Erro ao salvar/i);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  // ─── Cenário 4: Validação de Sanitização ──────────────────────────────────
  test('Cenário 4: Validação de Sanitização (Data Cleansing)', async ({ page }) => {
    await login(page);
    await page.goto('/novo-cadastro');

    const cpfSanitizado = generateValidCPF();
    const nomeSanitize = `Cliente Sanitize ${Math.floor(Math.random() * 10000)}`;
    // Inserimos com máscara (o componente aplica sozinho, mas simulamos a digitação natural)
    await page.getByLabel('Nome Completo *').fill(nomeSanitize);
    await page.getByLabel('CPF').fill(cpfSanitizado); 
    await page.getByLabel('Telefone Principal *').fill('11999998888');

    // Interceptar a requisição para verificar se o payload que BATE na API tem pontuação (frontend mandaria sem pontuação, mas vamos focar na API)
    // O mais importante é verificar o banco, ou fazer reload da grid.

    const saveClientePromise = page.waitForResponse(
      (r: any) => r.url().includes('/api/cliente') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.getByRole('button', { name: 'SALVAR NOVO CADASTRO' }).click();
    const clienteResponse = await saveClientePromise;
    expect(clienteResponse.status()).toBe(201);
    const clienteData = await clienteResponse.json();

    // Validar se o BD retornou limpo
    // Dependendo do que a API retorna, o CPF pode vir limpo, e a máscara só é na view.
    
    // Fechar modal
    const modalTitle = page.getByRole('heading', { name: 'Nova Ordem de Serviço', level: 2 });
    await expect(modalTitle).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

    // Na listagem, o CPF ou Telefone deve aparecer formatado
    await page.goto('/cliente');
    await page.reload();
    await page.waitForTimeout(3000);

    const row = page.locator('tbody tr').filter({ hasText: nomeSanitize }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    // Verifica formatação do telefone na listagem (11) 9 9999-8888
    await expect(row.getByText('(11) 9 9999-8888')).toBeVisible();
  });

  // ─── Cenário 5: Exclusão Lógica ─────────────────────────────────────────
  test('Cenário 5: Exclusão Lógica (Soft Delete)', async ({ page }) => {
    await login(page);
    
    // 1. Criar cliente para excluir
    await page.goto('/novo-cadastro');
    const nomeExclusao = `Cliente Para Excluir ${Math.floor(Math.random() * 10000)}`;
    await page.getByLabel('Nome Completo *').fill(nomeExclusao);
    await page.getByLabel('CPF').fill(generateValidCPF());
    await page.getByLabel('Telefone Principal *').fill('11911112222');
    
    await page.getByRole('button', { name: 'SALVAR NOVO CADASTRO' }).click();
    await page.getByRole('heading', { name: 'Nova Ordem de Serviço', level: 2 }).waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

    // 2. Ir para listagem e excluir
    await page.goto('/cliente');
    await page.reload();
    await page.waitForTimeout(3000);

    const row = page.locator('tbody tr').filter({ hasText: nomeExclusao }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    
    // O botão excluir aparece no hover (Playwright consegue clicar se forçar ou usar ActionButton icon)
    await row.getByRole('button', { name: 'Excluir' }).click({ force: true });
    
    // Modal de confirmação (não possui role="dialog")
    const confirmBtn = page.getByRole('button', { name: /Excluir|Confirmar/i }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Toast de sucesso
    const successToast = page.getByText(/removido com sucesso|excluído com sucesso/i);
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // 3. Garantir que desapareceu da lista
    await expect(row).not.toBeVisible();
    
    // 4. Garantir que a API de listagem não retorna 500
    const listPromise = page.waitForResponse(r => r.url().includes('/api/cliente') && r.request().method() === 'GET');
    await page.goto('/cliente');
    const listRes = await listPromise;
    expect(listRes.status()).toBe(200); // Sem erro 500
  });

});
