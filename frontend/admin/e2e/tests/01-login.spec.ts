import { test, expect } from '@playwright/test';

const EMAIL = 'papapizza11@kicardapio.com';
const PASSWORD = 'paPa%pIzZa@2026';

test.describe('Autenticação - Login', () => {

  test('deve exibir a página de login corretamente', async ({ page }) => {
    await page.goto('/login');

    // Verifica elementos principais da página
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar no Sistema' })).toBeVisible();
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(EMAIL);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill('invalid@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();

    // Aguarda mensagem de erro ou permanência na página de login
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('deve validar campos obrigatórios no login', async ({ page }) => {
    await page.goto('/login');

    // Tenta logar sem preencher nada
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForTimeout(2000);

    // Deve permanecer na página de login
    await expect(page).toHaveURL(/\/login/);
  });

  test('deve fazer logout após login bem-sucedido', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(EMAIL);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Abre menu de perfil (avatar na topbar)
    await page.waitForTimeout(2000);
    const profileArea = page.locator('header').locator('div.flex.items-center.gap-3.cursor-pointer').last();
    await profileArea.click();

    // Clica em logout
    await expect(page.getByText('Sair')).toBeVisible({ timeout: 5000 });
    await page.getByText('Sair').click();

    // Deve voltar para login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
