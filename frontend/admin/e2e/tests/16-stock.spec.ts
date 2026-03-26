import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Estoque', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar ingredientes e insumos', async ({ page }) => {
    await navigateTo(page, '/ingredients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/INGREDIENTE|INSUMO|ESTOQUE/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar grupos de ingredientes', async ({ page }) => {
    await navigateTo(page, '/ingredients/groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/GRUPO|INGREDIENTE/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar movimentações de estoque', async ({ page }) => {
    await navigateTo(page, '/stock/moves');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/MOVIMENTAÇÃO|ESTOQUE|MOVES/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar notas de entrada', async ({ page }) => {
    await navigateTo(page, '/stock/invoices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/NOTA|ENTRADA|INVOICE/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar ordem de compra', async ({ page }) => {
    await navigateTo(page, '/stock/purchase-orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/ORDEM|COMPRA|PURCHASE/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar lista de compras', async ({ page }) => {
    await navigateTo(page, '/stock/shopping-list');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/LISTA|COMPRA|SHOPPING/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
