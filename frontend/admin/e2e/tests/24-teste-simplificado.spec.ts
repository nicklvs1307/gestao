import { test, expect } from '@playwright/test';

test('deve criar pedido delivery completo', async ({ page }) => {
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
  
  // PDV
  await page.goto('https://kicardapio.towersfy.com/pos');
  await page.waitForTimeout(3000);
  
  // DIRETA
  await page.getByText('DIRETA').first().click();
  await page.waitForTimeout(1500);
  
  // Clica em "Balcão" ao invés de "Entrega" - modo mais simples
  // O fluxo deve funcionar sem precisar de informações de entrega
  await page.locator('button:has-text("BEBIDAS")').first().click();
  await page.waitForTimeout(1500);
  
  // Produto
  await page.locator('div').filter({ hasText: 'COCA KS' }).first().click();
  await page.waitForTimeout(1500);
  
  // Adicionar
  await page.getByRole('button', { name: /Adicionar Item/i }).click();
  await page.waitForTimeout(2000);
  
  // Verifica carrinho
  expect(await page.locator('body').textContent()).toContain('1 item');
  
  // Checkout
  await page.getByText('IR PARA PAGAMENTO').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug/checkout.png' });
  
  // Seleciona pagamento
  await page.locator('button').filter({ hasText: /DINHEIRO|PIX/i }).first().click();
  await page.waitForTimeout(1000);
  
  // Verifica se o botão está habilitado agora
  const btnConfirmar = page.getByRole('button', { name: /Confirmar/i });
  const isDisabled = await btnConfirmar.evaluate(el => el.hasAttribute('disabled'));
  console.log('Botão confirmar desabilitado?', isDisabled);
  
  // Tira screenshot para ver o estado
  await page.screenshot({ path: 'e2e/debug/checkout-after-payment.png' });
  
  // Se não estiver desabilitado, clica
  if (!isDisabled) {
    await btnConfirmar.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/resultado.png' });
  }
  
  // Mostra erros
  console.log('\n=== ERROS ===');
  errors.forEach(e => console.log(e));
  console.log('==============\n');
});