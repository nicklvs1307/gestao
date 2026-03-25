import { test } from '@playwright/test';

test.describe('Limpeza - Produtos', () => {

  test('deve excluir todos os produtos restantes', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('seu@email.com').fill('papapizza11@kicardapio.com');
    await page.getByPlaceholder('••••••••').fill('paPa%pIzZa@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForURL(/\/dashboard/);

    console.log('Verificando produtos restantes...');
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    let totalProdutos = 0;
    const maxProdutos = 200;

    for (let i = 0; i < maxProdutos; i++) {
      const trashBtn = page.locator('tbody tr button').filter({ has: page.locator('svg.lucide-trash2') }).first();
      
      const isVisible = await trashBtn.isVisible().catch(() => false);
      if (!isVisible) {
        console.log(`Não encontrou mais produtos. Total: ${totalProdutos}`);
        break;
      }
      
      try {
        await trashBtn.click({ timeout: 2000 });
        const confirmBtn = page.getByRole('button').filter({ hasText: /EXCLUIR|Sim|Confirmar/i }).first();
        await confirmBtn.click({ timeout: 2000 });
        await page.waitForTimeout(800);
        totalProdutos++;
        console.log(`Produto ${totalProdutos} excluído`);
      } catch (e) {
        console.log(`Erro ao excluir`);
        break;
      }
    }

    console.log(`TOTAL PRODUTOS EXCLUÍDOS: ${totalProdutos}`);
    console.log('=== LIMPEZA DE PRODUTOS CONCLUÍDA ===');
  });

});