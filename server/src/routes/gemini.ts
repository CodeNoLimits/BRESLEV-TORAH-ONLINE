import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { GeminiService } from '../services/GeminiService.js';

const router = Router();
const geminiService = GeminiService.getInstance();

// Validation schemas
const translateSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  sourceLanguage: z.string().min(1, 'Source language is required'),
  targetLanguage: z.string().min(1, 'Target language is required'),
  reference: z.string().optional()
});

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  mode: z.enum(['chapter', 'book', 'global']),
  context: z.string().optional(),
  conversationId: z.number().optional()
});

/**
 * POST /api/gemini/translate
 * Translate text with chunking support
 */
router.post('/translate', asyncHandler(async (req, res) => {
  const { text, sourceLanguage, targetLanguage, reference } = translateSchema.parse(req.body);
  
  const result = await geminiService.translateText({
    text,
    sourceLanguage,
    targetLanguage,
    reference
  });
  
  res.json({
    success: true,
    data: result
  });
}));

/**
 * POST /api/gemini/chat
 * AI chat with context
 */
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, mode, context, conversationId } = chatSchema.parse(req.body);
  
  const result = await geminiService.chat({
    message,
    mode,
    context,
    conversationId
  });
  
  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/gemini/conversations
 * Get all conversations
 */
router.get('/conversations', asyncHandler(async (req, res) => {
  const { db, conversations } = await import('../db/index.js');
  
  const allConversations = await db.query.conversations.findMany({
    where: (conversations, { eq }) => eq(conversations.isActive, true),
    orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
    limit: 50
  });
  
  res.json({
    success: true,
    data: allConversations
  });
}));

/**
 * GET /api/gemini/conversations/:id
 * Get conversation with messages
 */
router.get('/conversations/:id', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id);
  
  if (isNaN(conversationId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid conversation ID'
    });
  }
  
  const { db, conversations, messages } = await import('../db/index.js');
  const { eq } = await import('drizzle-orm');
  
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)]
      }
    }
  });
  
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }
  
  res.json({
    success: true,
    data: conversation
  });
}));

/**
 * DELETE /api/gemini/conversations/:id
 * Delete conversation
 */
router.delete('/conversations/:id', asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.id);
  
  if (isNaN(conversationId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid conversation ID'
    });
  }
  
  const { db, conversations } = await import('../db/index.js');
  const { eq } = await import('drizzle-orm');
  
  await db.update(conversations)
    .set({ isActive: false })
    .where(eq(conversations.id, conversationId));
  
  res.json({
    success: true,
    message: 'Conversation deleted'
  });
}));

export default router;