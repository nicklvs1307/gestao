import { test, expect } from '@playwright/test';

test('deve criar pedido e verificar no sistema', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  // Login
  await page.goto('https://kicardapio.towersfy.com/login');
  await page.getByPlaceholder('seu@email.com').fill('rafaelferio@gmail.com');
  await page.getByPlaceholder('••••••••').fill('rom@pizza@2026');
  await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
  await page.waitForTimeout(3000);
  
  // Vai para pedidos e conta quantos existem antes
  await page.goto('https://kicardapio.towersfy.com/orders');
  await page.waitForTimeout(2000);
  const textoAntes = await page.locator('body').textContent();
  const pedidosAntes = (textoAntes.match(/#\d+/g) || []).length;
  console.log('Pedidos antes:', pedidosAntes);
  
  // Volta ao PDV
  await page.goto('https://kicardapio.towersfy.com/pos');
  await page.waitForTimeout(3000);
  
  // DIRETA
  await page.getByText('DIRETA').first().click();
  await page.waitForTimeout(1500);
  
  // Clica em "Balcão" para delivery simples (sem necessidade de informações do cliente)
  await page.locator('button:has-text("BEBIDAS")').first().click();
  await page.waitForTimeout(1500);
  
  // Produto
  await page.locator('div').filter({ hasText: 'COCA KS' }).first().click();
  await page.waitForTimeout(1500);
  
  // Adicionar
  await page.getByRole('button', { name: /Adicionar Item/i }).click();
  await page.waitForTimeout(2000);
  
  // Checkout
  await page.getByText('IR PARA PAGAMENTO').click();
  await page.waitForTimeout(2000);
  
  // Seleciona pagamento
  await page.locator('button').filter({ hasText: /DINHEIRO|PIX/i }).first().click();
  await page.waitForTimeout(1000);
  
  // Clica em confirmar
  await page.getByRole('button', { name: /Confirmar/i }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/debug/apos-confirmar.png' });
  
  console.log('\n=== ERROS ===');
  errors.forEach(e => console.log(e));
  console.log('==============\n');
  
  // Volta aos pedidos para verificar se criou algo novo
  await page.goto('https://kicardapio.towersfy.com/orders');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug/pedidos-depois.png' });
  
  const textoDepois = await page.locator('body').textContent();
  const pedidosDepois = (textoDepois.match(/#\d+/g) || []).length;
  console.log('Pedidos depois:', pedidosDepois);
  
  if (pedidosDepois > pedidosAntes) {
    console.log('✅ PEDIDO CRIADO COM SUCESSO!');
  } else {
    console.log('❌ NENHUM PEDIDO NOVO CRIADO');
  }
});