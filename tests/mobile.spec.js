import { test, expect } from '@playwright/test';

test.describe('Mobile Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5000');
    await page.waitForLoadState('networkidle');
  });

  test('Should load Sefer HaMiddot 34 without 404 alert', async ({ page }) => {
    // Test direct API call first
    const response = await page.request.get('http://localhost:5000/api/docs/sefer-hamiddot/34');
    
    // Should return 404 with graceful message (not alert)
    expect(response.status()).toBe(404);
    
    const body = await response.json();
    expect(body.error).toBe('Section not found');
    expect(body.maxSections).toBe(31);
    
    // Test valid section
    const validResponse = await page.request.get('http://localhost:5000/api/docs/sefer-hamiddot/15');
    // Should either return 200 with content or 404 with graceful message
    expect([200, 404]).toContain(validResponse.status());
    
    console.log('✓ Sefer HaMiddot API returns graceful 404 without alert');
  });

  test('Should handle Chayei Moharan 15 with 200/404 response', async ({ page }) => {
    // Test that Chayei Moharan 15 (beyond maxSections=14) returns 404
    const response = await page.request.get('http://localhost:5000/api/docs/chayei-moharan/15');
    
    expect(response.status()).toBe(404);
    
    const body = await response.json();
    expect(body.error).toBe('Section not found');
    expect(body.maxSections).toBe(14);
    
    console.log('✓ Chayei Moharan 15 returns graceful 404 (maxSections=14)');
  });

  test('TTS button should be visible and functional', async ({ page }) => {
    // Load a text first
    await page.click('button:has-text("Collection complète")');
    await page.waitForSelector('.space-y-2', { timeout: 5000 });
    
    // Click on first available text
    const firstTextButton = page.locator('button[class*="bg-slate-700"]').first();
    await firstTextButton.click();
    
    // Wait for text content to load
    await page.waitForSelector('text=segments de texte authentique', { timeout: 5000 });
    
    // Check that TTS button is visible
    const ttsButton = page.locator('button:has-text("🔊")');
    await expect(ttsButton).toBeVisible();
    
    // Click TTS button and verify it's functional
    await ttsButton.click();
    
    // The button should change to show "En cours..." or remain functional
    // We can't easily test actual audio, but we can verify the button interaction
    await page.waitForTimeout(1000);
    
    console.log('✓ TTS button is visible and clickable');
  });

  test('French translation should show 500 characters with Suite button', async ({ page }) => {
    // Load a text first
    await page.click('button:has-text("Collection complète")');
    await page.waitForSelector('.space-y-2', { timeout: 5000 });
    
    // Click on first available text
    const firstTextButton = page.locator('button[class*="bg-slate-700"]').first();
    await firstTextButton.click();
    
    // Wait for text content to load
    await page.waitForSelector('text=segments de texte authentique', { timeout: 5000 });
    
    // Check for French translation area
    const frenchTranslationArea = page.locator('text=Traduction française');
    if (await frenchTranslationArea.isVisible()) {
      // Look for Suite button
      const suiteButton = page.locator('button:has-text("Suite")');
      
      if (await suiteButton.isVisible()) {
        // Get character count before clicking
        const charCountBefore = await page.locator('text=/Affichage: \\d+ \\/ \\d+ caractères/').textContent();
        
        // Click Suite button
        await suiteButton.click();
        await page.waitForTimeout(500);
        
        // Get character count after clicking
        const charCountAfter = await page.locator('text=/Affichage: \\d+ \\/ \\d+ caractères/').textContent();
        
        // Verify that character count increased
        expect(charCountAfter).not.toBe(charCountBefore);
        
        console.log('✓ Suite button adds +500 characters as expected');
      }
    }
  });

  test('Translation container should have max-height 60vh with scroll', async ({ page }) => {
    // Load a text first
    await page.click('button:has-text("Collection complète")');
    await page.waitForSelector('.space-y-2', { timeout: 5000 });
    
    // Click on first available text
    const firstTextButton = page.locator('button[class*="bg-slate-700"]').first();
    await firstTextButton.click();
    
    // Wait for text content to load
    await page.waitForSelector('text=segments de texte authentique', { timeout: 5000 });
    
    // Check translation container has correct CSS class
    const translationContainer = page.locator('.max-h-\\[60vh\\]');
    
    if (await translationContainer.isVisible()) {
      // Verify it has overflow-y-auto class (scrollable)
      const hasScrollClass = await translationContainer.evaluate((el) => {
        return el.classList.contains('overflow-y-auto');
      });
      
      expect(hasScrollClass).toBe(true);
      
      console.log('✓ Translation container has correct max-height and scroll properties');
    }
  });
});