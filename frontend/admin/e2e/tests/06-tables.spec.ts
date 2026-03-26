import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/auth';

test.describe('Mesas - Gestão de Mesas', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar a página de mesas', async ({ page }) => {
    await navigateTo(page, '/tables');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/MESAS|COMANDAS/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir lista de mesas ou mensagem de vazio', async ({ page }) => {
    await navigateTo(page, '/tables');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasTables = await page.locator('table tbody tr, [class*="table-card"], [class*="mesa"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/nenhuma mesa|sem mesas|adicione/i).first().isVisible().catch(() => false);
    const hasNewBtn = await page.getByRole('button', { name: /NOVA MESA|ADICIONAR/i }).first().isVisible().catch(() => false);

    expect(hasTables || hasEmpty || hasNewBtn).toBeTruthy();
  });

  test('deve abrir modal ou formulário para nova mesa', async ({ page }) => {
    await navigateTo(page, '/tables');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newTableBtn = page.getByRole('button', { name: /NOVA MESA|ADICIONAR|NOVA COMANDA/i }).first();
    if (await newTableBtn.isVisible({ timeout: 5000 })) {
      await newTableBtn.click();
      await page.waitForTimeout(2000);

      const hasModal = await page.locator('[role="dialog"], [class*="modal"]').first().isVisible().catch(() => false);
      const hasForm = await page.getByPlaceholder(/NÚMERO|NOME|MESA/i).first().isVisible().catch(() => false);
      expect(hasModal || hasForm).toBeTruthy();
    }
  });

  test('deve criar uma nova mesa', async ({ page }) => {
    await navigateTo(page, '/tables');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newTableBtn = page.getByRole('button', { name: /NOVA MESA|ADICIONAR|NOVA COMANDA/i }).first();
    if (await newTableBtn.isVisible({ timeout: 5000 })) {
      await newTableBtn.click();
      await page.waitForTimeout(2000);

      // Preenche número da mesa
      const numberInput = page.getByPlaceholder(/NÚMERO|NOME|IDENTIFICAÇÃO/i).first();
      if (await numberInput.isVisible({ timeout: 5000 })) {
        await numberInput.fill(`E2E-${Date.now().toString().slice(-4)}`);

        // Salva
        const saveBtn = page.getByRole('button', { name: /SALVAR|CRIAR/i }).first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    }
  });
});
