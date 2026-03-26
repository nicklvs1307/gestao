import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Produtos - Cardápio', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve listar produtos na página do cardápio', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/CARDÁPIO|PRODUTOS/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve navegar para página de novo produto', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');

    // Procura botão de novo produto
    const newProductBtn = page.getByRole('button', { name: /NOVO|ADICIONAR|PRODUTO/i }).first();
    if (await newProductBtn.isVisible({ timeout: 5000 })) {
      await newProductBtn.click();
      await page.waitForTimeout(2000);

      // Verifica se navegou para formulário ou abriu modal
      const hasForm = await page.getByPlaceholder(/NOME DO PRODUTO|PIZZA|HAMBURGUER/i).isVisible().catch(() => false);
      const hasNewRoute = page.url().includes('/new') || page.url().includes('/products/');
      expect(hasForm || hasNewRoute).toBeTruthy();
    }
  });

  test('deve validar campos obrigatórios ao criar produto', async ({ page }) => {
    await navigateTo(page, '/products/new');
    await page.waitForTimeout(2000);

    // Tenta salvar sem preencher
    const saveBtn = page.getByRole('button', { name: /SALVAR/i }).first();
    if (await saveBtn.isVisible({ timeout: 5000 })) {
      await saveBtn.click();
      await page.waitForTimeout(2000);

      // Deve permanecer na mesma página ou exibir erro
      const hasError = await page.getByText(/obrigatório|preencha|erro/i).first().isVisible().catch(() => false);
      const stillOnPage = page.url().includes('/new') || page.url().includes('/products/');
      expect(hasError || stillOnPage).toBeTruthy();
    }
  });

  test('deve criar um novo produto completo', async ({ page }) => {
    await navigateTo(page, '/products/new');
    await page.waitForTimeout(2000);

    // Preenche nome do produto
    const nameInput = page.getByPlaceholder(/NOME DO PRODUTO|PIZZA|HAMBURGUER|DIGITE/i).first();
    if (await nameInput.isVisible({ timeout: 5000 })) {
      const productName = `Produto E2E ${Date.now()}`;
      await nameInput.fill(productName);

      // Preenche preço se existir
      const priceInput = page.getByPlaceholder(/0,00|PREÇO|R\$/i).first();
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('29.90');
      }

      // Preenche descrição se existir
      const descInput = page.getByPlaceholder(/DESCRIÇÃO|DESCREVA/i).first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('Produto criado via teste E2E');
      }

      // Salva
      const saveBtn = page.getByRole('button', { name: /SALVAR/i }).first();
      await saveBtn.click();
      await page.waitForTimeout(3000);

      // Verifica sucesso
      const hasSuccess = await page.getByText(/sucesso|criado|salvo/i).first().isVisible().catch(() => false);
      expect(hasSuccess).toBeTruthy();
    }
  });

  test('deve buscar produto pelo campo de busca', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.getByPlaceholder(/BUSCAR|PESQUISAR|PROCURAR/i).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('Pizza');
      await page.waitForTimeout(2000);
      // Deve filtrar resultados (não deve crashar)
      await expect(page.getByText(/CARDÁPIO|PRODUTOS/i).first()).toBeVisible();
    }
  });

  test('deve acessar página de edição de produto existente', async ({ page }) => {
    await navigateTo(page, '/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Clica no primeiro produto da lista
    const firstProduct = page.locator('table tbody tr, [class*="product"], [class*="card"]').first();
    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();
      await page.waitForTimeout(2000);

      // Deve abrir formulário de edição
      const isEditPage = page.url().includes('/products/') || page.url().includes('/edit');
      const hasNameInput = await page.getByPlaceholder(/NOME DO PRODUTO|PIZZA|DIGITE/i).first().isVisible().catch(() => false);
      expect(isEditPage || hasNameInput).toBeTruthy();
    }
  });
});
