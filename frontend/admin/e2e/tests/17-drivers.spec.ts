import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Entregadores', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de entregadores', async ({ page }) => {
    await navigateTo(page, '/drivers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/ENTREGADOR|DRIVER/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar acerto de entregadores', async ({ page }) => {
    await navigateTo(page, '/drivers/settlement');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/ACERTO|ENTREGADOR|SETTLEMENT/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
