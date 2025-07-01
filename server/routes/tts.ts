import { Router } from 'express';

const router = Router();

// Simplified TTS endpoint with optimized Web Speech API fallback
router.post('/tts', async (req, res) => {
  try {
    const { text, lang = 'he-IL' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`[TTS Premium] Processing request for: ${text.substring(0, 50)}... (lang: ${lang})`);

    // For now, return fallback instruction for optimized client-side processing
    // This allows maximum compatibility and reduces server complexity
    res.json({ 
      success: true,
      fallback: true,
      message: 'Using optimized Web Speech API',
      text,
      lang,
      voices: {
        'he-IL': 'he-IL Premium Voice',
        'en-US': 'en-US Premium Voice', 
        'fr-FR': 'fr-FR Premium Voice'
      }
    });

  } catch (error) {
    console.error('[TTS Premium] Error:', error);
    res.status(500).json({ 
      error: 'TTS service temporarily unavailable',
      fallback: true,
      text: req.body.text,
      lang: req.body.lang
    });
  }
});

export { router as ttsRouter };