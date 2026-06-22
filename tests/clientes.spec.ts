import { test, expect } from '@playwright/test';

// === HELPER FUNCTIONS ===
async function login(page: any) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('admin@xera.com.br');
  await page.getByLabel('Senha').fill('X3r4@2026$');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/', { timeout: 10000 });
}

function generateValidCPF() {
  const random = (n: number) => Math.round(Math.random() * n);
  const mod = (dividendo: number, divisor: number) => Math.round(dividendo - (Math.floor(dividendo / divisor) * divisor));
  const n = 9;
  const n1 = random(n);
  const n2 = random(n);
  const n3 = random(n);
  const n4 = random(n);
  const n5 = random(n);
  const n6 = random(n);
  const n7 = random(n);
  const n8 = random(n);
  const n9 = random(n);
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (mod(d1, 11));
  if (d1 >= 10) d1 = 0;
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (mod(d2, 11));
  if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
}

function generateRandomPlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l1 = letters[Math.floor(Math.random() * 26)];
  const l2 = letters[Math.floor(Math.random() * 26)];
  const l3 = letters[Math.floor(Math.random() * 26)];
  const n1 = Math.floor(Math.random() * 10);
  const l4 = letters[Math.floor(Math.random() * 26)];
  const n2 = Math.floor(Math.random() * 10);
  const n3 = Math.floor(Math.random() * 10);
  return `${l1}${l2}${l3}${n1}${l4}${n2}${n3}`;
}

// === SHARED STATE ===
let c1 = { id: 0, nome: '', cpf: '', telefone: '', placa: '' };
let c2 = { id: 0, nome: '', peca: '' };

test.describe.serial('Suíte Completa de Clientes — Ciclo de Vida E2E', () => {

  test('Cenário 1: Cadastro Cliente + Veículo', async ({ page }) => {
    await login(page);
    
    // Generate data
    c1.nome = `C1 Teste ${Math.floor(Math.random() * 100000)}`;
    c1.cpf = generateValidCPF();
    c1.telefone = '(11) 9 9999-9999'; 
    c1.placa = generateRandomPlate();
    
    await page.goto('/novo-cadastro');
    
    // Fill client data
    await page.getByLabel('Nome Completo *').fill(c1.nome);
    await page.getByLabel('CPF').fill(c1.cpf);
    const telInput = page.getByLabel('Telefone Principal *');
    await telInput.fill(c1.telefone);
    await telInput.blur(); 
    
    // Fill vehicle data
    await page.getByLabel('Placa').fill(c1.placa);
    await page.getByLabel('Marca *').fill('HONDA');
    await page.getByLabel('Modelo *', { exact: true }).fill('CIVIC');
    await page.getByLabel('Cor').fill('PRETO');
    const anoFab = page.getByLabel(/Ano Fabricação/i);
    await anoFab.fill('2022');
    await anoFab.blur(); 
    
    // Validation point: Sanitization in payload
    const createPromise = page.waitForResponse(async (res) => {
      if (res.url().includes('/api/cliente') && res.request().method() === 'POST' && res.status() === 201) {
        const req = res.request();
        const payload = req.postDataJSON();
        expect(payload.telefone_1).toBe('11999999999');
        return true;
      }
      return false;
    });

    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /SALVAR/i }).click({ force: true });
    
    // Extract ID directly from Response
    const response = await createPromise;
    const body = await response.json();
    if (!body) throw new Error("Body is null");
    c1.id = typeof body === 'number' ? body : (body.id || body.id_cliente); 
    if (!c1.id) throw new Error("ID do C1 não retornado na API");
    expect(c1.id).toBeGreaterThan(0);

    // Fechar modal de OS
    const modalTitle = page.getByRole('heading', { name: 'Nova Ordem de Serviço', level: 2 });
    await expect(modalTitle).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape'); 
  });

  test('Cenário 2: Cadastro Cliente + Peça', async ({ page }) => {
    await login(page);
    
    c2.nome = `C2 Teste Peça ${Math.floor(Math.random() * 100000)}`;
    c2.peca = `Motor ${Math.floor(Math.random() * 10000)}`;
    
    await page.goto('/novo-cadastro');
    
    await page.getByLabel('Nome Completo *').fill(c2.nome);
    const telInput2 = page.getByLabel('Telefone Principal *');
    await telInput2.fill('11988888888');
    await telInput2.blur(); 
    
    await page.getByRole('button', { name: 'Vincular Peça Avulsa' }).click();
    
    const pecaInput = page.getByLabel(/Nome da Peça/i);
    await pecaInput.fill(c2.peca);
    await pecaInput.blur();
    
    const createPromise = page.waitForResponse(
      (r) => r.url().includes('/api/cliente') && r.request().method() === 'POST'
    );
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /SALVAR/i }).click({ force: true });
    
    const response = await createPromise;
    const body = await response.json();
    if (!body) throw new Error("Body is null");
    c2.id = typeof body === 'number' ? body : (body.id || body.id_cliente);
    if (!c2.id) throw new Error("ID do C2 não retornado na API");
    expect(c2.id).toBeGreaterThan(0);
    
    const modalTitle = page.getByRole('heading', { name: 'Nova Ordem de Serviço', level: 2 });
    await expect(modalTitle).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
  });

  test('Cenário 3: Integridade (Bloqueios)', async ({ page }) => {
    await login(page);
    await page.goto('/novo-cadastro');
    
    // Duplicate CPF/Tel
    const nomeInp = page.getByLabel('Nome Completo *');
    await nomeInp.fill('Clone C1');
    await nomeInp.blur();
    
    const cpfInp = page.getByLabel('CPF');
    await cpfInp.fill(c1.cpf);
    await cpfInp.blur();
    
    const telInp = page.getByLabel('Telefone Principal *');
    await telInp.fill(c1.telefone);
    await telInp.blur();
    
    // Fill dummy vehicle data to pass frontend validation
    await page.getByLabel('Placa').fill(generateRandomPlate());
    await page.getByLabel('Marca *').fill('FORD');
    await page.getByLabel('Modelo *', { exact: true }).fill('KA');
    await page.getByLabel('Cor *').fill('BRANCO');
    const ano = page.getByLabel(/Ano Fabricação/i);
    await ano.fill('2020');
    await ano.blur();

    const errPromise = page.waitForResponse(
      (r) => r.url().includes('/api/pessoa-fisica') && r.request().method() === 'POST' && r.status() === 400
    );
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /SALVAR/i }).click({ force: true });
    await errPromise;
    
    // Duplicate Plate
    await page.goto('/novo-cadastro');
    
    const nomeInp2 = page.getByLabel('Nome Completo *');
    await nomeInp2.fill('Outro Clone');
    await nomeInp2.blur();
    
    const t = page.getByLabel('Telefone Principal *');
    await t.fill('11977777777');
    await t.blur();
    
    await page.getByLabel('Placa').fill(c1.placa);
    await page.getByLabel('Marca *').fill('YAMAHA');
    await page.getByLabel('Modelo *', { exact: true }).fill('R1');
    await page.getByLabel('Cor *').fill('AZUL');
    const ano2 = page.getByLabel(/Ano Fabricação/i);
    await ano2.fill('2023');
    await ano2.blur();
    
    const errVehiclePromise = page.waitForResponse(
      (r) => r.url().includes('/api/veiculo') && r.request().method() === 'POST' && r.status() === 400
    );
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /SALVAR/i }).click({ force: true });
    await errVehiclePromise;
  });

  test('Cenário 4: Adição de Múltiplos Vínculos', async ({ page }) => {
    await login(page);
    
    // A - Inserir novo Veículo no C1
    await page.goto(`/cadastro/${c1.id}`);
    await page.getByRole('button', { name: '+ NOVO' }).click();
    
    const newPlate = generateRandomPlate();
    const modalPlaca = page.getByRole('dialog').getByLabel('Placa');
    await modalPlaca.fill(newPlate);
    await modalPlaca.blur();
    
    const marcaInp = page.getByRole('dialog').getByLabel('Marca *');
    await marcaInp.fill('FIAT');
    await marcaInp.blur();
    
    const modeloInp = page.getByRole('dialog').getByLabel('Modelo *', { exact: true });
    await modeloInp.fill('TORO');
    await modeloInp.blur();
    
    const corInp = page.getByRole('dialog').getByLabel('Cor *');
    await corInp.fill('AZUL');
    await corInp.blur();
    
    const modalAno = page.getByRole('dialog').getByLabel(/Ano Fabricação/i);
    await modalAno.fill('2024');
    await modalAno.blur();
    
    const saveVehPromise = page.waitForResponse(
      (r) => r.url().includes('/api/veiculo') && r.request().method() === 'POST'
    );
    await page.getByRole('dialog').getByRole('button', { name: /Salvar/i }).click({ force: true });
    await saveVehPromise;
    
    // B - Inserir nova Peça no C2
    await page.goto(`/cadastro/${c2.id}`);
    await page.getByRole('button', { name: '+ NOVO' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Peça Avulsa' }).click();
    
    const modalPeca = page.getByRole('dialog').getByLabel(/Nome da Peça/i);
    await modalPeca.fill('Alternador Secundário');
    await modalPeca.blur();
    
    const saveEqPromise = page.waitForResponse(
      (r) => r.url().includes('/api/equipamento') && r.request().method() === 'POST'
    );
    await page.getByRole('dialog').getByRole('button', { name: /Salvar/i }).click({ force: true });
    await saveEqPromise;
  });

  test('Cenário 5: Edição Profunda', async ({ page }) => {
    await login(page);
    
    // Editar Veículo do C1
    await page.goto(`/cadastro/${c1.id}`);
    const veiculoBox = page.locator('div.p-4.rounded-xl').filter({ hasText: c1.placa }).first();
    await veiculoBox.getByRole('button', { name: 'Editar' }).click({ force: true });
    
    const editAno = page.getByRole('dialog').getByLabel(/Ano Fabricação/i);
    await editAno.fill('2025');
    await editAno.blur();
    
    const putVehPromise = page.waitForResponse(
      (r) => r.url().includes('/api/veiculo') && r.request().method() === 'PUT'
    );
    await page.getByRole('dialog').getByRole('button', { name: /Salvar/i }).click({ force: true });
    await putVehPromise;
    
    // Editar Peça do C2
    await page.goto(`/cadastro/${c2.id}`);
    const pecaBox = page.locator('div.p-4.rounded-xl').filter({ hasText: c2.peca }).first();
    await pecaBox.getByRole('button', { name: 'Editar' }).click({ force: true });
    
    const editSerial = page.getByRole('dialog').getByLabel(/Numeração \/ Serial/i);
    await editSerial.fill('XYZ999');
    await editSerial.blur();
    
    const putEqPromise = page.waitForResponse(
      (r) => r.url().includes('/api/equipamento') && r.request().method() === 'PUT'
    );
    await page.getByRole('dialog').getByRole('button', { name: /Salvar/i }).click({ force: true });
    await putEqPromise;
  });

  test('Cenário 6: Autocomplete (UX e Redirecionamento)', async ({ page }) => {
    await login(page);
    await page.goto('/novo-cadastro');
    
    const nameInput = page.getByLabel('Nome Completo *');
    
    // Preenche tudo de uma vez e aguarda a busca para evitar requisições encadeadas
    const searchPromise = page.waitForResponse(
      (r) => r.url().includes('/api/cliente?search=') && r.status() === 200
    );
    await nameInput.fill(c1.nome);
    await searchPromise;
    
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible({ timeout: 8000 });
    
    const option = page.getByRole('option', { name: new RegExp(c1.nome, 'i') }).first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await expect(option).toContainText(c1.placa);
    
    await option.click();
    await page.waitForURL(new RegExp(`\/cadastro\/${c1.id}`), { timeout: 10000 });
    
    await expect(page.getByRole('heading', { name: 'Editar Cadastro' })).toBeVisible();
  });

  test('Cenário 7: Exclusão e Sanitização', async ({ page }) => {
    await login(page);
    
    await page.goto(`/cadastro/${c1.id}`);
    
    // O valor no input deve ser a máscara aplicada sobre '11999999999' -> '(11) 9 9999-9999'
    await expect(page.getByLabel('Telefone Principal *')).toHaveValue('(11) 9 9999-9999');
    
    const plainCpf = c1.cpf;
    await expect(page.getByLabel('CPF')).toHaveValue(plainCpf);
    
    // Excluir C2 na UI
    await page.goto('/cliente');
    await page.getByPlaceholder(/Buscar/i).fill(c2.nome);
    await page.waitForTimeout(1000);
    const clientRow = page.locator('tr').filter({ hasText: c2.nome }).first();
    await clientRow.getByRole('button', { name: 'Excluir' }).click();
    
    const confirmDeletePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/cliente/${c2.id}`) && r.request().method() === 'DELETE'
    );
    const modal = page.locator('.fixed.inset-0.z-50');
    await modal.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await modal.getByRole('button', { name: /Excluir/i }).click({ force: true });
    await confirmDeletePromise;
    
    await expect(clientRow).toBeHidden({ timeout: 5000 });
  });

});
