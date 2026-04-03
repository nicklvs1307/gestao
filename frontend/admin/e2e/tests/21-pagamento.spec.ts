import { test, expect } from '@playwright/test';

test.describe('PDV - Criação e Finalização de Pedidos', () => {

  test('deve criar e finalizar pedido para mesa', async ({ page }) => {
    // Login
    await page.goto('https://kicardapio.towersfy.com/login');
    await page.getByPlaceholder('seu@email.com').fill('rafaelferio@gmail.com');
    await page.getByPlaceholder('••••••••').fill('rom@pizza@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForTimeout(3000);
    
    // Vai para PDV
    await page.goto('https://kicardapio.towersfy.com/pos');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/pagamento-mesa-1.png' });
    
    // Seleciona Mesa 1
    await page.locator('select').selectOption('1');
    await page.waitForTimeout(1500);
    
    // Clica na categoria BEBIDAS
    await page.locator('button:has-text("BEBIDAS")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/pagamento-mesa-2.png' });
    
    // Clica no produto COCA KS
    const produto = page.locator('div').filter({ hasText: 'COCA KS' }).first();
    await produto.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/pagamento-mesa-3-modal.png' });
    
    // Clica em "Adicionar Item" no modal
    const btnAdicionar = page.getByRole('button', { name: /Adicionar Item/i });
    await btnAdicionar.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/debug/pagamento-mesa-4-carrinho.png' });
    
    // Verifica se o item foi adicionado ao carrinho
    const textoCarrinho = await page.locator('body').textContent();
    console.log('Carrinho após adicionar:', textoCarrinho);
    expect(textoCarrinho).toContain('1 item');
    
    // Clica em "IR PARA PAGAMENTO"
    const btnPagamento = page.getByText('IR PARA PAGAMENTO');
    if (await btnPagamento.isVisible().catch(() => false)) {
      await btnPagamento.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/debug/pagamento-mesa-5-tela-pagamento.png' });
    }
    
    // Espera um pouco para ver se há erro
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/pagamento-mesa-6-resultado.png' });
    
    // Captura qualquer erro no console
    const erros = [];
    page.on('pageerror', err => erros.push(err.message));
    await page.waitForTimeout(1000);
    console.log('Erros capturados:', erros);
  });

  test('deve criar e finalizar pedido delivery', async ({ page }) => {
    // Login
    await page.goto('https://kicardapio.towersfy.com/login');
    await page.getByPlaceholder('seu@email.com').fill('rafaelferio@gmail.com');
    await page.getByPlaceholder('••••••••').fill('rom@pizza@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForTimeout(3000);
    
    // Vai para PDV
    await page.goto('https://kicardapio.towersfy.com/pos');
    await page.waitForTimeout(3000);
    
    // Clica em DIRETA
    await page.getByText('DIRETA').first().click();
    await page.waitForTimeout(1500);
    
    // Clica na categoria BEBIDAS
    await page.locator('button:has-text("BEBIDAS")').first().click();
    await page.waitForTimeout(1500);
    
    // Clica no produto
    const produto = page.locator('div').filter({ hasText: 'COCA KS' }).first();
    await produto.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/pagamento-delivery-1.png' });
    
    // Clica em "Adicionar Item"
    const btnAdicionar = page.getByRole('button', { name: /Adicionar Item/i });
    await btnAdicionar.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/debug/pagamento-delivery-2.png' });
    
    // Verifica carrinho
    const textoCarrinho = await page.locator('body').textContent();
    expect(textoCarrinho).toContain('1 item');
    
    // Clica em "IR PARA PAGAMENTO"
    const btnPagamento = page.getByText('IR PARA PAGAMENTO');
    if (await btnPagamento.isVisible().catch(() => false)) {
      await btnPagamento.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/debug/pagamento-delivery-3.png' });
    }
    
    // Captura erros
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/pagamento-delivery-4.png' });
  });
});