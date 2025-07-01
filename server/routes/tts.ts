import { Router } from 'express';

const router = Router();

const voices = { 
  "he-IL": "he-IL-Studio-B", 
  "en-US": "en-US-Studio-O", 
  "fr-FR": "fr-FR-Studio-D" 
};

router.post("/tts", async (req, res) => {
  try {
    const { text, lang = "he-IL" } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const voice = voices[lang] || voices["he-IL"];
    console.log(`[TTS Premium] Using voice: ${voice} for ${lang}`);

    // Try Gemini TTS API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/tts-latest-long:generateSpeech?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        audioConfig: { 
          voice: { name: voice, languageCode: lang },
          format: "mp3" 
        },
        projectId: process.env.GEMINI_TTS_PROJECT_ID
      })
    });

    if (!response.ok) {
      console.log('[TTS Premium] Gemini API failed, using fallback');
      return res.status(502).json({ 
        error: 'Gemini TTS unavailable',
        fallback: true,
        text,
        lang 
      });
    }

    const { audio } = await response.json();
    res.type("audio/mpeg").send(Buffer.from(audio.data, "base64"));

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