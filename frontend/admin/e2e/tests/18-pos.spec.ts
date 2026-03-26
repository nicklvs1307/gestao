import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('PDV - Ponto de Venda', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página do PDV', async ({ page }) => {
    await navigateTo(page, '/pos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // PDV geralmente é uma interface fullscreen com cardápio
    const hasContent = await page.getByText(/PDV|VENDA|PRODUTO|CATEGORIA|CARRINHO/i).first().isVisible().catch(() => false);
    const hasCategories = await page.locator('[class*="category"], [class*="categor"]').first().isVisible().catch(() => false);
    const hasProducts = await page.locator('[class*="product"], [class*="item"]').first().isVisible().catch(() => false);

    expect(hasContent || hasCategories || hasProducts).toBeTruthy();
  });
});
