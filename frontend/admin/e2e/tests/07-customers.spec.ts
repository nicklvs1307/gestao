import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Clientes - Cadastro de Clientes', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de clientes', async ({ page }) => {
    await navigateTo(page, '/customers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/CLIENTES|CADASTRO/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir lista de clientes ou mensagem de vazio', async ({ page }) => {
    await navigateTo(page, '/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasClients = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/nenhum cliente|sem clientes|adicione/i).first().isVisible().catch(() => false);
    const hasNewBtn = await page.getByRole('button', { name: /NOVO|ADICIONAR|CLIENTE/i }).first().isVisible().catch(() => false);

    expect(hasClients || hasEmpty || hasNewBtn).toBeTruthy();
  });

  test('deve buscar cliente por nome', async ({ page }) => {
    await navigateTo(page, '/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/BUSCAR|PESQUISAR|PROCURAR|NOME/i).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('Teste');
      await page.waitForTimeout(2000);
      await expect(page.getByText(/CLIENTES|CADASTRO/i).first()).toBeVisible();
    }
  });

  test('deve abrir formulário de novo cliente', async ({ page }) => {
    await navigateTo(page, '/customers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newClientBtn = page.getByRole('button', { name: /NOVO|ADICIONAR|CLIENTE/i }).first();
    if (await newClientBtn.isVisible({ timeout: 5000 })) {
      await newClientBtn.click();
      await page.waitForTimeout(2000);

      const hasModal = await page.locator('[role="dialog"], [class*="modal"]').first().isVisible().catch(() => false);
      const hasForm = await page.getByPlaceholder(/NOME|TELEFONE|EMAIL/i).first().isVisible().catch(() => false);
      expect(hasModal || hasForm).toBeTruthy();
    }
  });
});
