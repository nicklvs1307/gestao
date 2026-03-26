import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Relatórios', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de relatórios', async ({ page }) => {
    await navigateTo(page, '/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/RELATÓRIO|REPORT/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar relatório de faturamento por dia', async ({ page }) => {
    await navigateTo(page, '/reports/billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/FATURAMENTO|BILLING|VENDAS/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar relatório de itens vendidos', async ({ page }) => {
    await navigateTo(page, '/reports/items');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/ITENS|VENDIDOS|PRODUTO/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar relatório de vendas por período', async ({ page }) => {
    await navigateTo(page, '/reports/period');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/PERÍODO|PERIOD|VENDAS/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar relatório de formas de pagamento', async ({ page }) => {
    await navigateTo(page, '/reports/payments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/PAGAMENTO|PAYMENT|FORMA/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
