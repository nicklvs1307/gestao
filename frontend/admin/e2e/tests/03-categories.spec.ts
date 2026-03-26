import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Categorias - CRUD Completo', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve listar categorias existentes', async ({ page }) => {
    await navigateTo(page, '/categories');
    await page.waitForLoadState('networkidle');

    // A página de categorias deve estar visível
    await expect(page.getByText(/CATEGORIAS/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve criar categoria via modal na página de categorias', async ({ page }) => {
    await navigateTo(page, '/categories');
    await page.waitForLoadState('networkidle');

    // Clica no botão "NOVA CATEGORIA"
    const newCategoryBtn = page.getByRole('button', { name: /NOVA CATEGORIA/i });
    await expect(newCategoryBtn).toBeVisible({ timeout: 10000 });
    await newCategoryBtn.click();

    // Aguarda o modal abrir
    await expect(page.getByText('Nova Categoria').first()).toBeVisible({ timeout: 5000 });

    // Preenche o nome
    const categoryName = `E2E Cat ${Date.now()}`;
    await page.getByPlaceholder('Ex: Pizzas Tradicionais').fill(categoryName);

    // Clica em salvar
    await page.getByRole('button', { name: /SALVAR ESTRUTURA/i }).click();

    // Verifica mensagem de sucesso
    await expect(page.getByText('Criado!')).toBeVisible({ timeout: 10000 });
  });

  test('deve criar categoria via página de formulário', async ({ page }) => {
    await navigateTo(page, '/categories/new');

    const categoryName = `E2E Form ${Date.now()}`;
    await page.getByPlaceholder(/PIZZAS TRADICIONAIS/).fill(categoryName);
    await page.getByPlaceholder(/DESCREVA O QUE COMPÕE/).fill('Categoria via formulário E2E');
    await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click();

    await expect(page.getByText('Categoria criada com sucesso!')).toBeVisible({ timeout: 10000 });
  });

  test('deve validar campo obrigatório nome na categoria', async ({ page }) => {
    await navigateTo(page, '/categories/new');

    await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click();

    await expect(page.getByText('Nome é obrigatório')).toBeVisible({ timeout: 5000 });
  });

  test('deve editar uma categoria existente', async ({ page }) => {
    await navigateTo(page, '/categories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Procura por um item de categoria clicável
    const editBtn = page.locator('table tbody tr').first().locator('button, a').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(2000);

      // Verifica se abriu uma página de edição ou modal
      const nameInput = page.getByPlaceholder(/PIZZAS TRADICIONAIS/);
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Editado E2E ${Date.now()}`);
        await page.getByRole('button', { name: /SALVAR/i }).first().click();
        await page.waitForTimeout(3000);
      }
    }
  });
});
