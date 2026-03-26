import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Dashboard - Visão Geral', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar o dashboard com sucesso', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verifica o título principal
    await expect(page.getByText('Visão Geral')).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir cards de métricas', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verifica os cards de métricas
    await expect(page.getByText('Pedidos Hoje')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Em Preparo')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Faturamento')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ticket Médio')).toBeVisible({ timeout: 5000 });
  });

  test('deve exibir gráfico de faturamento semanal', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page.getByText('Faturamento Semanal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Desempenho dos últimos 7 dias')).toBeVisible();
  });

  test('deve exibir seção de últimos pedidos', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page.getByText('Últimos Pedidos')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Atividade recente')).toBeVisible();
  });

  test('deve navegar para pedidos pelo botão Monitor de Pedidos', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: 'Monitor de Pedidos' }).click();
    await expect(page).toHaveURL(/\/orders/, { timeout: 10000 });
  });

  test('deve navegar para relatórios pelo link Ver Detalhes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const verDetalhes = page.getByText('Ver Detalhes');
    if (await verDetalhes.isVisible()) {
      await verDetalhes.click();
      await expect(page).toHaveURL(/\/reports/, { timeout: 10000 });
    }
  });

  test('deve atualizar dados ao clicar no botão Atualizar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const atualizarBtn = page.getByRole('button', { name: 'Atualizar' });
    if (await atualizarBtn.isVisible()) {
      await atualizarBtn.click();
      await page.waitForTimeout(2000);
      // Página deve recarregar sem erros
      await expect(page.getByText('Visão Geral')).toBeVisible({ timeout: 10000 });
    }
  });
});
