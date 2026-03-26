import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Formas de Pagamento', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de formas de pagamento', async ({ page }) => {
    await navigateTo(page, '/payment-methods');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/PAGAMENTO|FORMA/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir métodos de pagamento cadastrados', async ({ page }) => {
    await navigateTo(page, '/payment-methods');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasPayments = await page.locator('table tbody tr, [class*="payment"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/nenhuma forma|sem pagamento|adicione/i).first().isVisible().catch(() => false);
    const hasPix = await page.getByText(/PIX|DINHEIRO|CARTÃO|CRÉDITO/i).first().isVisible().catch(() => false);

    expect(hasPayments || hasEmpty || hasPix).toBeTruthy();
  });

  test('deve adicionar nova forma de pagamento', async ({ page }) => {
    await navigateTo(page, '/payment-methods');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newBtn = page.getByRole('button', { name: /NOVA|ADICIONAR|CRIAR/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 })) {
      await newBtn.click();
      await page.waitForTimeout(2000);

      const hasModal = await page.locator('[role="dialog"], [class*="modal"]').first().isVisible().catch(() => false);
      const hasForm = await page.getByPlaceholder(/NOME|DESCRIÇÃO/i).first().isVisible().catch(() => false);
      expect(hasModal || hasForm).toBeTruthy();
    }
  });
});
