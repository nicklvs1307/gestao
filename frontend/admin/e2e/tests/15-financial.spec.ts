import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Financeiro', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar o fluxo de caixa financeiro', async ({ page }) => {
    await navigateTo(page, '/financial');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/FINANCEIRO|FLUXO|CAIXA/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar categorias financeiras', async ({ page }) => {
    await navigateTo(page, '/financial/categories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/CATEGORIA|FINANCEIR/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar lançamentos financeiros', async ({ page }) => {
    await navigateTo(page, '/financial/entries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/LANÇAMENTO|ENTRIES|FINANCEIR/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar fornecedores', async ({ page }) => {
    await navigateTo(page, '/financial/suppliers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/FORNECEDOR|SUPPLIER/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar contas bancárias', async ({ page }) => {
    await navigateTo(page, '/financial/bank-accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/BANCÁRIO|CONTA|BANK/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
