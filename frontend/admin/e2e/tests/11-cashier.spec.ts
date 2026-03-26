import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Caixa - Gestão de Caixa', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de caixa', async ({ page }) => {
    await navigateTo(page, '/cashier');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/CAIXA|FRENTE/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir status do caixa (aberto/fechado)', async ({ page }) => {
    await navigateTo(page, '/cashier');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasStatus = await page.getByText(/ABERTO|FECHADO|SALDO|TURNO/i).first().isVisible().catch(() => false);
    const hasOpenBtn = await page.getByRole('button', { name: /ABRIR|INICIAR|NOVO TURNO/i }).first().isVisible().catch(() => false);
    const hasCloseBtn = await page.getByRole('button', { name: /FECHAR|ENCERRAR/i }).first().isVisible().catch(() => false);

    expect(hasStatus || hasOpenBtn || hasCloseBtn).toBeTruthy();
  });
});
