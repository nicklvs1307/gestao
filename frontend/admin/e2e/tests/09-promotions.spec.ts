import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Promoções', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de promoções', async ({ page }) => {
    await navigateTo(page, '/promotions');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/PROMOÇÃO/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir lista de promoções ou mensagem de vazio', async ({ page }) => {
    await navigateTo(page, '/promotions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasPromotions = await page.locator('table tbody tr, [class*="promo"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/nenhuma promoção|sem promoção|adicione/i).first().isVisible().catch(() => false);
    const hasNewBtn = await page.getByRole('button', { name: /NOVA|ADICIONAR|CRIAR/i }).first().isVisible().catch(() => false);

    expect(hasPromotions || hasEmpty || hasNewBtn).toBeTruthy();
  });

  test('deve abrir formulário de nova promoção', async ({ page }) => {
    await navigateTo(page, '/promotions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newBtn = page.getByRole('button', { name: /NOVA|ADICIONAR|CRIAR|PROMOÇÃO/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 })) {
      await newBtn.click();
      await page.waitForTimeout(2000);

      const hasModal = await page.locator('[role="dialog"], [class*="modal"]').first().isVisible().catch(() => false);
      const hasForm = await page.getByPlaceholder(/NOME|DESCRIÇÃO|TÍTULO/i).first().isVisible().catch(() => false);
      const navigated = page.url().includes('/new') || page.url().includes('/promotions/');
      expect(hasModal || hasForm || navigated).toBeTruthy();
    }
  });
});
