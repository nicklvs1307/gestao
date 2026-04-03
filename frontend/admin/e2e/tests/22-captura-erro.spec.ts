import { test, expect } from '@playwright/test';

test('deve capturar erro ao finalizar pedido delivery', async ({ page }) => {
  // Captura erros do console
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  // Login
  await page.goto('https://kicardapio.towersfy.com/login');
  await page.getByPlaceholder('seu@email.com').fill('rafaelferio@gmail.com');
  await page.getByPlaceholder('••••••••').fill('rom@pizza@2026');
  await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
  await page.waitForTimeout(3000);
  
  // Vai para PDV
  await page.goto('https://kicardapio.towersfy.com/pos');
  await page.waitForTimeout(3000);
  
  // Clica em DIRETA (modo delivery)
  await page.getByText('DIRETA').first().click();
  await page.waitForTimeout(1500);
  
  // Clica na categoria BEBIDAS
  await page.locator('button:has-text("BEBIDAS")').first().click();
  await page.waitForTimeout(1500);
  
  // Clica no produto COCA KS
  const produto = page.locator('div').filter({ hasText: 'COCA KS' }).first();
  await produto.click();
  await page.waitForTimeout(1500);
  
  // Clica em "Adicionar Item" no modal
  const btnAdicionar = page.getByRole('button', { name: /Adicionar Item/i });
  await btnAdicionar.click();
  await page.waitForTimeout(2000);
  
  // Verifica se o item foi adicionado
  const textoCarrinho = await page.locator('body').textContent();
  expect(textoCarrinho).toContain('1 item');
  
  // Clica em "IR PARA PAGAMENTO"
  await page.getByText('IR PARA PAGAMENTO').click();
  await page.waitForTimeout(2000);
  
  // Tira screenshot da tela de checkout
  await page.screenshot({ path: 'e2e/debug/checkout-inicio.png' });
  
  // Agora estamos na tela de checkout - vamos tentar finalizar
  
  // Seleciona uma forma de pagamento (primeira opção disponível)
  const formaPagamento = page.locator('input[type="radio"]').first();
  if (await formaPagamento.isVisible().catch(() => false)) {
    await formaPagamento.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: 'e2e/debug/checkout-pagamento-selecionado.png' });
  
  // Clica no botão de confirmar pedido
  const btnConfirmar = page.getByRole('button', { name: /CONFIRMAR|CRIAR PEDIDO|FINALIZAR/i }).first();
  if (await btnConfirmar.isVisible().catch(() => false)) {
    await btnConfirmar.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/checkout-resultado.png' });
  }
  
  // Verifica se há erros
  console.log('=== ERROS CAPTURADOS ===');
  errors.forEach(err => console.log(err));
  console.log('=======================');
  
  // Verifica se algo foi criado
  await page.goto('https://kicardapio.towersfy.com/orders');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug/verificacao-pedidos.png' });
});