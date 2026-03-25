import { test, expect } from '@playwright/test';

const BASE_URL = 'https://kicardapio.towersfy.com';
const EMAIL = 'papapizza11@kicardapio.com';
const PASSWORD = 'paPa%pIzZa@2026';

test.describe('Login e Criação de Categoria', () => {

  test('deve fazer login com sucesso', async ({ page }) => {
    await page.goto('/login');

    // Preenche email
    await page.getByPlaceholder('seu@email.com').fill(EMAIL);

    // Preenche senha
    await page.getByPlaceholder('••••••••').fill(PASSWORD);

    // Clica no botão de entrar
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();

    // Aguarda redirecionamento para o dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('deve criar uma categoria com sucesso', async ({ page }) => {
    // Primeiro faz login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(EMAIL);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Navega para a página de nova categoria
    await page.goto('/categories/new');

    // Preenche o nome da categoria
    const categoryName = `Teste E2E ${Date.now()}`;
    await page.getByPlaceholder(/PIZZAS TRADICIONAIS/).fill(categoryName);

    // Preenche a descrição
    await page.getByPlaceholder(/DESCREVA O QUE COMPÕE/).fill('Categoria criada via teste E2E');

    // Clica no botão salvar
    await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click();

    // Aguarda a mensagem de sucesso (toast do sonner)
    await expect(page.getByText('Categoria criada com sucesso!')).toBeVisible({ timeout: 10000 });
  });

  test('deve validar erro ao criar categoria sem nome', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill(EMAIL);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Navega para nova categoria
    await page.goto('/categories/new');

    // Tenta salvar sem preencher o nome
    await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click();

    // Verifica se a mensagem de erro de validação aparece
    await expect(page.getByText('Nome é obrigatório')).toBeVisible({ timeout: 5000 });
  });

});
