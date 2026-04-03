import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://kicardapio.towersfy.com/login');
});