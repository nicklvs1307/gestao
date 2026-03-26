import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Configurações', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de configurações gerais', async ({ page }) => {
    await navigateTo(page, '/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/CONFIGURAÇÕES|DADOS DA LOJA|SETTINGS/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir dados da loja', async ({ page }) => {
    await navigateTo(page, '/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasNameField = await page.getByPlaceholder(/NOME|NOME DA LOJA/i).first().isVisible().catch(() => false);
    const hasNameText = await page.getByText(/NOME|LOJA|RESTAURANTE/i).first().isVisible().catch(() => false);
    const hasSettingsForm = await page.locator('form, [class*="settings"]').first().isVisible().catch(() => false);

    expect(hasNameField || hasNameText || hasSettingsForm).toBeTruthy();
  });

  test('deve carregar configurações gerais', async ({ page }) => {
    await navigateTo(page, '/settings/general');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/GERAL|CONFIGURAÇ|OPÇÕES/i).first().isVisible().catch(() => false);
    const hasToggle = await page.locator('[role="switch"], input[type="checkbox"]').first().isVisible().catch(() => false);

    expect(hasContent || hasToggle).toBeTruthy();
  });

  test('deve carregar página de áreas de entrega', async ({ page }) => {
    await navigateTo(page, '/settings/delivery-zones');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/ÁREA|ENTREGA|ZONE/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('deve carregar página de usuários e permissões', async ({ page }) => {
    await navigateTo(page, '/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasContent = await page.getByText(/USUÁRIO|PERMISSÃO|USERS/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
