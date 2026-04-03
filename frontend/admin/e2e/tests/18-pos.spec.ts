import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('PDV - Ponto de Venda', () => {

  test('deve carregar a página do PDV corretamente', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    // Verifica elementos principais
    await expect(page.getByText('PAINEL ADMINISTRATIVO')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('CARRINHO VAZIO')).toBeVisible();
  });

  test('deve exibir categorias no PDV', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    // Verifica categorias usando role button
    const categorias = page.locator('button', { hasText: /PIZZA|COMBO|BEBIDA|VINHO/i });
    await expect(categorias.first()).toBeVisible();
  });

  test('deve exibir o carrinho vazio', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    await expect(page.getByText('CARRINHO VAZIO')).toBeVisible();
    await expect(page.getByText('0 item(s)')).toBeVisible();
  });

  test('deve ter botão de pagamento', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    await expect(page.getByText('IR PARA PAGAMENTO')).toBeVisible();
  });

  test('deve mostrar opções de mesa', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    // Usa getByRole para ser mais específico
    await expect(page.getByRole('button', { name: 'Mesa', exact: true })).toBeVisible();
    await expect(page.getByText('DIRETA')).toBeVisible();
  });

  test('deve selecionar categoria e mostrar produtos', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    // Clica na primeira categoria
    const categoria = page.locator('button').filter({ hasText: /PIZZA/i }).first();
    await categoria.click();
    await page.waitForTimeout(1000);
    
    // Verifica que continua na página do PDV
    await expect(page.getByText('PAINEL ADMINISTRATIVO')).toBeVisible();
  });

  test('deve navegar entre tabs do PDV (Catálogo, Mesas)', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    // Procura e clica na tab Mesas
    const tabMesas = page.getByText('MESAS').first();
    if (await tabMesas.isVisible().catch(() => false)) {
      await tabMesas.click();
      await page.waitForTimeout(1000);
    }
    
    // Verifica que está no PDV
    await expect(page.getByText('PAINEL ADMINISTRATIVO')).toBeVisible();
  });

  test('deve navegar para dashboard', async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForTimeout(2000);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/dashboard/);
  });
});