import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Pedidos - Monitor de Pedidos', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar o monitor de pedidos', async ({ page }) => {
    await navigateTo(page, '/orders');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/PEDIDOS|MONITOR/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir lista de pedidos ou mensagem de vazio', async ({ page }) => {
    await navigateTo(page, '/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Deve ter pedidos OU mensagem de nenhum pedido
    const hasOrders = await page.locator('table tbody tr, [class*="order"]').first().isVisible().catch(() => false);
    const hasEmptyMessage = await page.getByText(/nenhum pedido|sem pedidos|vazio/i).first().isVisible().catch(() => false);
    const hasPendingText = await page.getByText(/PENDING|PENDENTE|PREPARING|PRONTO/i).first().isVisible().catch(() => false);

    expect(hasOrders || hasEmptyMessage || hasPendingText).toBeTruthy();
  });

  test('deve filtrar pedidos por status se filtro existir', async ({ page }) => {
    await navigateTo(page, '/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Procura por filtros de status
    const statusFilter = page.getByRole('button', { name: /PENDENTE|PREPARING|PRONTO|TODOS/i }).first();
    if (await statusFilter.isVisible({ timeout: 5000 })) {
      await statusFilter.click();
      await page.waitForTimeout(2000);
      // Página deve continuar funcionando
      await expect(page.getByText(/PEDIDOS|MONITOR/i).first()).toBeVisible();
    }
  });

  test('deve exibir detalhes de um pedido ao clicar', async ({ page }) => {
    await navigateTo(page, '/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Clica no primeiro pedido se existir
    const firstOrder = page.locator('table tbody tr').first();
    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      // Deve abrir detalhes (modal ou painel lateral)
      const hasDetail = await page.getByText(/DETALHES|ITENS|TOTAL|MESA/i).first().isVisible().catch(() => false);
      const hasModal = await page.locator('[role="dialog"], [class*="modal"], [class*="drawer"]').first().isVisible().catch(() => false);
      expect(hasDetail || hasModal).toBeTruthy();
    }
  });
});
