import { test } from '@playwright/test';

test.describe('Limpeza - Categorias', () => {

  test('deve excluir todas as categorias', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill('papapizza11@kicardapio.com');
    await page.getByPlaceholder('••••••••').fill('paPa%pIzZa@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForURL(/\/dashboard/);

    console.log('Iniciando limpeza de categorias...');
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    let totalCategorias = 0;
    const maxCategorias = 50;

    for (let i = 0; i < maxCategorias; i++) {
      // Espera as linhas da tabela carregarem
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      
      if (count === 0) {
        console.log(`Não encontrou mais categorias. Total: ${totalCategorias}`);
        break;
      }
      
      // Pega o primeiro botão de delete na primeira linha
      const firstRow = rows.first();
      const deleteBtn = firstRow.locator('button').last();
      
      const isVisible = await deleteBtn.isVisible().catch(() => false);
      if (!isVisible) {
        console.log(`Botão de excluir não visível. Total: ${totalCategorias}`);
        break;
      }
      
      try {
        await deleteBtn.click({ timeout: 3000 });
        
        // Espera o modal aparecer e clica em confirmar
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button').filter({ hasText: /EXCLUIR|Sim|Confirmar/i }).first();
        await confirmBtn.click({ timeout: 3000 });
        
        await page.waitForTimeout(1000);
        totalCategorias++;
        console.log(`Categoria ${totalCategorias} excluída`);
      } catch (e) {
        console.log(`Erro ao excluir categoria ${totalCategorias + 1}`);
        break;
      }
    }

    console.log(`TOTAL CATEGORIAS EXCLUÍDOS: ${totalCategorias}`);
    console.log('=== LIMPEZA DE CATEGORIAS CONCLUÍDA ===');
  });

});