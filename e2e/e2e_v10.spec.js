
import { test, expect } from '@playwright/test';

test.describe('v10 features', () => {
  test('hebrew and translation display', async ({ page }) => {
    await page.goto('/Chayei%20Moharan.2');
    await expect(page.locator('.font-hebrew')).toHaveCountGreaterThan(0);
  });

  test('tts button speaks french', async ({ page }) => {
    await page.goto('/');
    await page.exposeFunction('speakMock', () => {});
    await page.evaluate(() => {
      window.speechSynthesis = { speak: speakMock, cancel: () => {}, getVoices: () => [] };
    });
    await page.click('text=🔊');
    await expect(page.evaluate(() => window.speakMock.called)).resolves.toBeTruthy();
  });

  test('mic sends transcript', async ({ page }) => {
    await page.goto('/');
    await page.route('/api/chat', route => route.fulfill({ status: 200, body: JSON.stringify({ answer: 'ok' }) }));
    await page.evaluate(() => {
      window.SpeechRecognition = function() { this.start = () => { this.onresult({ results: [[{ transcript: 'Bonjour' }]] }); this.onend(); }; };
    });
    await page.click('button >> text="🎤"');
    await expect(page.locator('#questionBox')).toHaveValue(/Bonjour/);
  });

  test('video stops speech', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.speechSynthesis = { cancel: () => { window.cancelCalled = true; }, speak: () => {} };
    });
    const vid = page.locator('video').first();
    await vid.click();
    await expect(page.evaluate(() => window.cancelCalled)).resolves.toBeTruthy();
  });

  test('ai error toast', async ({ page }) => {
    await page.goto('/');
    await page.route('/api/chat', route => route.fulfill({ status: 502, body: '{}' }));
    await page.evaluate(() => {
      window.SpeechRecognition = function() { this.start = () => { this.onresult({ results: [[{ transcript: 'Bonjour' }]] }); this.onend(); }; };
    });
    await page.click('button >> text="🎤"');
    await expect(page.getByText('Erreur AI')).toBeVisible();
  });
});
