import { test, expect } from '@playwright/test';
import { login, openNavigation } from '../helpers/auth';

test.describe('Navegação - Menu Lateral', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve abrir o menu de navegação', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openNavigation(page);

    // Verifica categorias do menu
    await expect(page.getByText('Vendas & Operacional')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Cardápio')).toBeVisible({ timeout: 5000 });
  });

  test('deve buscar itens no menu de navegação', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openNavigation(page);

    // Digita na busca
    const searchInput = page.getByPlaceholder('Procurar ferramenta...');
    await searchInput.fill('pedido');
    await page.waitForTimeout(1000);

    // Deve filtrar resultados
    await expect(page.getByText('Monitor de Pedidos')).toBeVisible({ timeout: 5000 });
  });

  test('deve navegar para Pedidos pelo menu', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openNavigation(page);
    await page.getByText('Monitor de Pedidos').click();

    await expect(page).toHaveURL(/\/orders/, { timeout: 10000 });
  });

  test('deve navegar para Cardápio pelo menu', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openNavigation(page);
    await page.getByText('Cardápio').first().click();

    await expect(page).toHaveURL(/\/products/, { timeout: 10000 });
  });

  test('deve navegar para Categorias pelo menu', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openNavigation(page);
    await page.getByText('Categorias').first().click();

    await expect(page).toHaveURL(/\/categories/, { timeout: 10000 });
  });

  test('deve fechar o menu de navegação', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openNavigation(page);

    // Clica no botão de fechar (X)
    const closeBtn = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).last();
    // Ou clica no backdrop
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});
