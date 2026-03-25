import { test } from '@playwright/test';

test.describe('Limpeza de Dados', () => {

  test('deve excluir todos os produtos e categorias', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill('papapizza11@kicardapio.com');
    await page.getByPlaceholder('••••••••').fill('paPa%pIzZa@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForURL(/\/dashboard/);

    // ==========================================
    // PARTE 1: EXCLUIR TODOS OS PRODUTOS
    // ==========================================
    console.log('Iniciando limpeza de produtos...');
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Espera carregar a lista
    await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => {});

    let totalProdutos = 0;
    const maxProdutos = 200;

    // Loop para excluir todos os produtos
    for (let i = 0; i < maxProdutos; i++) {
      // Procura o primeiro botão de lixeira na tabela
      const firstTrashBtn = page.locator('tbody tr button').filter({ has: page.locator('svg.lucide-trash2') }).first();
      
      const isVisible = await firstTrashBtn.isVisible().catch(() => false);
      if (!isVisible) {
        console.log(`Não encontrou mais produtos para excluir. Total: ${totalProdutos}`);
        break;
      }
      
      try {
        await firstTrashBtn.click({ timeout: 2000 });
        
        // Espera e clica no botão de confirmar (pode ser "Excluir" ou similar)
        const confirmBtn = page.locator('button').filter({ hasText: /EXCLUIR|Sim|Confirmar|OK/i }).first();
        await confirmBtn.click({ timeout: 2000 });
        
        await page.waitForTimeout(800);
        totalProdutos++;
        console.log(`Produto ${totalProdutos} excluído`);
      } catch (e) {
        console.log(`Erro ao excluir produto ${totalProdutos + 1}: ${e}`);
        break;
      }
    }

    console.log(`TOTAL PRODUTOS EXCLUÍDOS: ${totalProdutos}`);

    // ==========================================
    // PARTE 2: EXCLUIR TODAS AS CATEGORIAS
    // ==========================================
    console.log('Iniciando limpeza de categorias...');
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    let totalCategorias = 0;
    const maxCategorias = 50;

    for (let i = 0; i < maxCategorias; i++) {
      // O botão de excluir está na última célula da linha
      const firstTrashBtn = page.locator('tbody tr').first().locator('td').last().locator('button').first();
      
      const isVisible = await firstTrashBtn.isVisible().catch(() => false);
      if (!isVisible) {
        console.log(`Não encontrou mais categorias. Total: ${totalCategorias}`);
        break;
      }
      
      try {
        await firstTrashBtn.click({ timeout: 2000 });
        
        const confirmBtn = page.locator('button').filter({ hasText: /EXCLUIR|Sim|Confirmar|OK/i }).first();
        await confirmBtn.click({ timeout: 2000 });
        
        await page.waitForTimeout(800);
        totalCategorias++;
        console.log(`Categoria ${totalCategorias} excluída`);
      } catch (e) {
        console.log(`Erro ao excluir categoria ${totalCategorias + 1}`);
        break;
      }
    }

    console.log(`TOTAL CATEGORIAS EXCLUÍDOS: ${totalCategorias}`);
    console.log('=== LIMPEZA CONCLUÍDA ===');
  });

});