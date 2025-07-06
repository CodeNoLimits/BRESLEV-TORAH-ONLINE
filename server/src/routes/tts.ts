import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TTSService } from '../services/TTSService.js';

const router = Router();
const ttsService = TTSService.getInstance();

// Validation schemas
const synthesizeSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long (max 5000 characters)'),
  language: z.enum(['he', 'en', 'fr']),
  voiceId: z.string().optional()
});

const listVoicesSchema = z.object({
  languageCode: z.string().optional()
});

/**
 * POST /api/tts/synthesize
 * Convert text to speech
 */
router.post('/synthesize', asyncHandler(async (req, res) => {
  const { text, language, voiceId } = synthesizeSchema.parse(req.body);
  
  const result = await ttsService.synthesizeSpeech({
    text,
    language,
    voiceId
  });
  
  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/tts/voices
 * List available voices
 */
router.get('/voices', asyncHandler(async (req, res) => {
  const { languageCode } = listVoicesSchema.parse(req.query);
  
  const voices = await ttsService.listVoices(languageCode);
  
  res.json({
    success: true,
    data: voices
  });
}));

/**
 * POST /api/tts/cleanup
 * Clean up old cached audio files
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  const daysOld = parseInt(req.body.daysOld) || 30;
  
  const result = await ttsService.cleanupOldAudio(daysOld);
  
  res.json({
    success: true,
    data: result,
    message: `Cleaned up ${result.cleaned} old audio files`
  });
}));

export default router;