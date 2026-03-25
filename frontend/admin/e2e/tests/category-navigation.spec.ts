import { test, expect } from '@playwright/test';

test.describe('Fluxo de Categorias via Navegação', () => {

  test('deve fazer login, ir para /categories e criar categoria via modal', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill('papapizza11@kicardapio.com');
    await page.getByPlaceholder('••••••••').fill('paPa%pIzZa@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Navega para /categories
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Clica no botão "NOVA CATEGORIA" (abre modal)
    const newCategoryBtn = page.getByRole('button', { name: /NOVA CATEGORIA/i });
    await expect(newCategoryBtn).toBeVisible({ timeout: 10000 });
    await newCategoryBtn.click();

    // Aguarda o modal abrir
    await expect(page.getByText('Nova Categoria').first()).toBeVisible({ timeout: 5000 });

    // Preenche o nome da categoria no modal
    const categoryName = `Teste E2E ${Date.now()}`;
    await page.getByPlaceholder('Ex: Pizzas Tradicionais').fill(categoryName);

    // Clica no botão "SALVAR ESTRUTURA"
    await page.getByRole('button', { name: /SALVAR ESTRUTURA/i }).click();

    // Aguarda a mensagem de sucesso (toast "Criado!")
    await expect(page.getByText('Criado!')).toBeVisible({ timeout: 10000 });
  });

});
