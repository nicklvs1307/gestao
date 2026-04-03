import { test, expect } from '@playwright/test';

test.describe('PDV - Criação de Pedidos', () => {

  test('deve criar novo pedido para mesa', async ({ page }) => {
    // Login
    await page.goto('https://kicardapio.towersfy.com/login');
    await page.getByPlaceholder('seu@email.com').fill('rafaelferio@gmail.com');
    await page.getByPlaceholder('••••••••').fill('rom@pizza@2026');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await page.waitForTimeout(3000);
    
    // Vai para PDV
    await page.goto('https://kicardapio.towersfy.com/pos');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/pedido-mesa-1.png' });
    
    // Verifica que PDV carregou
    await expect(page.getByText('PAINEL ADMINISTRATIVO')).toBeVisible();
    
    // Seleciona Mesa 1
    await page.locator('select').selectOption('1');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/pedido-mesa-2.png' });
    
    // Verifica que mesa foi selecionada
    await expect(page.getByRole('heading', { name: 'Mesa' })).toBeVisible();
    
    // Clica na categoria BEBIDAS
    await page.locator('button:has-text("BEBIDAS")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/pedido-mesa-3.png' });
    
    // Clica no produto (abre modal de personalização)
    const produto = page.locator('div').filter({ hasText: 'COCA KS' }).first();
    if (await produto.isVisible().catch(() => false)) {
      await produto.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e/debug/pedido-mesa-4-modal.png' });
    }
    
    // No modal de personalização: seleciona uma opção se houver, ou clica em "Adicionar Item"
    const btnAdicionar = page.getByRole('button', { name: /Adicionar Item/i });
    if (await btnAdicionar.isVisible().catch(() => false)) {
      await btnAdicionar.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/debug/pedido-mesa-5-adicionado.png' });
    }
    
    // Verifica o carrinho
    const textoCarrinho = await page.locator('body').textContent();
    expect(textoCarrinho).toContain('1 item');
  });

  test('deve criar novo pedido delivery', async ({ page }) => {
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
    await page.screenshot({ path: 'e2e/debug/pedido-delivery-1.png' });
    
    // Verifica que mudou para modo direto
    await expect(page.getByRole('heading', { name: /Venda/i })).toBeVisible();
    
    // Clica na categoria BEBIDAS
    await page.locator('button:has-text("BEBIDAS")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/pedido-delivery-2.png' });
    
    // Clica no produto (abre modal)
    const produto = page.locator('div').filter({ hasText: 'COCA KS' }).first();
    if (await produto.isVisible().catch(() => false)) {
      await produto.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e/debug/pedido-delivery-3-modal.png' });
    }
    
    // No modal: clica em "Adicionar Item"
    const btnAdicionar = page.getByRole('button', { name: /Adicionar Item/i });
    if (await btnAdicionar.isVisible().catch(() => false)) {
      await btnAdicionar.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/debug/pedido-delivery-4-adicionado.png' });
    }
    
    // Verifica carrinho
    const textoCarrinho = await page.locator('body').textContent();
    expect(textoCarrinho).toContain('1 item');
  });
});