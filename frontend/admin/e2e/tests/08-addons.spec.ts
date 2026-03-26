import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Complementos - Addons', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de complementos', async ({ page }) => {
    await navigateTo(page, '/addons');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/COMPLEMENTO|ADDON|EXTRA/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir lista de complementos ou mensagem de vazio', async ({ page }) => {
    await navigateTo(page, '/addons');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAddons = await page.locator('table tbody tr, [class*="addon"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/nenhum complemento|sem complemento|adicione/i).first().isVisible().catch(() => false);
    const hasNewBtn = await page.getByRole('button', { name: /NOVO|ADICIONAR/i }).first().isVisible().catch(() => false);

    expect(hasAddons || hasEmpty || hasNewBtn).toBeTruthy();
  });

  test('deve abrir formulário de novo complemento', async ({ page }) => {
    await navigateTo(page, '/addons');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newBtn = page.getByRole('button', { name: /NOVO|ADICIONAR|COMPLEMENTO/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 })) {
      await newBtn.click();
      await page.waitForTimeout(2000);

      const hasModal = await page.locator('[role="dialog"], [class*="modal"]').first().isVisible().catch(() => false);
      const hasForm = await page.getByPlaceholder(/NOME|DESCRIÇÃO/i).first().isVisible().catch(() => false);
      expect(hasModal || hasForm).toBeTruthy();
    }
  });
});
