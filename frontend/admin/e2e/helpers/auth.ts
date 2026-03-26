import { type Page, expect } from '@playwright/test';

const EMAIL = 'papapizza11@kicardapio.com';
const PASSWORD = 'paPa%pIzZa@2026';

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('seu@email.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

export async function openNavigation(page: Page) {
  // Clica no botão do menu hamburger
  await page.locator('header button').first().click();
  await expect(page.getByText('Procurar ferramenta...')).toBeVisible({ timeout: 5000 });
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
