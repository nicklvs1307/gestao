import { test, expect } from '@playwright/test';

test('deve verificar pedidos criados no sistema', async ({ page }) => {
  // Login
  await page.goto('https://kicardapio.towersfy.com/login');
  await page.getByPlaceholder('seu@email.com').fill('rafaelferio@gmail.com');
  await page.getByPlaceholder('••••••••').fill('rom@pizza@2026');
  await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
  await page.waitForTimeout(3000);
  
  // Vai para a página de pedidos
  await page.goto('https://kicardapio.towersfy.com/orders');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/debug/verifica-pedidos-1.png' });
  
  // Verifica se há pedidos na lista
  const texto = await page.locator('body').textContent();
  console.log('Pedidos encontrados:', texto);
  
  // Verifica se há algum pedido recente
  const temPedidos = await page.locator('[class*="order"], [class*="pedido"]').first().isVisible().catch(() => false);
  console.log('Tem pedidos visíveis:', temPedidos);
});