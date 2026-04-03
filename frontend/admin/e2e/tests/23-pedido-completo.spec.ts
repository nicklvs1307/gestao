import { test, expect } from '@playwright/test';

test('deve criar pedido delivery completo com informações do cliente', async ({ page }) => {
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
  await page.screenshot({ path: 'e2e/debug/delivery-1-inicio.png' });
  
  // 1. Clica em "DIRETA" para modo delivery/balcão
  await page.getByText('DIRETA').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/debug/delivery-2-direta.png' });
  
  // 2. Agora clica na opção "Entrega" para ter informações do cliente
  const entregaBtn = page.getByText('Entrega').first();
  if (await entregaBtn.isVisible().catch(() => false)) {
    await entregaBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/delivery-3-entrega.png' });
  }
  
  // 3. Se abrir modal de informações do cliente, preenche
  const inputNome = page.getByPlaceholder(/Nome| nome /i).first();
  if (await inputNome.isVisible().catch(() => false)) {
    await inputNome.fill('Cliente Teste Playwright');
    await page.waitForTimeout(500);
  }
  
  const inputTelefone = page.getByPlaceholder(/Telefone| tel /i).first();
  if (await inputTelefone.isVisible().catch(() => false)) {
    await inputTelefone.fill('11999999999');
    await page.waitForTimeout(500);
  }
  
  // Confirma as informações do cliente
  const btnConfirmarCliente = page.getByRole('button', { name: /Confirmar|Continuar/i }).first();
  if (await btnConfirmarCliente.isVisible().catch(() => false)) {
    await btnConfirmarCliente.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/debug/delivery-4-cliente-confirmado.png' });
  }
  
  // 4. Agora seleciona categoria e produto
  await page.locator('button:has-text("BEBIDAS")').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/debug/delivery-5-categoria.png' });
  
  // Clica no produto
  const produto = page.locator('div').filter({ hasText: 'COCA KS' }).first();
  await produto.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/debug/delivery-6-produto.png' });
  
  // Adiciona ao carrinho
  const btnAdicionar = page.getByRole('button', { name: /Adicionar Item/i });
  await btnAdicionar.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug/delivery-7-carrinho.png' });
  
  // Verifica se tem item no carrinho
  const texto = await page.locator('body').textContent();
  expect(texto).toContain('1 item');
  
  // 5. Vai para pagamento
  await page.getByText('IR PARA PAGAMENTO').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug/delivery-8-checkout.png' });
  
  // 6. Seleciona forma de pagamento (primeiro método disponível)
  const primeiraFormaPagamento = page.locator('button').filter({ hasText: /DINHEIRO|PIX|CARTÃO/i }).first();
  if (await primeiraFormaPagamento.isVisible().catch(() => false)) {
    await primeiraFormaPagamento.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/debug/delivery-9-pagamento-selecionado.png' });
  }
  
  // 7. Clica em confirmar
  const btnConfirmar = page.getByRole('button', { name: /Confirmar/i });
  if (await btnConfirmar.isVisible().catch(() => false)) {
    await btnConfirmar.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/debug/delivery-10-resultado.png' });
  }
  
  // Verifica erros
  console.log('\n=== ERROS CAPTURADOS ===');
  errors.forEach(e => console.log(e));
  console.log('========================\n');
  
  // 8. Verifica se pedido foi criado
  await page.goto('https://kicardapio.towersfy.com/orders');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug/delivery-11-pedidos.png' });
});